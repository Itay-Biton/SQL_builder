const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Logs directory (configurable via env var)
const LOG_DIR = process.env.LOG_DIR || path.resolve(__dirname, "logs");
const LOG_PREFIX = "audit-"; // file names: audit-YYYY-MM-DD.log or .gz

// Rotation/retention settings
const RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || "30", 10);
const COMPRESS_AFTER_DAYS = parseInt(
  process.env.COMPRESSION_THRESHOLD_DAYS || "1",
  10,
);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`✓ Created log directory: ${LOG_DIR}`);
}

let currentDateStr = null;
let currentStream = null;

function dateStrFor(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function logFilenameForDateStr(ds) {
  return path.join(LOG_DIR, `${LOG_PREFIX}${ds}.log`);
}

function ensureStreamForToday() {
  const now = new Date();
  const ds = dateStrFor(now);
  if (ds === currentDateStr && currentStream) return;
  if (currentStream) {
    try {
      currentStream.end();
    } catch (e) {
      /* ignore */
    }
    currentStream = null;
  }
  currentDateStr = ds;
  const fname = logFilenameForDateStr(ds);
  currentStream = fs.createWriteStream(fname, { flags: "a" });
}

function scheduleNextRotation() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 2, 0); // small buffer after midnight UTC
  const ms = tomorrow.getTime() - now.getTime();
  setTimeout(() => {
    try {
      ensureStreamForToday();
      cleanupOldLogs().catch((e) => console.error("cleanupOldLogs error", e));
    } finally {
      scheduleNextRotation();
    }
  }, ms);
}

async function cleanupOldLogs() {
  const files = await fs.promises.readdir(LOG_DIR);
  const now = Date.now();
  await Promise.all(
    files
      .filter((f) => f.startsWith(LOG_PREFIX))
      .map(async (f) => {
        const full = path.join(LOG_DIR, f);
        try {
          const st = await fs.promises.stat(full);
          const ageDays = (now - st.mtimeMs) / (1000 * 60 * 60 * 24);
          if (f.endsWith(".log") && ageDays >= COMPRESS_AFTER_DAYS) {
            const gzName = full + ".gz";
            await new Promise((resolve, reject) => {
              const inp = fs.createReadStream(full);
              const out = fs.createWriteStream(gzName);
              const gzip = zlib.createGzip();
              inp.pipe(gzip).pipe(out);
              out.on("finish", async () => {
                try {
                  await fs.promises.unlink(full);
                  resolve();
                } catch (e) {
                  resolve();
                }
              });
              out.on("error", (err) => reject(err));
            });
            return;
          }
          if (
            (f.endsWith(".gz") || f.endsWith(".log")) &&
            ageDays >= RETENTION_DAYS
          ) {
            try {
              await fs.promises.unlink(full);
            } catch (e) {
              // ignore
            }
            return;
          }
        } catch (e) {
          // ignore per-file errors
        }
      }),
  );
}

