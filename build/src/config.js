"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
let Config;
let loadingError = "Can't find config.json";
function validateConfig() {
    if (Config.tcp.enabled) {
        let used_ports = {};
    }
}
function loadConfig(dir) {
    try {
        let file = path.resolve(`${dir}/config.json`);
        if (!fs.existsSync(file))
            return false;
        Config = require(file);
        Config['worlds'] = new Map();
        let worldsDir = path.resolve(`${dir}/worlds`);
        let files = fs.readdirSync(worldsDir);
        for (let i = 0; i < files.length; ++i) {
            let file = files[i];
            if (file.toLowerCase().indexOf(".json") < 1)
                continue;
            let world = require(path.resolve(`${worldsDir}/${file}`));
            if (typeof (world.id) !== 'number') {
                throw `Invalid world id: ${file} - ${world.id}`;
            }
            Config['worlds'].set(world.id, world);
        }
        validateConfig();
    }
    catch (e) {
        loadingError = e;
        return false;
    }
    return true;
}
if (!loadConfig(".")) {
    throw `Can't load config. ${loadingError}`;
}
exports.default = Config;
//# sourceMappingURL=config.js.map