const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// MySQL connection configuration from environment variables
const config = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: process.env.MYSQL_POOL_MAX
    ? parseInt(process.env.MYSQL_POOL_MAX, 10)
    : 10,
  queueLimit: 0,
  connectTimeout: process.env.MYSQL_CONNECTION_TIMEOUT
    ? parseInt(process.env.MYSQL_CONNECTION_TIMEOUT, 10)
    : undefined,
  ssl:
    process.env.MYSQL_SSL === "true"
      ? {
          rejectUnauthorized:
            process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false",
        }
      : undefined,
};

let pool = null;

// Initialize connection pool
async function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}

// Validate connection with retry logic
async function validateConnection() {
  const retryCount = parseInt(process.env.DB_CONNECTION_RETRY_COUNT || "3");
  const retryDelay = parseInt(
    process.env.DB_CONNECTION_RETRY_DELAY_MS || "2000",
  );

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`Attempting MySQL connection (${attempt}/${retryCount})...`);
      const testPool = await getPool();
      await testPool.query("SELECT 1 AS test");
      console.log(
        `✓ Successfully connected to MySQL: ${config.host}:${config.port}/${config.database}`,
      );
      return true;
    } catch (err) {
      console.error(`✗ Connection attempt ${attempt} failed:`, err.message);
      if (attempt < retryCount) {
        console.log(`  Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        throw new Error(
          `Failed to connect to MySQL after ${retryCount} attempts.\n` +
            `Host: ${config.host}:${config.port}\n` +
            `Database: ${config.database}\n` +
            `Error: ${err.message}`,
        );
      }
    }
  }
}

async function all(query, params = []) {
  try {
    const poolConnection = await getPool();
    const [rows] = await poolConnection.query(query, params);
    return rows;
  } catch (err) {
    console.error("Query error:", err.message);
    throw err;
  }
}

async function get(query, params = []) {
  const rows = await all(query, params);
  return rows.length > 0 ? rows[0] : null;
}

async function run(query, params = []) {
  try {
    const poolConnection = await getPool();
    const [result] = await poolConnection.query(query, params);
    return { rowsAffected: result.affectedRows || 0 };
  } catch (err) {
    console.error("Query error:", err.message);
    throw err;
  }
}

function getDbPath() {
  return `${config.host}:${config.port}/${config.database}`;
}

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

// Schema cache helpers
const CACHE_FILE =
  process.env.SCHEMA_CACHE_PATH || path.resolve(__dirname, "schema_cache.json");
let schemaCache = null;

async function buildSchema() {
  // Get all user tables from MySQL
  const tables = await all(
    `SELECT TABLE_NAME as name
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_TYPE = 'BASE TABLE'
       AND TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [config.database],
  );

  const result = { tables: [], cachedAt: new Date().toISOString() };

  for (const t of tables) {
    const name = t.name;
    try {
      // Get column information for each table
      const cols = await all(
        `SELECT 
          c.COLUMN_NAME as name,
          c.DATA_TYPE as type,
          CASE WHEN c.COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END as pk
         FROM INFORMATION_SCHEMA.COLUMNS c
         WHERE c.TABLE_SCHEMA = ?
           AND c.TABLE_NAME = ?
         ORDER BY c.ORDINAL_POSITION`,
        [config.database, name],
      );

      const columns = cols.map((c) => ({
        name: c.name,
        type: c.type,
        pk: !!c.pk,
      }));

      result.tables.push({ name, columns });
    } catch (e) {
      console.warn(`Error getting schema for table ${name}:`, e.message);
      // skip problematic table
    }
  }

  // Persist to cache file
  try {
    fs.writeFileSync(CACHE_FILE + ".tmp", JSON.stringify(result, null, 2));
    fs.renameSync(CACHE_FILE + ".tmp", CACHE_FILE);
  } catch (e) {
    console.warn("Error writing schema cache:", e.message);
  }

  schemaCache = result;
  return result;
}

function loadCacheFromFile() {
  if (!fs.existsSync(CACHE_FILE)) return null;
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function getSchema() {
  if (schemaCache) return schemaCache;
  const fromFile = loadCacheFromFile();
  if (fromFile) {
    schemaCache = fromFile;
    return schemaCache;
  }
  return await buildSchema();
}

async function refreshSchema() {
  return await buildSchema();
}

module.exports = {
  all,
  get,
  run,
  getDbPath,
  escapeIdentifier,
  getSchema,
  refreshSchema,
  validateConnection,
};
