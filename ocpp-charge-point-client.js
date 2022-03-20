const WebSocket = require("ws");
const moment = require("moment");
const UTILS = require("./utils.js");

console.log = () => {};
console.error = () => {};

// Connection settings
const OPENING_HANDSHAKE_TIMEOUT_MS = 120 * 1000; // wait time for protocol upgrade call
const AUTO_RECONNECT_INTERVAL_MS = 90 * 1000; // in case of connection loss, use this settings
const OCPP_HEARTBEAT_INTERVAL_OVERRIDE_MS = null; //  override hb interval set by CS

// env variables
const CS_PROTOCOL = process.env.CS_PROTOCOL || "ws"; // use wss for SSL
const CS_HOST = process.env.CS_HOST || "localhost"; // central system host
const CS_PORT = process.env.CS_PORT || 8080; // port
const CONCURRENCY_LEVEL = process.env.CONCURRENCY_LEVEL || 1; // one client by default

const LOG_PAYLOAD = process.env.LOG_PAYLOAD === "true" || false; // data exchange verbose logging
const LOG_LIFECYCLE = process.env.LOG_LIFECYCLE === "true" || true; // lifecycle events (connect, reconnect, ping/pong)

// setup logging library
UTILS.Logging.EnablePayloadLogging = LOG_PAYLOAD;
UTILS.Logging.EnableLifecycleLogging = LOG_LIFECYCLE;

function WebSocketClient(cId, chargePointId) {
  this.clientId = cId;
  this.chargePointId = chargePointId;
  this.pingTimeout = undefined;
  this.autoReconnectInterval = AUTO_RECONNECT_INTERVAL_MS; // ms
  this.ocppMessageCounter = 1; // ocpp communication contract; must increment on each message sent
  this.ocppHeartBeatIntervalMs = 0; // comes from bootNotification response
  this.ocppHeartBeatInterval = undefined; // interval object
}

