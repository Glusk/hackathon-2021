const UTILS = {
  Fn: {
    /**
     * log messages and payloads (json)
     * @param {string} msg - message of the log statement
     * @param {object} data - javascript object or json string
     * @param {string} color - our color enum
     */
    log(msg, data, color) {
      if (arguments.length === 3) {
        let print = data;
        // try parse to json
        if (typeof data === "string" || data instanceof String) {
          try {
            print = JSON.parse(data);
          } catch (e) {
            console.warn(`unable to parse ${data}`);
          }
        }

        // change color and then restore it back
        console.log(color, msg, UTILS.Color.Default);
        console.log(print);
      } else if (arguments.length === 2) {
        // HACK : data is actually color here
        console.log(data, msg, UTILS.Color.Default);
      } else {
        console.log(msg);
      }
    },

    /** Logs data payload - consumes huge amount of IO */
    data(msg, data) {
      if (!UTILS.Logging.EnablePayloadLogging) return;
      UTILS.Fn.log(msg, data, UTILS.Color.Default);
    },

    /** Logs error */
    err(msg, err) {
      UTILS.Fn.log(msg, UTILS.Color.BgRed);
      if (err) console.error(err);
    },

    /** Logs error that should not interfere with process */
    warn(msg) {
      UTILS.Fn.log(msg, UTILS.Color.Yellow);
    },

    /** Lifecycle event */
    lifecyc(msg) {
      UTILS.Fn.log(msg, UTILS.Color.Magenta);
    },

    /** Create GUID to uniquely identify client */
    uuidv4() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        // eslint-disable-next-line no-bitwise
        const r = (Math.random() * 16) | 0;
        // eslint-disable-next-line no-bitwise
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  },

  Logging: {
    /** Very verbose logging of data exchange  */
    EnablePayloadLogging: undefined, // must be set by calling app

    /** log connection establishement and ping pong */
    EnableLifecycleLogging: undefined, // must be set by calling app
  },

  /** call direction in ocpp messages */
  OcppCallType: {
    ClientToServer: 2,
    ServerToClient: 3,
  },

  Color: {
    Default: "\x1b[0m",

    Black: "\x1b[30m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Magenta: "\x1b[35m",
    Cyan: "\x1b[36m",
    White: "\x1b[37m",

    BgRed: "\x1b[41m",
  },
};

module.exports = UTILS;