function maskSensitive(obj) {
  if (!obj || typeof obj !== "object") return obj;
  try {
    const out = Array.isArray(obj) ? [] : {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (/password|pass|pwd/i.test(k)) {
        out[k] = "[REDACTED]";
      } else if (typeof v === "object") {
        out[k] = maskSensitive(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  } catch (e) {
    return null;
  }
}

function humanizeAction(method, route) {
  if (!route) return null;
  try {
    const r = route.split("?")[0];
    if (r === "/query" && method === "POST") return "queried the database";
    if (r === "/auth/login" && method === "POST") return "login attempt";
    if (r === "/auth/me" && method === "GET")
      return "checked authentication status";
    if (r === "/tables" && method === "GET") return "listed tables";
    if (/^\/tables\/[^/]+\/count$/.test(r) && method === "GET")
      return "requested table row count";
    if (/^\/tables\//.test(r) && method === "GET")
      return "requested sample rows from table";
    if (r === "/schema" && method === "GET") return null; // suppressed elsewhere
    if (r.startsWith("/admin/users")) {
      if (r === "/admin/users" && method === "GET") return "listed users";
      if (r === "/admin/users" && method === "POST") return "created user";
      if (method === "PUT") return "updated user";
      if (method === "DELETE") return "deleted user";
      if (method === "POST" && /\/password$/.test(r))
        return "changed user password";
    }
    if (method && route) return `${method} ${route}`;
    return null;
  } catch (e) {
    return null;
  }
}

function formatPretty(e) {
  function truncate(s, n = 1200) {
    if (typeof s !== "string") s = String(s);
    if (s.length <= n) return s;
    return s.slice(0, n - 3) + "...";
  }

  const ts = e.timestamp || new Date().toISOString();
  const user = e.username
    ? `${e.role ? e.role.toUpperCase() : "USER"}: ${e.username}`
    : "ANON";
  const action = e.description || "-";

  let queryText = null;
  if (e.meta && typeof e.meta === "object") {
    if (e.meta.sql) queryText = e.meta.sql;
    else if (e.meta.query) queryText = e.meta.query;
  }
  if (
    !queryText &&
    e.meta &&
    e.meta.requestBody &&
    typeof e.meta.requestBody === "object"
  ) {
    if (e.meta.requestBody.sql) queryText = e.meta.requestBody.sql;
  }

  const parts = [];
  parts.push(`[${ts}]`);
  parts.push(`[${user}]`);
  parts.push(`[ACTION: ${truncate(action, 200)}]`);

  const method = e.method || "-";
  const route = e.route || "-";
  const status = e.meta && e.meta.status ? e.meta.status : "-";
  const duration = e.meta && e.meta.duration ? `${e.meta.duration}ms` : "-";

  const mr = `[${method}, route: ${route}, response: ${status}, duration: ${duration}]`;
  parts.push(mr);

  let bodyPreview = null;
  if (e.meta && e.meta.requestBody)
    bodyPreview = maskSensitive(e.meta.requestBody);
  else if (
    e.meta &&
    typeof e.meta === "object" &&
    Object.keys(e.meta).length > 0
  )
    bodyPreview = maskSensitive(e.meta);

  if (bodyPreview) {
    try {
      parts.push(`[body: ${truncate(JSON.stringify(bodyPreview), 1000)}]`);
    } catch (err) {
      parts.push(`[body: (unserializable)]`);
    }
  }
  return parts.join(" ");
}

function writeLog(entry) {
  try {
    ensureStreamForToday();
    const pretty = formatPretty(entry) + "\n";
    if (currentStream && currentStream.writable) currentStream.write(pretty);
    else fs.appendFileSync(logFilenameForDateStr(currentDateStr), pretty);
  } catch (e) {
    console.error("Audit log error", e);
  }
}

function logEvent({ req = null, description = "", meta = null } = {}) {
  const user =
    req && req.user
      ? { username: req.user.username, role: req.user.role }
      : null;
  const entry = {
    timestamp: new Date().toISOString(),
    username: user ? user.username : null,
    role: user ? user.role : null,
    method: req ? req.method : null,
    route: req ? req.originalUrl || req.url : null,
    description,
    meta: maskSensitive(meta || (req && req.body) || null),
  };
  // Skip logging schema route per request
  try {
    const r = entry.route || "";
    const forced = entry.meta && entry.meta.force;
    if (typeof r === "string" && r.startsWith("/schema") && !forced) return;
  } catch (e) {}

  // Prefer a human description when original description is just the raw method/route
  const rawDescPattern = /^\s*([A-Z]+)\s+\//;
  if (entry.description && rawDescPattern.test(String(entry.description))) {
    const human = humanizeAction(entry.method, entry.route);
    if (human) entry.description = human;
  }

  writeLog(entry);
}

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    // avoid duplicating auth login logs: skip middleware summary for POST /auth/login
    try {
      const route = req ? req.originalUrl || req.url || "" : "";
      if (
        req &&
        req.method === "POST" &&
        (route.startsWith("/auth/login") || route.startsWith("/export"))
      ) {
        return;
      }
    } catch (e) {
      /* ignore */
    }

    const duration = Date.now() - start;
    const desc = `${req.method} ${req.originalUrl}`;
    const meta = { status: res.statusCode, duration };
    if (req && req.body) meta.requestBody = req.body;
    logEvent({ req, description: desc, meta });
  });
  next();
}

// initialize rotation and cleanup
ensureStreamForToday();
cleanupOldLogs().catch((e) => console.error("cleanupOldLogs error", e));
scheduleNextRotation();

module.exports = { requestLogger, logEvent };
