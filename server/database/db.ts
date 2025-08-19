import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import { Mutex } from "async-mutex";
import path from "path";
import fs from "fs";
import { AbsPath } from "./dbHelpers";

const createDBSqlPath =  AbsPath("./database/createDb.sqlite");

sqlite3.verbose();
const dbMutex = new Mutex();
let releaseLock: () => void;
let conn: Database<sqlite3.Database, sqlite3.Statement> | null;

const getAppDataPath = () => {
  if (process.platform === "win32") {
    return (
      process.env.APPDATA ||
      path.join(process.env.HOMEPATH!, "AppData", "Roaming")
    );
  } else if (process.platform === "darwin") {
    return path.join(process.env.HOME!, "Library", "Application Support");
  } else {
    // For Linux
    return path.join(process.env.HOME!, ".config");
  }
};

const connectionString = path.join(
  getAppDataPath(),
  "Skyline",
  "PhotoMesh",
  "queue.sqlite"
);

export async function getConnection(): Promise<
  Database<sqlite3.Database, sqlite3.Statement>
> {
  const needToInitilize = !fs.existsSync(connectionString);
  releaseLock = await dbMutex.acquire();

  try {
    conn = await open({
      filename: connectionString,
      driver: sqlite3.Database,
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
  } catch (err) {
    console.error("Failed to open database:", err);
    releaseLock();
    throw err;
  }
}

export async function closeDatabase(
  conn: Database<sqlite3.Database, sqlite3.Statement>
): Promise<void> {
  try {
    await conn.close();
  } catch (err) {
    console.error("Failed to close database:", err);
  } finally {
    releaseLock();
    // console.info('Database connection closed.');
  }
}

export async function initDatabase(
  conn: Database<sqlite3.Database, sqlite3.Statement>
) {
  try {
    const createDBScript = fs.readFileSync(createDBSqlPath, "utf8");

    await conn.exec(createDBScript);

    console.log("Database initialized and seeded successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
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
