const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const USERS_FILE =
  process.env.USERS_FILE_PATH || path.resolve(__dirname, "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRATION || "24h";

// Initialize users.json with defaults if it doesn't exist
function initializeUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    console.log(
      `Users file not found at ${USERS_FILE}, creating default users...`,
    );
    const defaultUsers = [
      {
        username: "admin",
        password: "adminpass",
        role: "admin",
      },
      {
        username: "user",
        password: "userpass",
        role: "user",
      },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    console.log(`✓ Created users.json with default admin and user accounts`);
  }
}

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE + ".tmp", JSON.stringify(users, null, 2));
  fs.renameSync(USERS_FILE + ".tmp", USERS_FILE);
}

// On startup, if users.json contains plaintext `password` fields, hash them and persist
function ensureHashedPasswords() {
  const users = loadUsers();
  let changed = false;
  for (const u of users) {
    if (u.password && !u.passwordHash) {
      const hash = bcrypt.hashSync(u.password, 10);
      u.passwordHash = hash;
      delete u.password;
      changed = true;
    }
  }
  if (changed) saveUsers(users);
  return users;
}

function findUser(username) {
  const users = loadUsers();
  return users.find((u) => u.username === username);
}

function addUser({ username, password, role = "user" }) {
  if (!username || !password) throw new Error("username and password required");
  const users = loadUsers();
  if (users.find((u) => u.username === username))
    throw new Error("user exists");
  const passwordHash = bcrypt.hashSync(password, 10);
  const nu = { username, role, passwordHash };
  users.push(nu);
  saveUsers(users);
  return { username: nu.username, role: nu.role };
}

function updateUser(username, { role }) {
  const users = loadUsers();
  const u = users.find((x) => x.username === username);
  if (!u) throw new Error("user not found");
  if (role) u.role = role;
  saveUsers(users);
  return { username: u.username, role: u.role };
}

function deleteUser(username) {
  let users = loadUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) throw new Error("user not found");
  users.splice(idx, 1);
  saveUsers(users);
  return true;
}

function changePassword(username, newPassword) {
  if (!newPassword) throw new Error("password required");
  const users = loadUsers();
  const u = users.find((x) => x.username === username);
  if (!u) throw new Error("user not found");
  u.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);
  return true;
}

async function verifyCredentials(username, password) {
  const users = loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { username: user.username, role: user.role };
}

function signToken(user) {
  const payload = { username: user.username, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ error: "Missing token" });
  const token = parts[1];
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid token" });
  req.user = payload;
  next();
}

// Initialize users file and ensure hashed passwords
initializeUsersFile();
ensureHashedPasswords();

module.exports = {
  loadUsers,
  verifyCredentials,
  signToken,
  verifyToken,
  requireAuth,
  findUser,
  addUser,
  updateUser,
  deleteUser,
  changePassword,
};
