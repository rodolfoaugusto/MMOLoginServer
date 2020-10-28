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
const config_1 = require("./config");
const tcp_1 = require("./tcp");
class Server {
    constructor() {
        this.tcps = [];
        this.start = () => __awaiter(this, void 0, void 0, function* () {
            config_1.default.tcp.ports.forEach(port => {
                let tcp = new tcp_1.default();
                tcp.start(config_1.default.tcp.host, port);
                this.tcps.push(tcp);
            });
        });
        this.stop = () => {
            this.tcps.forEach(tcp => {
                tcp.stop();
            });
            this.tcps = [];
            if (this.app) {
                this.app = null;
            }
        };
    }
}
exports.default = Server;
//# sourceMappingURL=server.js.map