"use client";

import { useState } from "react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        // Full navigation so the proxy sees the new session cookie
        window.location.replace("/");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't sign in. Try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="field">
        <label className="field-label" htmlFor="username">Username</label>
        <input
          id="username"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <div className="error" role="alert">
          <span className="error-tag">err</span>
          {error}
        </div>
      )}

      <button type="submit" className="btn-generate" disabled={busy}>
        <span className="btn-generate-label">{busy ? "Unlocking" : "Unlock"}</span>
        <span className="btn-generate-kbd">[ enter ↵ ]</span>
      </button>
    </form>
  );
}
