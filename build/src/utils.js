"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function ip2int(ip) {
    let d = ip.split('.');
    return ((+d[3]) << 24) + ((+d[2]) << 16) + ((+d[1]) << 8) + (+d[0]);
}
exports.ip2int = ip2int;