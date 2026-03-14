import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import hrApi from '../services/hrApi';
import './HRNavbar.css';

const navLinks = [
  { to: '/hr/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hr/jobs', label: 'Job Postings', icon: FileText },
  { to: '/hr/applications', label: 'Applications', icon: Users },
];

const HRNavbar = ({ userName = 'HR' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    hrApi.logout();
    navigate('/hr/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sp-navbar" role="navigation" aria-label="HR navigation">
      <div className="sp-navbar__inner">
        <Link to="/hr/dashboard" className="sp-navbar__brand" aria-label="PlaceMe HR Portal Home">
          <Briefcase size={28} strokeWidth={2.2} />
          <span className="sp-navbar__brand-text">PlaceMe</span>
          <span className="sp-navbar__brand-badge">HR</span>
        </Link>

        <ul className="sp-navbar__links">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className={`sp-navbar__link ${location.pathname === to ? 'sp-navbar__link--active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="sp-navbar__right">
          <div className="sp-navbar__user">
            <div className="sp-navbar__avatar">
              <User size={16} />
            </div>
            <span className="sp-navbar__user-name">{userName}</span>
          </div>

          <button
            className="sp-navbar__logout"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>

          <button
            className="sp-navbar__mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="sp-navbar__mobile-menu" role="menu">
          <ul className="sp-navbar__mobile-links">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`sp-navbar__mobile-link ${location.pathname === to ? 'sp-navbar__mobile-link--active' : ''}`}
                  onClick={closeMobile}
                  role="menuitem"
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button className="sp-navbar__mobile-logout" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default HRNavbar;
