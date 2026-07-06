import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { pool: mysql.Pool };

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "workout_app",
    waitForConnections: true,
    connectionLimit: 10,
  });
}

export const db = globalForDb.pool || createPool();

if (process.env.NODE_ENV !== "production") globalForDb.pool = db;
