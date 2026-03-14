import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../services/api';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(form.email, form.password);
      api.saveAuth(data.token, data.student);
      navigate('/students/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-auth">
      <div className="sp-auth__container">
        {/* Left — branding panel */}
        <div className="sp-auth__brand-panel">
          <div className="sp-auth__brand-content">
            <GraduationCap size={48} />
            <h1 className="sp-auth__brand-title">PlaceMe</h1>
            <p className="sp-auth__brand-subtitle">Campus Placement Portal</p>
            <div className="sp-auth__brand-features">
              <div className="sp-auth__brand-feature">
                <span className="sp-auth__brand-dot" />
                <span>Track upcoming campus drives</span>
              </div>
              <div className="sp-auth__brand-feature">
                <span className="sp-auth__brand-dot" />
                <span>Browse & apply for job postings</span>
              </div>
              <div className="sp-auth__brand-feature">
                <span className="sp-auth__brand-dot" />
                <span>Get notified about new opportunities</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="sp-auth__form-panel">
          <form className="sp-auth__form" onSubmit={handleSubmit} noValidate>
            <div className="sp-auth__form-header">
              <h2 className="sp-auth__form-title">Welcome back</h2>
              <p className="sp-auth__form-desc">Sign in to your student account</p>
            </div>

            {error && (
              <div className="sp-auth__error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="sp-auth__field">
              <label htmlFor="login-email" className="sp-auth__label">Email address</label>
              <div className="sp-auth__input-wrap">
                <Mail size={18} className="sp-auth__input-icon" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="you@college.edu"
                  className="sp-auth__input"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="sp-auth__field">
              <label htmlFor="login-password" className="sp-auth__label">Password</label>
              <div className="sp-auth__input-wrap">
                <Lock size={18} className="sp-auth__input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  className="sp-auth__input"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="sp-auth__toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="sp-auth__extras">
              <label className="sp-auth__checkbox-label">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                  className="sp-auth__checkbox"
                />
                <span>Remember me</span>
              </label>
              <Link to="/students/forgot-password" className="sp-auth__link-sm">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="sp-auth__btn" disabled={loading}>
              {loading ? <span className="sp-auth__spinner" /> : 'Sign In'}
            </button>

            <p className="sp-auth__footer-text">
              Don&apos;t have an account?{' '}
              <Link to="/students/signup" className="sp-auth__link">Sign up</Link>
            </p>

            <p className="sp-auth__footer-text" style={{ marginTop: '-8px' }}>
              <Link to="/" className="sp-auth__link-sm">← Back to Home</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
