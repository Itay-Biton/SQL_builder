const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const path = require("path");

// Force production mode
process.env.NODE_ENV = "production";

// load .env early so all env vars are available
try {
  require("dotenv").config();
} catch (e) {
  // dotenv is optional in environments where env vars are provided elsewhere
}

const db = require("./db");
const auth = require("./auth");
const logger = require("./logger");

const app = express();

// Validate required environment variables
const requiredEnvVars = [
  "PORT",
  "MYSQL_HOST",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("❌ ERROR: Missing required environment variables:");
  missingVars.forEach((v) => console.error(`  - ${v}`));
  console.error("\nPlease configure these variables in your .env file");
  process.exit(1);
}

const PORT = parseInt(process.env.PORT);

// Middleware (removed CORS for same-origin serving)
app.use(
  helmet({
    hsts: false,
    contentSecurityPolicy: {
      directives: {
        "upgrade-insecure-requests": null,
      },
    },
  }),
);
app.use(morgan("dev"));
app.use(bodyParser.json());
// Audit logging: log every request with minimal info (username/ip/method/route)
app.use(logger.requestLogger);

// Serve static frontend files
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// Create API router for all backend routes
const apiRouter = express.Router();

// Helper: list tables
async function listTables() {
  const schema = await db.getSchema();
  return schema.tables.map((t) => t.name);
}

