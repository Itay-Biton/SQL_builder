import React, { useState } from "react";
import api from "../utils/api";
import "./Login.css";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e && e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await api.login(username, password);
      if (resp && resp.token) {
        api.setAuthToken(resp.token);
        onLogin && onLogin(resp.user);
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      setError(err.body || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card" role="region" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-logo">S</div>
          <div>
            <div className="app-name">SQL Builder</div>
            <div className="app-sub">Visual query builder</div>
          </div>
        </div>

        <h2 id="login-title" className="login-title">
          Sign in to your account
        </h2>

        <form onSubmit={submit} className="login-form">
          <label className="field">
            <span className="label-text">Username</span>
            <input
              className="input"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              aria-required="true"
            />
          </label>

          <label className="field">
            <span className="label-text">Password</span>
            <input
              className="input"
              placeholder="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
            />
          </label>

          <div className="actions">
            <button
              type="submit"
              className="btn primary"
              disabled={loading || !username || !password}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={loading}
              onClick={() => {
                setUsername("");
                setPassword("");
                setError(null);
              }}
            >
              Clear
            </button>
          </div>

          {error && (
            <div className="error" role="alert">
              {typeof error === "string" ? error : JSON.stringify(error)}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
