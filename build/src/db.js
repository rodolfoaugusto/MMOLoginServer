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
const mysql = require("mysql2/promise");
const config_1 = require("./config");
class DB {
    constructor() {
        this.conn = null;
        this.tables = {};
        
        this.start = () => __awaiter(this, void 0, void 0, function* () {
            if (this.conn) {
                throw "DB has already started";
            }
            this.conn = yield mysql.createPool({
                host: config_1.default.mysql.host,
                user: config_1.default.mysql.user,
                password: config_1.default.mysql.password,
                port: 3306,
                database: config_1.default.mysql.database,
                waitForConnections: true,
                connectionLimit: 15,
                queueLimit: 10000,
            });
            // check connection
            yield this.conn.query("SELECT 1");
            // try to auto detect what kind of database it is
            // first load details about this database
            let raw_tables_and_columns = yield this.query("SELECT TABLE_NAME as `table`, COLUMN_NAME as `column` FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA LIKE ?", [config_1.default.mysql.database]);
            raw_tables_and_columns.forEach((table_column) => {
                if (!this.tables[table_column.table]) {
                    this.tables[table_column.table] = [];
                }
                this.tables[table_column.table].push(table_column.column);
            });
        });
        this.stop = () => __awaiter(this, void 0, void 0, function* () {
            yield this.conn.end();
        });
        this.query = (query, params) => __awaiter(this, void 0, void 0, function* () {
            let [result, fields] = yield this.conn.execute(query, params);
            return result;
        });
        this.loadAccountById = (id) => __awaiter(this, void 0, void 0, function* () {
            const accounts = yield this.query('SELECT `id`,`password`,`type`,`premdays`,`lastday`,`lastip`,`banned` FROM `accounts` where `id` = ?', [id]);
            if (accounts.length != 1) {
                return null;
            }
            return this.parseAccount(accounts[0]);
        });
        this.loadAccountByName = (name) => __awaiter(this, void 0, void 0, function* () {
            const accounts = yield this.query('SELECT * FROM `accounts` where `name` = ?', [name]);
            if (accounts.length != 1) {
                return null;
            }
            return this.parseAccount(accounts[0]);
        });
        this.parseAccount = (account) => {
            return {
                id: account.id,
                name: account.name || account.id,
                password: account.password,
                type: account.type,
                premdays: account.premdays,
                secret: account.secret || "",
                lastday: account.lastday || 0,
                lastip: account.lastip || 0,
                banned: account.banned || 0,
            };
        };
        this.loadCharactersByAccountId = (accountId) => __awaiter(this, void 0, void 0, function* () {
            let characters = yield this.query('SELECT * FROM `players` where `account_id` = ?', [accountId]);
            let ret = [];
            for (let i = 0; i < characters.length; ++i) {
                ret.push(this.parseCharacter(characters[i]));
            }
            return ret;
        });
        this.parseCharacter = (character) => {
            return {
                id: character.id,
                name: character.name,
                world_id: character.world_id || 0,
            };
        };
        this.getPlayersOnline = (world_id) => __awaiter(this, void 0, void 0, function* () {
            if(config_1.default.multiWorld){
                return (yield this.query('SELECT COUNT(*) as count FROM `players_online` WHERE `world_id` = ?', [world_id]))[0].count;
            } else {
                return (yield this.query('SELECT COUNT(*) as count FROM `players_online`'));
            }
            return 0;
        });
        this.getOnlineRecord = (world_id) => __awaiter(this, void 0, void 0, function* () {
            let result;
            if(config_1.default.multiWorld){
                result = yield this.query("SELECT `value` FROM `server_config` WHERE `config` = 'players_record' AND `world_id` = ?", [world_id])[0].players_online;
            } else {
                result = yield this.query("SELECT `value` FROM `server_config` WHERE `config` = 'players_record'");
            }
            if (result.length == 1) {
                return result[0].value;
            }
        });
    }
}
exports.default = new DB();
//# sourceMappingURL=db.js.map