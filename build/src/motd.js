"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
function getMotdId(account_id) {
    return config_1.default.motd.id;
}
exports.getMotdId = getMotdId;
function getMotd(account_id) {
    return config_1.default.motd.text;
}
exports.getMotd = getMotd;
//# sourceMappingURL=motd.js.map