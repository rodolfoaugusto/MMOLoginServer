"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const constants = require("constants");
const otplib_1 = require("otplib");
const config_1 = require("./config");
otplib_1.authenticator.options = {
    window: 2
};
class Crypto {
    constructor() {
        this.privateKey = null;
        this.init = () => {
            if (this.privateKey) {
                throw "Crypto is already initialized";
            }
            try {
                const keyFilePath = path.resolve(config_1.default.keyFile);
                this.privateKey = fs.readFileSync(keyFilePath, 'utf-8').toString().trim();
                crypto.publicEncrypt(this.privateKey, Buffer.from("Test"));
            }
            catch (e) {
                throw `Can't load private key from ${config_1.default.keyFile}`;
            }
        };
        this.rsaDecrypt = (buffer) => {
            if (buffer.length != 128) {
                throw `rsaDecrypt: Invalid buffer length: ${buffer.length}`;
            }
            return crypto.privateDecrypt({
                key: this.privateKey,
                padding: constants.RSA_NO_PADDING,
                passphrase: ''
            }, buffer);
        };
        this.xteaEncrypt = (buffer, size, xtea) => {
            let u32 = new Uint32Array(buffer.buffer, buffer.byteOffset, size / Uint32Array.BYTES_PER_ELEMENT);
            for (let i = 2; i < u32.length; i += 2) {
                u32[0] = 0; // sum
                for (let j = 0; j < 32; ++j) {
                    u32[i] += (((u32[i + 1] << 4) >>> 0 ^ (u32[i + 1] >>> 5)) + u32[i + 1]) ^ (u32[0] + xtea[u32[0] & 3]);
                    u32[0] = (u32[0] + 0x9E3779B9) >>> 0;
                    u32[i + 1] += (((u32[i] << 4) >>> 0 ^ (u32[i] >>> 5)) + u32[i]) ^ (u32[0] + xtea[(u32[0] >> 11) & 3]);
                }
            }
        };
        this.adler32 = (buffer, offset, size) => {
            const m = 65521;
            let d = new Uint32Array(2);
            d[0] = 1;
            d[1] = 0;
            let p = offset;
            while (size > 0) {
                let tlen = size > 5552 ? 5552 : size;
                size -= tlen;
                while (tlen--) {
                    d[0] = d[0] + buffer[p++];
                    d[1] = d[1] + d[0];
                }
                d[0] = d[0] % 65521;
                d[1] = d[1] % 65521;
            }
            d[1] = (d[1] << 16) | d[0];
            return d[1];
        };
        this.hash = (algorithm, data) => {
            return crypto.createHash(algorithm).update(data).digest("hex");
        };
        this.md5 = (data) => {
            return this.hash("md5", data);
        };
        this.sha1 = (data) => {
            return this.hash("sha1", data);
        };
        this.sha256 = (data) => {
            return this.hash("sha256", data);
        };
        this.sha512 = (data) => {
            return this.hash("sha512", data);
        };
        this.hashPassword = (password) => {
            if (config_1.default.encryption == "sha" || config_1.default.encryption == "sha1") {
                return this.sha1(password);
            }
            else if (config_1.default.encryption == "sha2" || config_1.default.encryption == "sha256") {
                return this.sha256(password);
            }
            else if (config_1.default.encryption == "sha512") {
                return this.sha512(password);
            }
            else if (config_1.default.encryption == "md5") {
                return this.md5(password);
            }
            return password;
        };
        this.validateToken = (token, secret) => {
            return otplib_1.authenticator.check(token, secret);
        };
    }
}
exports.default = new Crypto();
//# sourceMappingURL=crypto.js.map