import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthForm.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setError(data.errors.join(" · "));
      } else {
        setError(data?.message || "Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-brand">
          <div className="auth-brand-icon">🎟️</div>
          <span className="auth-brand-name">EventHub</span>
        </div>

        <h1>Create account</h1>
        <p className="auth-subtitle">Join EventHub and discover amazing events</p>

        {error && (
          <p className="auth-error" role="alert">
            ⚠️ {error}
          </p>
        )}

        <div className="auth-field">
          <label htmlFor="name">Full name</label>
          <div className="auth-input-wrap">
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Alice Smith"
              value={form.name}
              onChange={handleChange}
              required
            />
            <span className="auth-input-icon">👤</span>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <div className="auth-input-wrap">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <span className="auth-input-icon">✉️</span>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <div className="auth-input-wrap">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              required
            />
            <span className="auth-input-icon">🔒</span>
          </div>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting && <span className="auth-spinner" />}
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