WebSocketClient.prototype.open = function wscOpen(url) {
  const that = this;
  this.url = url;
  this.instance = new WebSocket(this.url, ["ocpp1.6"], {
    handshakeTimeout: OPENING_HANDSHAKE_TIMEOUT_MS,

    // If the `rejectUnauthorized` option is not `false`, the server certificate
    // is verified against a list of well-known CAs. An 'error' event is emitted
    // if verification fails.
    rejectUnauthorized: false,
  });

  const thisConnection = this.instance;

  thisConnection.on("ping", () => {
    UTILS.Fn.log(`Client ${that.clientId} received PING`);

    clearTimeout(that.pingTimeout);

    // Use `WebSocket#terminate()`, which immediately destroys the connection,
    // instead of `WebSocket#close()`, which waits for the close timer.
    // Delay should be equal to the interval at which your server
    // sends out pings plus a conservative assumption of the latency.
    that.pingTimeout = setTimeout(() => {
      UTILS.Fn.log(`Client ${that.clientId} disconnected from server`);
      thisConnection.terminate();
    }, 30000 + 1000);
  });

  thisConnection.on("pong", () => {
    // this is issued if client sends ping
    UTILS.Fn.lifecyc("Event pong");
  });

  thisConnection.on("open", () => {
    const bootNotificationRequest = {
      chargeBoxIdentity: that.chargePointId,
      chargeBoxSerialNumber: that.chargePointId,
      chargePointModel: "ETREL INCH VIRTUAL Charger vOCPP16J",
      chargePointSerialNumber: that.chargePointId,
      chargePointVendor: "Etrel",
      firmwareVersion: "1.0",
      iccid: "",
      imsi: "",
      meterSerialNumber: "",
      meterType: "",
    };

    const bootNotificationPayload = [
      UTILS.OcppCallType.ClientToServer,
      that.msgId(),
      "BootNotification",
      bootNotificationRequest,
    ];

    that.send(bootNotificationPayload);
  });

  thisConnection.on("message", (data) => {
    UTILS.Fn.data(`Client ${that.clientId} message received`, data);

    let msgArr;
    try {
      msgArr = JSON.parse(data);
    } catch (e) {
      UTILS.Fn.err("Error parsing incoming json message");
      return;
    }

    // in boot notification we receive interval for heartbeat
    if (msgArr[0] === UTILS.OcppCallType.ServerToClient && msgArr[2].interval) {
      // boot notification response

      that.ocppHeartBeatIntervalMs =
        OCPP_HEARTBEAT_INTERVAL_OVERRIDE_MS || msgArr[2].interval * 1000;

      UTILS.Fn.lifecyc(
        `Client ${that.clientId} Next interval will be at: ${moment().add(
          that.ocppHeartBeatIntervalMs,
          "ms"
        )}`
      );

      that.ocppHeartBeatInterval = setInterval(() => {
        that.send([
          UTILS.OcppCallType.ClientToServer,
          that.msgId(),
          "Heartbeat",
          {},
        ]); // ocpp heartbeat request
      }, that.ocppHeartBeatIntervalMs);
    } else {
      UTILS.Fn.warn("Do not know what to do with following received message");
      console.log(msgArr);
    }
  });

  thisConnection.on("close", (code) => {
    switch (
      code // https://datatracker.ietf.org/doc/html/rfc6455#section-7.4.1
    ) {
      case 1000: //  1000 indicates a normal closure, meaning that the purpose for which the connection was established has been fulfilled.
        UTILS.Fn.err(
          `Client ${that.clientId} - WebSocket: closed, code ${code}`
        );
        break;
      case 1006: // Close Code 1006 is a special code that means the connection was closed abnormally (locally) by the browser implementation.
        UTILS.Fn.err(
          `Client ${that.clientId} - WebSocket: closed abnormally, code ${code}`
        );
        that.reconnect(code);
        break;
      default:
        // Abnormal closure
        UTILS.Fn.err(
          `Client ${that.clientId} WebSocket: closed unknown, code ${code}`
        );
        that.reconnect(code);
        break;
    }

    clearTimeout(that.pingTimeout);
  });

  thisConnection.on("error", (e) => {
    switch (e.code) {
      case "ECONNREFUSED":
        UTILS.Fn.err(
          `Client ${that.clientId} - Error ECONNREFUSED. Server is not accepting connections`
        );
        that.reconnect(e);
        break;
      default:
        UTILS.Fn.err(`Client ${that.clientId} UNKNOWN ERROR`, e);
        break;
    }
  });
};

WebSocketClient.prototype.msgId = function wscMsgId() {
  // msg ID incremented
  this.ocppMessageCounter += 1;
  const inc = `${this.chargePointId}_${this.ocppMessageCounter}`;
  return inc;
};

WebSocketClient.prototype.send = function wscSend(data, option) {
  try {
    const message = data[2];
    const dataAsString = JSON.stringify(data);
    UTILS.Fn.data(
      `Client ${this.clientId} sending ${message} to CS: `,
      dataAsString
    );
    this.instance.send(dataAsString, option);
  } catch (e) {
    this.instance.emit("error", e);
  }
};

WebSocketClient.prototype.reconnect = function wscReconnect() {
  UTILS.Fn.lifecyc(
    `Client ${this.clientId} - WebSocketClient: retry in ${this.autoReconnectInterval}ms`
  );
  this.instance.removeAllListeners();
  clearInterval(this.ocppHeartBeatInterval);

  const that = this;
  setTimeout(() => {
    UTILS.Fn.lifecyc(
      `Client ${that.clientId} - WebSocketClient retry reconnecting...`
    );
    that.open(that.url);
  }, this.autoReconnectInterval);
};

// CONCURRENCY SETUP - running multiple clients

for (let clientIdx = 0; clientIdx < CONCURRENCY_LEVEL; clientIdx += 1) {
  // build charge point identity - required by protocol
  const chargePointId = `SI-${UTILS.Fn.uuidv4()}`; // required by protocol
  const url = `${CS_PROTOCOL}://${CS_HOST}:${CS_PORT}/${chargePointId}?cid=${clientIdx}`; // central system url

  UTILS.Fn.lifecyc(`Client is trying to connect to: ${url}`);

  // create a client
  new WebSocketClient(clientIdx, chargePointId).open(url);
}
