const http = require("http");
const WebSocket = require("ws");
const url = require("url");
const moment = require("moment");
const UTILS = require("./utils.js");

const server = http.createServer();
const wsServer = new WebSocket.Server( // represents websocket server
  { noServer: true } // issue manual upgrade
);

// env variable
const WEB_SRV_HOST = process.env.WEB_SRV_HOST || "0.0.0.0"; // interface to bind to (could be only one)
const WEB_SRV_PORT = process.env.WEB_SRV_PORT || 8080; // port on bind interface
const HEARTBEAT_INT_MS = process.env.HEARTBEAT_INT_MS || 30000; // the interval at which we check client connectivity
const LOG_PAYLOAD = process.env.LOG_PAYLOAD || false; // data exchange verbose logging
const LOG_LIFECYCLE = process.env.LOG_LIFECYCLE || true; // lifecycle events (connect, reconnect, ping/pong)

// setup logging library
UTILS.Logging.EnablePayloadLogging = LOG_PAYLOAD;
UTILS.Logging.EnableLifecycleLogging = LOG_LIFECYCLE;

/** dummy authentication */
function authenticate(request, cbAuthenticated) {
  if (request.headers["sec-websocket-protocol"] !== "ocpp1.6") {
    cbAuthenticated("Connection denied");
  } else {
    cbAuthenticated();
  }
}

wsServer.on("connection", (webSocket, req) => {
  UTILS.Fn.lifecyc(`Connected from: ${req.url}`);

  // eslint-disable-next-line no-param-reassign
  webSocket.isAlive = true;

  webSocket.on("pong", () => {
    UTILS.Fn.log(`Received heartbeat PONG`);
    // eslint-disable-next-line no-param-reassign
    webSocket.isAlive = true;
  });

  webSocket.on("message", (message) => {
    UTILS.Fn.data("Received: ", message);

    let ocppMsg;
    try {
      ocppMsg = JSON.parse(message);
    } catch (e) {
      UTILS.Fn.err("Error parsing incoming json message");
      return;
    }

    // const msgNum = parseInt(ocppMsg[1], 16);
    const msgType = ocppMsg[2];
    const dateString = moment().format("DD-MM-YYYY HH:mm");

    if (msgType.toLowerCase() === "Heartbeat".toLowerCase()) {
      // send back ocpp heartbeat response. You just send back time
      webSocket.send(
        JSON.stringify([
          UTILS.OcppCallType.ServerToClient,
          ocppMsg[1],
          { currentTime: dateString },
        ])
      );
    } else if (msgType.toLowerCase() === "BootNotification".toLowerCase()) {
      // confirm boot notification - send back ocpp boot notification response
      webSocket.send(
        JSON.stringify([
          UTILS.OcppCallType.ServerToClient,
          ocppMsg[1],
          { status: "Accepted", currentTime: dateString, interval: 300 },
        ])
      );
    } else {
      UTILS.Fn.warn(`Skipping message type: ${msgType}`);
    }
  });

  webSocket.on("close", () => {
    UTILS.Fn.lifecyc("client connection closed");
  });
});

function logClient(client) {
  const sb = ["Connected client "];
  // eslint-disable-next-line no-underscore-dangle
  sb.push(client._socket.remoteAddress);
  sb.push(":");
  // eslint-disable-next-line no-underscore-dangle
  sb.push(client._socket.remotePort);
  return sb.join("");
}

// ping connected clients
const intervalHeartbeat = setInterval(() => {
  wsServer.clients.forEach((wsClient) => {
    if (wsClient.isAlive === false) {
      UTILS.Fn.lifecyc("Terminating unresponsive client");
      wsClient.terminate();
    } else {
      UTILS.Fn.lifecyc(`Triggering ping to client: ${logClient(wsClient)}`);
      // eslint-disable-next-line no-param-reassign
      wsClient.isAlive = false;
      wsClient.ping();
    }
  });
}, HEARTBEAT_INT_MS);

wsServer.on("close", () => {
  console.log("Shuting down websocket server");
  clearInterval(intervalHeartbeat);
});

server.on("upgrade", (request, socket, head) => {
  const { pathname } = url.parse(request.url);
  // remove leading slash from pathname
  const chargePointId = pathname.substring(1);

  authenticate(request, (err) => {
    if (err) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    } else {
      UTILS.Fn.lifecyc(`Upgrading request for charge point ${chargePointId}`);
      wsServer.handleUpgrade(request, socket, head, (webSocket) => {
        wsServer.emit("connection", webSocket, request);
      });
    }
  });
});

// start http server
server.listen(WEB_SRV_PORT, WEB_SRV_HOST, () => {
  console.log(`Server is running on http://${WEB_SRV_HOST}:${WEB_SRV_PORT}`);
});
