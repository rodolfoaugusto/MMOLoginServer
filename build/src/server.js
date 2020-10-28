"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const uWebSockets_js_1 = require("uWebSockets.js");
const config_1 = require("./config");
const http_1 = require("./http");
const tcp_1 = require("./tcp");
const websocket_1 = require("./websocket");
class Server {
    constructor() {
        this.tcps = [];
        this.sockets = [];
        this.start = () => __awaiter(this, void 0, void 0, function* () {
            if (config_1.default.tcp.enabled) {
                config_1.default.tcp.ports.forEach(port => {
                    let tcp = new tcp_1.default();
                    tcp.start(config_1.default.tcp.host, port);
                    this.tcps.push(tcp);
                });
            }
            if (config_1.default.http.enabled) {
                if (config_1.default.http.ssl.enabled) {
                    try {
                        this.app = uWebSockets_js_1.SSLApp({
                            cert_file_name: config_1.default.http.ssl.cert,
                            key_file_name: config_1.default.http.ssl.key,
                            passphrase: config_1.default.http.ssl.passphrase
                        });
                    }
                    catch (e) {
                        throw `${e.toString()}\nMake sure if your SSL config for http server is correct`;
                    }
                }
                else {
                    this.app = uWebSockets_js_1.App({});
                }
                this.http = new http_1.default();
                this.ws = new websocket_1.default();
                this.http.start(this.app);
                this.ws.start(this.app);
                config_1.default.http.ports.forEach((port) => __awaiter(this, void 0, void 0, function* () {
                    yield new Promise((resolve) => {
                        this.app.listen(config_1.default.http.host, port, (listenSocket) => {
                            if (listenSocket) {
                                this.sockets.push(listenSocket);
                                resolve();
                            }
                        });
                    });
                }));
            }
        });
        this.stop = () => {
            this.tcps.forEach(tcp => {
                tcp.stop();
            });
            this.tcps = [];
            this.sockets.forEach(socket => {
                uWebSockets_js_1.us_listen_socket_close(socket);
            });
            this.sockets = [];
            if (this.app) {
                this.http.stop();
                this.ws.stop();
                this.http = null;
                this.ws = null;
                this.app = null;
            }
        };
    }
}
exports.default = Server;
//# sourceMappingURL=server.js.map