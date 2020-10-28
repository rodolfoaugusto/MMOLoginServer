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
const net = require("net");
const casts_1 = require("./casts");
const config_1 = require("./config");
const crypto_1 = require("./crypto");
const db_1 = require("./db");
const limits_1 = require("./limits");
const packet_1 = require("./packet");
const motd_1 = require("./motd");
const status_1 = require("./status");
const utils_1 = require("./utils");
const TIMEOUT = 15000;
const MAX_PACKET_SIZE = 1024;
class TibiaTCP {
    constructor() {
        this.server = null;
        this.connections = new Map();
        this.start = (host, port) => {
            if (this.server) {
                throw "TCP login server is already running";
            }
            this.host = host;
            this.port = port;
            this.bind(false);
        };
        this.stop = () => {
            if (!this.server)
                return;
            this.server.close();
            this.connections.forEach((data, socket) => {
                socket.destroy();
            });
        };
        this.bind = (rebind) => {
            if (rebind && !this.server)
                return;
            this.server = net.createServer(this.onConnection);
            this.server.on("error", this.onError);
            this.server.on("close", this.onClose);
            this.server.listen(this.port, this.host);
        };
        this.onClose = () => {
            this.server = null;
        };
        this.onError = (error) => {
            /*
            if (error == "EPIPE") {
                process.exit(0);
                console.log('test');
                return;
            }
            */
            console.log("TCP Server error: ", error);
            console.log("Rebinding in 1s");
            setTimeout(this.bind, 1000, true).unref();
        };
        this.onConnection = (socket) => {
            if (!limits_1.default.acceptConnection(socket.address().address)) {
                socket.destroy();
                return;
            }
            this.connections.set(socket, {
                size: 0,
                pos: 0,
                packet: null
            });
            // callbacks
            socket.on("close", this.onSocketClose.bind(this, socket));
            socket.on("data", this.onSocketData.bind(this, socket));
            socket.setTimeout(TIMEOUT, () => {
                socket.destroy();
            });
        };
        this.onSocketClose = (socket, had_error) => {
            this.connections.delete(socket);
        };
        this.onSocketData = (socket, data) => __awaiter(this, void 0, void 0, function* () {
            const socketData = this.connections.get(socket);
            let dataPos = 0;
            while (dataPos < data.length) {
                if (socketData.packet === null) { // read header
                    if (data.length < 2) {
                        socket.destroy();
                        return;
                    }
                    socketData.size = data.readInt16LE(0);
                    if (socketData.size > MAX_PACKET_SIZE) {
                        socket.destroy();
                        return;
                    }
                    socketData.packet = Buffer.allocUnsafe(socketData.size);
                    socketData.pos = 0;
                    dataPos += 2; // header size
                }
                let copiedBytes = data.copy(socketData.packet, socketData.pos, dataPos, Math.min(data.length, dataPos + socketData.size - socketData.pos));
                dataPos += copiedBytes;
                socketData.pos += copiedBytes;
                if (socketData.pos = socketData.size) {
                    try {
                        yield this.onSocketPacket(socket, new packet_1.InputPacket(socketData.packet));
                        socket.end();
                        break; // end connection after first packet
                    }
                    catch (e) { // invalid packet
                        console.log(e);
                        socket.destroy();
                        break;
                    }
                    socketData.packet = null;
                }
            }
        });
        // throw = destroy connection
        this.onSocketPacket = (socket, packet) => __awaiter(this, void 0, void 0, function* () {
            //console.log(packet.toHexString()); // may be used for benchmark
            let has_checksum = false;
            const checksum = packet.peekU32();
            if (checksum == packet.adler32()) {
                packet.getU32(); // read checksum
                has_checksum = true;
            }
            const packet_type = packet.getU8();
            if (packet_type == 0xFF) { // status check
            
                let output = yield status_1.default.process(this.host, this.port, packet);
                if (output) {
                    socket.write(output);
                }
                
                return;
            }
            if (packet_type != 0x01) {
                throw `Invalid packet type: ${packet_type}, should be 1`;
            }
            const os = packet.getU16();
            let version = packet.getU16();

            const data_signature = packet.getU32();
            const spr_signature = packet.getU32();
            const clientVersion = packet.getU32();

            let decryptedPacket = packet;
            let xtea = null;

            decryptedPacket = packet.rsaDecrypt();
            if (decryptedPacket.getU8() != 0) {
                throw "RSA decryption error (1)";
            }
            xtea = [decryptedPacket.getU32(), decryptedPacket.getU32(), decryptedPacket.getU32(), decryptedPacket.getU32()];
            
            let account_number;
                account_number = decryptedPacket.getU32();
            let account_password = decryptedPacket.getString();

            const loginError = (error, code) => {
                let outputPacket = new packet_1.OutputPacket();
                if (code) {
                    outputPacket.addU8(code);
                } else {
                    outputPacket.addU8(0x0A);
                }
                outputPacket.addString(error);
                this.send(socket, outputPacket, has_checksum, xtea);
            };

            let stayLogged = true;
           
            if (config_1.default.version.min > version || version > config_1.default.version.max) {
                return loginError(`Invalid client version.`);
            }
            if (socket && !limits_1.default.acceptAuthorization(socket.address().address)) {
                return loginError("Too many invalid login attempts.\nYou has been blocked for few minutes.");
            }
            let account;
            if (typeof (account_number) == 'number') {
                account = yield db_1.default.loadAccountById(account_number); // by id, for <840
            } else {
                return loginError("Please enter a valid account number and password.");
            }

            let hashed_password = crypto_1.default.hashPassword(account_password);
            if (!account || account.password != hashed_password) {
                if (socket) {
                    limits_1.default.addInvalidAuthorization(socket.address().address);
                }
                return loginError("Please enter a valid account number and password.");
            }

            if(account.banned == 1){
                limits_1.default.addInvalidAuthorization(socket.address().address);
                return loginError("Your account has been banned.");
            }

            if(!config_1.default.open && account.type < 3){
                return loginError(`${config_1.default.serverName} on developers test-server mode. Try again later.`);
            }

            let outputPacket = new packet_1.OutputPacket();
            let characters = yield db_1.default.loadCharactersByAccountId(account.id);
           
            // motd
            let motd = motd_1.getMotd(account.id);
            if (motd && motd.length > 0) {
                outputPacket.addU8(0x14);
                outputPacket.addString(`${motd_1.getMotdId(account.id)}\n${motd}`);
            }
            
            // worlds & characters & premium
            outputPacket.addU8(0x64);

            if(characters.length == 0){
                return loginError(`Your account dont have any character yet. Access your account in website and create a new one.`);
            }

            // worlds & characters
            outputPacket.addU8(characters.length);
            characters.forEach(character => {
                outputPacket.addString(character.name);
                let world = config_1.default.worlds.get(character.world_id); // keys are numbers
                if (!world) {
                    outputPacket.addString(`INVALID WORLD ${character.world_id}`);
                    outputPacket.addU32(0);
                    outputPacket.addU16(0);
                }
                else {
                    outputPacket.addString(world.name);
                    outputPacket.addU32(world.host_int ? world.host_int : utils_1.ip2int(world.host));
                    outputPacket.addU16(world.port);
                }
            });
            
            outputPacket.addU16(account.premdays);
            this.send(socket, outputPacket, has_checksum, xtea);
        });
        this.benchmark = (packet) => __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.onSocketPacket(null, new packet_1.InputPacket(packet));
            }
            catch (e) { }
        });
    }
    send(socket, packet, has_checksum, xtea) {
        if (xtea) {
            packet.xteaEncrypt(xtea);
        }
        if (has_checksum) {
            packet.addChecksum();
        }
        packet.addSize();
        if (socket) { // it's null when benchmarking
            socket.write(packet.getSendBuffer());
        }
    }
}
if(!TibiaTCP){
    return;
}
exports.default = TibiaTCP;
//# sourceMappingURL=tcp.js.map