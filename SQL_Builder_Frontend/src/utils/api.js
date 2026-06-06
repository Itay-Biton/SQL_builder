const BASE = "/api";

function getToken() {
  return localStorage.getItem("vsql_token");
}

function setToken(token) {
  if (token) localStorage.setItem("vsql_token", token);
  else localStorage.removeItem("vsql_token");
}

async function apiFetch(path, opts = {}) {
  const headers = opts.headers || {};
  headers["Content-Type"] = headers["Content-Type"] || "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch (e) {}
    const err = new Error("API error");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

export async function login(username, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getSchema() {
  return apiFetch("/schema");
}

export async function me() {
  return apiFetch("/auth/me");
}

export async function runQuery(sql) {
  return apiFetch("/query", { method: "POST", body: JSON.stringify({ sql }) });
}

export async function exportLog(format, rowCount, queryName) {
  return apiFetch("/export", {
    method: "POST",
    body: JSON.stringify({ format, rowCount, queryName }),
  });
}

export async function getTables() {
  return apiFetch("/tables");
}

export async function refreshSchema() {
  return apiFetch("/schema/refresh", { method: "POST" });
}

export async function getUsers() {
  return apiFetch("/admin/users");
}

export async function createUser(username, password, role = "user") {
  return apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export async function updateUser(username, data) {
  return apiFetch(`/admin/users/${encodeURIComponent(username)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(username) {
  return apiFetch(`/admin/users/${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
}

export async function changeUserPassword(username, password) {
  return apiFetch(`/admin/users/${encodeURIComponent(username)}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function setAuthToken(token) {
  setToken(token);
}

export function clearAuthToken() {
  setToken(null);
}

export default {
  login,
  getSchema,
  me,
  runQuery,
  getTables,
  refreshSchema,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  exportLog,
  setAuthToken,
  clearAuthToken,
};
