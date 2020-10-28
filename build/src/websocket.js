"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const limits_1 = require("./limits");
const CHECK_INTERVAL = 4000; // for ping
class TibiaWebSocket {
    constructor() {
        this.checkInterval = null;
        this.start = (app) => {
            app.ws('/*', {
                compression: 0,
                maxPayloadLength: 16 * 1024,
                idleTimeout: 10,
                open: this.onOpen,
                close: this.onClose,
                message: this.onMessage
            });
            this.checkInterval = setInterval(this.check, CHECK_INTERVAL);
        };
        this.stop = () => {
            clearInterval(this.checkInterval);
        };
        this.check = () => {
        };
        this.onOpen = (ws, req) => {
            if (!limits_1.default.acceptConnection(Buffer.from(ws.getRemoteAddress()))) {
                return ws.close();
            }
        };
        this.onClose = (ws, code, message) => {
        };
        this.onMessage = (ws, message, isBinary) => {
            console.log(message);
        };
    }
}
exports.default = TibiaWebSocket;
//# sourceMappingURL=websocket.js.map