// GET /tables -> list table names (requires auth)
apiRouter.get("/tables", auth.requireAuth, async (req, res) => {
  try {
    const tables = await listTables();
    res.json({ tables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tables/:name -> sample rows (with optional ?limit & ?offset)
apiRouter.get("/tables/:name", auth.requireAuth, async (req, res) => {
  try {
    const name = req.params.name;
    const limit = parseInt(req.query.limit || "100", 10);
    const offset = parseInt(req.query.offset || "0", 10);

    const allowed = await listTables();
    if (!allowed.includes(name))
      return res.status(400).json({ error: "Unknown table" });

    const escapedName = db.escapeIdentifier(name);
    const rows = await db.all(`SELECT * FROM ${escapedName} LIMIT ? OFFSET ?`, [
      limit,
      offset,
    ]);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /query -> run a SELECT query supplied by UI (only SELECT allowed)
apiRouter.post("/query", auth.requireAuth, async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== "string")
      return res.status(400).json({ error: "Missing sql in body" });

    // Basic safety: only allow SELECT statements, no semicolons
    const cleaned = sql.trim();
    if (!/^select\b/i.test(cleaned))
      return res.status(400).json({ error: "Only SELECT queries are allowed" });
    if (cleaned.includes(";"))
      return res
        .status(400)
        .json({ error: "Multiple statements/semicolons not allowed" });

    const rows = await db.all(cleaned);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tables/:name/count -> number of rows
apiRouter.get("/tables/:name/count", auth.requireAuth, async (req, res) => {
  try {
    const name = req.params.name;
    const allowed = await listTables();
    if (!allowed.includes(name))
      return res.status(400).json({ error: "Unknown table" });
    const escapedName = db.escapeIdentifier(name);
    const row = await db.get(`SELECT COUNT(*) as count FROM ${escapedName}`);
    res.json({ count: row.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Schema endpoints
apiRouter.get("/schema", auth.requireAuth, async (req, res) => {
  try {
    const schema = await db.getSchema();
    res.json(schema);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/schema/refresh", auth.requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin")
      return res.status(403).json({ error: "admin required" });
    const schema = await db.refreshSchema();
    logger.logEvent({
      req,
      description: "schema refreshed",
      meta: { status: "success", cachedAt: schema.cachedAt, force: true },
    });
    res.json({ ok: true, cachedAt: schema.cachedAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin user management endpoints
apiRouter.get("/admin/users", auth.requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin")
      return res.status(403).json({ error: "admin required" });
    logger.logEvent({ req, description: "admin: list users" });
    const users = require("./auth").loadUsers
      ? require("./auth").loadUsers()
      : [];
    // return sanitized list
    const out = (users || []).map((u) => ({
      username: u.username,
      role: u.role,
    }));
    res.json({ users: out });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/admin/users", auth.requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin")
      return res.status(403).json({ error: "admin required" });
    const { username, password, role } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: "username and password required" });
    const a = require("./auth");
    try {
      const created = a.addUser({ username, password, role });
      logger.logEvent({
        req,
        description: `admin: create user ${username}`,
        meta: { target: username, role },
      });
      res.json({ user: created });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put("/admin/users/:username", auth.requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin")
      return res.status(403).json({ error: "admin required" });
    const username = req.params.username;
    const { role } = req.body || {};
    const a = require("./auth");
    try {
      const updated = a.updateUser(username, { role });
      logger.logEvent({
        req,
        description: `admin: update user ${username}`,
        meta: { target: username, role },
      });
      res.json({ user: updated });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.delete(
  "/admin/users/:username",
  auth.requireAuth,
  async (req, res) => {
    try {
      if (req.user?.role !== "admin")
        return res.status(403).json({ error: "admin required" });
      const username = req.params.username;
      const a = require("./auth");
      try {
        a.deleteUser(username);
        logger.logEvent({
          req,
          description: `admin: delete user ${username}`,
          meta: { target: username },
        });
        res.json({ ok: true });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
);

apiRouter.post(
  "/admin/users/:username/password",
  auth.requireAuth,
  async (req, res) => {
    try {
      if (req.user?.role !== "admin")
        return res.status(403).json({ error: "admin required" });
      const username = req.params.username;
      const { password } = req.body || {};
      if (!password)
        return res.status(400).json({ error: "password required" });
      const a = require("./auth");
      try {
        a.changePassword(username, password);
        logger.logEvent({
          req,
          description: `admin: change password for ${username}`,
          meta: { target: username },
        });
        res.json({ ok: true });
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
);

// Auth endpoints
apiRouter.post("/auth/login", async (req, res) => {
  try {
    const start = Date.now();
    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: "username/password required" });

    const user = await auth.verifyCredentials(username, password);
    const duration = Date.now() - start;
    if (!user) {
      logger.logEvent({
        req,
        description: `auth: login failed for ${username}`,
        meta: { status: 400, duration, requestBody: req.body },
      });
      return res.status(400).json({ error: "invalid credentials" });
    }
    const token = auth.signToken(user);
    logger.logEvent({
      req,
      description: `auth: login success for ${username}`,
      meta: { status: 200, duration, requestBody: req.body },
    });
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/auth/me", auth.requireAuth, (req, res) => {
  res.json({ user: { username: req.user.username, role: req.user.role } });
});

// POST /export -> record an export action (client-side exports call this)
apiRouter.post("/export", auth.requireAuth, (req, res) => {
  const start = Date.now();
  try {
    const { format, rowCount, queryName } = req.body || {};
    // respond first, then log with timing/status
    res.json({ ok: true });
    const duration = Date.now() - start;
    logger.logEvent({
      req,
      description: `exported results`,
      meta: {
        format: format || "unknown",
        rowCount: rowCount || 0,
        queryName,
        status: 200,
        duration,
      },
    });
  } catch (e) {
    const duration = Date.now() - start;
    logger.logEvent({
      req,
      description: `exported results`,
      meta: {
        format: (req && req.body && req.body.format) || "unknown",
        rowCount: (req && req.body && req.body.rowCount) || 0,
        queryName: (req && req.body && req.body.queryName) || undefined,
        status: 500,
        duration,
      },
    });
    res.status(500).json({ error: e.message });
  }
});

// Mount all API routes under /api prefix
app.use("/api", apiRouter);

// Serve index.html for all other routes (SPA support)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Startup with database connection validation
async function startServer() {
  try {
    console.log("\n🔄 Validating MySQL connection...");
    await db.validateConnection();

    app.listen(PORT, () => {
      console.log(`\n✓ SQL Builder Server running on http://localhost:${PORT}`);
      console.log(`✓ Database: ${db.getDbPath()}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV}`);
      console.log(`\nServer ready to accept connections.\n`);
    });
  } catch (err) {
    console.error("\n❌ Failed to start server:");
    console.error(err.message);
    console.error(
      "\nPlease check your database configuration and try again.\n",
    );
    process.exit(1);
  }
}

startServer();
