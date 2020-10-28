"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("./crypto");
const db_1 = require("./db");
const server_1 = require("./server");
let working = false;
let server = new server_1.default();
console.log("Starting Open Tibia Login Server...");
crypto_1.default.init();
db_1.default.start().then(() => {
    console.log("Connected to mysql database");
    server.start().then(() => {
        console.log("Running");
        working = true;
    }).catch((e) => {
        db_1.default.stop();
        console.log("Error: can't start server");
        console.log(e);
        process.exit(-1);
    });
}).catch((e) => {
    console.log("Error: can't connect to mysql host");
    console.log(e);
    process.exit(-1);
});
let quit = () => {
    if (!working)
        return;
    working = false;
    console.log("Exiting...");
    server.stop();
    db_1.default.stop();
};
process.on('SIGINT', quit);
process.on('SIGQUIT', quit);

process.on('uncaughtException', function(err) {
    return;
});
//# sourceMappingURL=app.js.map