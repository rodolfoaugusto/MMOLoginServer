"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const utils_1 = require("./utils");
class Limits {
    constructor() {
        this.connectionLimits = new Map();
        this.authLimits = new Map();
        this.convertAddress = (address) => {
            if (typeof (address) == 'number') {
                return address;
            }
            if (typeof (address) == 'string') {
                return utils_1.ip2int(address);
            }
            else if (typeof (address) == 'object') {
                return address.readInt32BE(0);
            }
            console.error(`Invalid IP address: ${address}`);
        };
        this.acceptConnection = (address) => {
            let addr = this.convertAddress(address);
            if (!addr)
                return false;
            this.check();
            if (!this.connectionLimits.has(addr)) {
                this.connectionLimits.set(addr, {
                    t: new Array(config_1.default.limits.connections.interval.length).fill(0),
                    c: new Array(config_1.default.limits.connections.interval.length).fill(0),
                });
            }
            let limit = this.connectionLimits.get(addr);
            for (let i = 0; i < limit.c.length; ++i) {
                if (limit.t[i] + config_1.default.limits.connections.interval[i] < Date.now() / 1000) {
                    limit.t[i] = Date.now() / 1000;
                    limit.c[i] = 0;
                }
                limit.c[i] += 1;
            }
            for (let i = 0; i < limit.c.length; ++i) {
                if (limit.c[i] >= config_1.default.limits.connections.limit[i]) {
                    return false;
                }
            }
            return true;
        };
        this.acceptAuthorization = (address) => {
            let addr = this.convertAddress(address);
            if (!addr)
                return false;
            let limit = this.authLimits.get(addr);
            if (!limit) {
                return true;
            }
            for (let i = 0; i < limit.c.length; ++i) {
                if (limit.t[i] + config_1.default.limits.authorizations.interval[i] < Date.now() / 1000) {
                    limit.t[i] = Date.now() / 1000;
                    limit.c[i] = 0;
                }
            }
            for (let i = 0; i < limit.c.length; ++i) {
                if (limit.c[i] >= config_1.default.limits.authorizations.limit[i]) {
                    return false;
                }
            }
            return true;
        };
        this.addInvalidAuthorization = (address) => {
            let addr = this.convertAddress(address);
            if (!addr)
                return false;
            this.check();
            if (!this.authLimits.has(addr)) {
                this.authLimits.set(addr, {
                    t: new Array(config_1.default.limits.authorizations.interval.length).fill(0),
                    c: new Array(config_1.default.limits.authorizations.interval.length).fill(0),
                });
            }
            let limit = this.authLimits.get(addr);
            for (let i = 0; i < limit.c.length; ++i) {
                if (limit.t[i] + config_1.default.limits.authorizations.interval[i] < Date.now() / 1000) {
                    limit.t[i] = Date.now() / 1000;
                    limit.c[i] = 0;
                }
                limit.c[i] += 1;
            }
            return true;
        };
        this.check = () => {
            // protects against high ram usage attack
            if (this.connectionLimits.size > 10000) {
                this.connectionLimits.clear();
            }
            if (this.authLimits.size > 10000) {
                this.authLimits.clear();
            }
        };
    }
}
exports.default = new Limits();
//# sourceMappingURL=limits.js.map