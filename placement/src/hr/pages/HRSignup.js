import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Mail, Lock, Eye, EyeOff, AlertCircle,
  User, Phone, Building, Award, CheckCircle2,
} from 'lucide-react';
import hrApi from '../services/hrApi';
import './HRAuth.css';

const HRSignup = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    company: '', designation: '', phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!form.company.trim()) errs.company = 'Company name is required.';
    if (!form.designation.trim()) errs.designation = 'Designation is required.';
    if (!form.phone.trim()) errs.phone = 'Phone number is required.';
    else if (!/^\+?[\d\s-]{10,15}$/.test(form.phone.replace(/\s/g, ''))) errs.phone = 'Enter a valid phone number.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await hrApi.signup({
        name: form.name,
        email: form.email,
        password: form.password,
        company: form.company,
        designation: form.designation,
        phone: form.phone,
      });
      setSuccess(true);
    } catch (err) {
      setErrors({ general: err.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="sp-auth">
        <div className="sp-auth__success-card">
          <CheckCircle2 size={56} className="sp-auth__success-icon" />
          <h2 className="sp-auth__success-title">Registration Successful!</h2>
          <p className="sp-auth__success-desc">
            Your HR account has been created. You can now sign in to access the recruitment portal.
          </p>
          <Link to="/hr/login" className="sp-auth__btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Go to HR Login
          </Link>
        </div>
      </div>
    );
  }

  const renderField = (name, label, icon, type = 'text', placeholder = '') => {
    const Icon = icon;
    const isPasswordField = name === 'password' || name === 'confirmPassword';
    return (
      <div className="sp-auth__field">
        <label htmlFor={`hr-signup-${name}`} className="sp-auth__label">{label}</label>
        <div className={`sp-auth__input-wrap ${errors[name] ? 'sp-auth__input-wrap--error' : ''}`}>
          <Icon size={18} className="sp-auth__input-icon" />
          <input
            id={`hr-signup-${name}`}
            type={isPasswordField ? (showPassword ? 'text' : 'password') : type}
            name={name}
            placeholder={placeholder}
            className="sp-auth__input"
            value={form[name]}
            onChange={handleChange}
            required
          />
          {isPasswordField && name === 'password' && (
            <button
              type="button"
              className="sp-auth__toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {errors[name] && <span className="sp-auth__field-error">{errors[name]}</span>}
      </div>
    );
  };

  return (
    <div className="sp-auth">
      <div className="sp-auth__container sp-auth__container--signup">
        <div className="sp-auth__brand-panel sp-auth__brand-panel--hr">
          <div className="sp-auth__brand-content">
            <Briefcase size={48} />
            <h1 className="sp-auth__brand-title">PlaceMe</h1>
            <p className="sp-auth__brand-subtitle">HR Recruitment Portal</p>
            <div className="sp-auth__brand-features">
              <div className="sp-auth__brand-feature">
                <span className="sp-auth__brand-dot" />
                <span>Create job postings for campus</span>
              </div>
              <div className="sp-auth__brand-feature">
                <span className="sp-auth__brand-dot" />
                <span>Review & filter applicants</span>
              </div>
              <div className="sp-auth__brand-feature">
                <span className="sp-auth__brand-dot" />
                <span>Manage hiring pipeline</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sp-auth__form-panel">
          <form className="sp-auth__form" onSubmit={handleSubmit} noValidate>
            <div className="sp-auth__form-header">
              <h2 className="sp-auth__form-title">HR Registration</h2>
              <p className="sp-auth__form-desc">Register as a recruiter</p>
            </div>

            {errors.general && (
              <div className="sp-auth__error" role="alert">
                <AlertCircle size={16} />
                <span>{errors.general}</span>
              </div>
            )}
            {!errors.general && Object.keys(errors).length > 0 && (
              <div className="sp-auth__error" role="alert">
                <AlertCircle size={16} />
                <span>Please fix the errors below.</span>
              </div>
            )}

            <div className="sp-auth__form-grid">
              {renderField('name', 'Full Name', User, 'text', 'Priya Menon')}
              {renderField('email', 'Work Email', Mail, 'email', 'you@company.com')}
              {renderField('password', 'Password', Lock, 'password', 'Min 6 characters')}
              {renderField('confirmPassword', 'Confirm Password', Lock, 'password', 'Re-enter password')}
              {renderField('company', 'Company Name', Building, 'text', 'TechCorp Solutions')}
              {renderField('designation', 'Designation', Award, 'text', 'HR Manager')}
            </div>

            {renderField('phone', 'Phone Number', Phone, 'tel', '+91 98765 43210')}

            <button type="submit" className="sp-auth__btn" disabled={loading}>
              {loading ? <span className="sp-auth__spinner" /> : 'Create HR Account'}
            </button>

            <p className="sp-auth__footer-text">
              Already have an account?{' '}
              <Link to="/hr/login" className="sp-auth__link">Sign in</Link>
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

export default HRSignup;
