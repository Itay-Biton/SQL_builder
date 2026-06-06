import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function UsersAdmin({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getUsers();
      setUsers(resp.users || []);
    } catch (e) {
      setError(e?.body?.error || e.message || JSON.stringify(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.createUser(newUsername, newPassword, newRole);
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      refresh();
    } catch (e) {
      alert(e?.body?.error || e.message || JSON.stringify(e));
    }
  }

  async function handleDelete(username) {
    if (!window.confirm(`Delete user ${username}?`)) return;
    try {
      await api.deleteUser(username);
      refresh();
    } catch (e) {
      alert(e?.body?.error || e.message || JSON.stringify(e));
    }
  }

  async function handleRoleChange(username, role) {
    try {
      await api.updateUser(username, { role });
      refresh();
    } catch (e) {
      alert(e?.body?.error || e.message || JSON.stringify(e));
    }
  }

  async function handleChangePassword(username) {
    const pw = window.prompt(`New password for ${username}:`);
    if (!pw) return;
    try {
      await api.changeUserPassword(username, pw);
      alert("Password updated");
    } catch (e) {
      alert(e?.body?.error || e.message || JSON.stringify(e));
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "720px",
          maxWidth: "94%",
          maxHeight: "86%",
          background: "#fff",
          borderRadius: 8,
          padding: 18,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>User Management</h2>
          <button onClick={onClose} style={{ marginLeft: 12 }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <form
            onSubmit={handleCreate}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <input
              placeholder="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
            <input
              placeholder="password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit">Create</button>
          </form>

          {loading && <div>Loading users...</div>}
          {error && <div style={{ color: "red" }}>{error}</div>}

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Username</th>
                <th style={{ textAlign: "left", padding: 8 }}>Role</th>
                <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.username} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{u.username}</td>
                  <td style={{ padding: 8 }}>
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleRoleChange(u.username, e.target.value)
                      }
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>
                    <button
                      onClick={() => handleChangePassword(u.username)}
                      style={{ marginRight: 8 }}
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => handleDelete(u.username)}
                      disabled={u.username === "admin"}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
