import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

async function initDatabase() {
  const schemaPath = path.join(process.cwd(), "scripts", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  // Connect without a database first (to create it)
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  await connection.query(schema);
  console.log("Database 'workout_app2' initialized successfully!");
  await connection.end();
}

initDatabase().catch((err) => {
  console.error("Failed to initialize database:", err.message);
  process.exit(1);
});
