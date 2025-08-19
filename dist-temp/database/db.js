"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.closeDatabase = closeDatabase;
exports.initDatabase = initDatabase;
const sqlite_1 = require("sqlite");
const sqlite3_1 = __importDefault(require("sqlite3"));
const async_mutex_1 = require("async-mutex");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dbHelpers_1 = require("./dbHelpers");
const createDBSqlPath = (0, dbHelpers_1.AbsPath)("./database/createDb.sqlite");
sqlite3_1.default.verbose();
const dbMutex = new async_mutex_1.Mutex();
let releaseLock;
let conn;
const getAppDataPath = () => {
    if (process.platform === "win32") {
        return (process.env.APPDATA ||
            path_1.default.join(process.env.HOMEPATH, "AppData", "Roaming"));
    }
    else if (process.platform === "darwin") {
        return path_1.default.join(process.env.HOME, "Library", "Application Support");
    }
    else {
        // For Linux
        return path_1.default.join(process.env.HOME, ".config");
    }
};
const connectionString = path_1.default.join(getAppDataPath(), "Skyline", "PhotoMesh", "queue.sqlite");
async function getConnection() {
    const needToInitilize = !fs_1.default.existsSync(connectionString);
    releaseLock = await dbMutex.acquire();
    try {
        conn = await (0, sqlite_1.open)({
            filename: connectionString,
            driver: sqlite3_1.default.Database,
        });
        if (needToInitilize) {
            await initDatabase(conn);
        }
        // conn.on('trace', (query: string) => {
        //     console.info(`Executing query: ${query}`);
        // });
        // conn.on('profile', (query: string, time: number) => {
        //     console.info(`Query "${query}" completed in ${time} ms`);
        // });
        await conn.run("PRAGMA busy_timeout = 5000;");
        return conn;
    }
    catch (err) {
        console.error("Failed to open database:", err);
        releaseLock();
        throw err;
    }
}
async function closeDatabase(conn) {
    try {
        await conn.close();
    }
    catch (err) {
        console.error("Failed to close database:", err);
    }
    finally {
        releaseLock();
        // console.info('Database connection closed.');
    }
}
async function initDatabase(conn) {
    try {
        const createDBScript = fs_1.default.readFileSync(createDBSqlPath, "utf8");
        await conn.exec(createDBScript);
        console.log("Database initialized and seeded successfully!");
    }
    catch (error) {
        console.error("Error initializing database:", error);
    }
    finally {
    }
}
process.on("SIGINT", async () => {
    console.info("SIGINT received. Closing database connection.");
    if (conn != null) {
        await closeDatabase(conn);
    }
    process.exit(0);
});
process.on("SIGTERM", async () => {
    console.info("SIGTERM received. Closing database connection.");
    if (conn != null) {
        await closeDatabase(conn);
    }
    process.exit(0);
});
