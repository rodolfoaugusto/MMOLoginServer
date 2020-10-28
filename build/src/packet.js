"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("./crypto");
class InputPacket {
    constructor(buffer) {
        this.getU8 = () => {
            this.check(1);
            const ret = this.buffer.readUInt8(this.pos);
            this.pos += 1;
            return ret;
        };
        this.peekU8 = () => {
            this.check(1);
            const ret = this.buffer.readUInt8(this.pos);
            return ret;
        };
        this.getU16 = () => {
            this.check(2);
            const ret = this.buffer.readUInt16LE(this.pos);
            this.pos += 2;
            return ret;
        };
        this.peekU16 = () => {
            this.check(2);
            const ret = this.buffer.readUInt16LE(this.pos);
            return ret;
        };
        this.getU32 = () => {
            this.check(4);
            const ret = this.buffer.readUInt32LE(this.pos);
            this.pos += 4;
            return ret;
        };
        this.peekU32 = () => {
            this.check(4);
            const ret = this.buffer.readUInt32LE(this.pos);
            return ret;
        };
        this.getString = (size) => {
            if (!size) {
                size = this.getU16();
            }
            this.check(size);
            const ret = this.buffer.toString('ascii', this.pos, this.pos + size);
            this.pos += size;
            return ret;
        };
        this.peekString = (size) => {
            if (!size) {
                size = this.peekU16();
            }
            this.check(size);
            const ret = this.buffer.toString('ascii', this.pos + 2, this.pos + 2 + size);
            return ret;
        };
        this.getBytes = (size) => {
            this.check(size);
            const ret = this.buffer.slice(this.pos, this.pos + size);
            this.pos += size;
            return ret;
        };
        this.rsaDecrypt = () => {
            return new InputPacket(crypto_1.default.rsaDecrypt(this.getBytes(128)));
        };
        this.adler32 = () => {
            return crypto_1.default.adler32(this.buffer, this.pos + 4, this.buffer.length - this.pos - 4);
        };
        this.toHexString = () => {
            return this.buffer.toString('hex');
        };
        this.buffer = buffer;
        this.pos = 0;
    }
    check(size) {
        if (this.pos + size > this.buffer.length) {
            throw `Packet overflow (size: ${this.buffer.length})`;
        }
    }
}
exports.InputPacket = InputPacket;
class OutputPacket {
    constructor() {
        this.length = () => {
            return this.pos;
        };
        this.getSendBuffer = () => {
            return Buffer.from(this.buffer.buffer, this.header, this.pos - this.header);
        };
        this.addU8 = (value) => {
            this.check(1);
            this.buffer.writeUInt8(value, this.pos);
            this.pos += 1;
        };
        this.addU16 = (value) => {
            this.check(2);
            this.buffer.writeUInt16LE(value, this.pos);
            this.pos += 2;
        };
        this.addU32 = (value) => {
            this.check(4);
            this.buffer.writeUInt32LE(value, this.pos);
            this.pos += 4;
        };
        this.addString = (value) => {
            this.check(value.length + 2);
            this.addU16(value.length);
            this.buffer.write(value, this.pos);
            this.pos += value.length;
        };
        this.addBytes = (value) => {
            this.check(value.length + 2);
            this.addU16(value.length);
            value.copy(this.buffer, this.pos);
            this.pos += value.length;
        };
        this.xteaEncrypt = (xtea) => {
            // add size
            this.buffer.writeUInt16LE(this.pos - this.header, this.header - 2);
            this.header -= 2;
            // fill
            if ((this.pos - this.header) % 8 != 0) {
                const toAdd = 8 - (this.pos - this.header) % 8;
                for (let i = 0; i < toAdd; ++i) {
                    this.addU8(0x33);
                }
            }
            // xtea encrypt
            if (this.header != 8) { // must have 8 reserved bytes
                throw `Invalid header size: ${this.header}`;
            }
            crypto_1.default.xteaEncrypt(this.buffer, this.pos, xtea);
        };
        this.addChecksum = () => {
            this.buffer.writeUInt32LE(crypto_1.default.adler32(this.buffer, this.header, this.pos - this.header), this.header - 4);
            this.header -= 4;
        };
        this.addSize = () => {
            this.buffer.writeUInt16LE(this.pos - this.header, this.header - 2);
            this.header -= 2;
        };
        this.buffer = Buffer.allocUnsafe(8192);
        this.header = 10;
        this.pos = this.header;
    }
    check(size) {
        if (this.pos + size > this.buffer.length) {
            throw `Packet overflow (size: ${this.buffer.length})`;
        }
    }
}
exports.OutputPacket = OutputPacket;
//# sourceMappingURL=packet.js.map