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
const xml2js_1 = require("xml2js");
const config_1 = require("./config");
const db_1 = require("./db");
const motd_1 = require("./motd");
let UPDATE_INTERVAL = 5000;
class Status {
    constructor() {
        this.start = Date.now();
        this.peak = {};
        this.cache = {};
        this.totalOnline = 0;
        this.totalOnlineCache = Date.now();
        this.builder = new xml2js_1.Builder({
            rootName: "xml",
            renderOpts: {
                'pretty': false
            },
            xmldec: {
                'version': '1.0'
            }
        });
        this.process = (host, port, packet) => __awaiter(this, void 0, void 0, function* () {
            let type = packet.getU8();
            if (type == 0xFF) { // general info
                let worldId;
                config_1.default.worlds.forEach((world) => {
                    if (world.status_port == port) {
                        worldId = world.id;
                    }
                });
                if (worldId !== null) {
                    return yield this.getCached(worldId);
                }
                return "WORLD_NOT_FOUND";
            }
            return "INVALID_REQUEST";
        });
        this.getCached = (world_id) => __awaiter(this, void 0, void 0, function* () {
            if (!this.cache[world_id] || this.cache[world_id].lastUpdate + UPDATE_INTERVAL < Date.now()) {
                this.cache[world_id] = {
                    content: yield this.get(world_id),
                    lastUpdate: Date.now()
                };
            }
            return this.cache[world_id].content;
        });
        this.getTotalOnlineCached = () => __awaiter(this, void 0, void 0, function* () {
            if (this.totalOnlineCache + UPDATE_INTERVAL < Date.now()) {
                this.totalOnline = yield db_1.default.getPlayersOnline();
            }
            return this.totalOnline;
        });
        this.get = (world_id) => __awaiter(this, void 0, void 0, function* () {
            let world = config_1.default.worlds.get(world_id);
            if (!world) {
                return "INVALID_WORLD_ID";
            }
            let playersOnline = yield db_1.default.getPlayersOnline(world_id);
            let playersOnlinePeak = Math.max(playersOnline + 1, yield db_1.default.getOnlineRecord(world_id));
            // todo: get real online peak
            if (!this.peak[world_id] || this.peak[world_id] <= playersOnlinePeak) {
                this.peak[world_id] = playersOnlinePeak;
            }
            let status = {
                $: {
                    "version": "1.0",
                },
                "tsqp": {
                    $: {
                        "version": "1.0",
                    },
                    "serverinfo": {
                        $: {
                            "uptime": Math.floor((Date.now() - this.start) / 1000),
                            "ip": world.host,
                            "port": world.port,
                            "servername": world.name,
                            "location": world.location,
                            "url": world.url,
                            "server": world.name,
                            "version": "4.5",
                            "client": "7.4"
                        }
                    },
                    "owner": {
                        $: {
                            "name": world.owner.name,
                            "email": world.owner.email
                        }
                    },
                    "players": {
                        $: {
                            "online": playersOnline,
                            "max": world.maxplayers,
                            "peak": this.peak[world_id]
                        }
                    },
                    "monsters": {
                        $: {
                            "total": world.monsters
                        }
                    },
                    "npcs": {
                        $: {
                            "total": world.npcs
                        }
                    },
                    "rates": {
                        $: world.rates
                    },
                    "map": {
                        $: world.map
                    },
                    "motd": 'A new oldschool experience.'
                }
            };
            return this.builder.buildObject(status);
        });
    }
}
exports.default = new Status();
//# sourceMappingURL=status.js.map