import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  Briefcase,
  FileText,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import api from '../services/api';
import './Navbar.css';

const navLinks = [
  { to: '/students/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students/companies', label: 'Companies', icon: Building2 },
  { to: '/students/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/students/drive-applications', label: 'My Drives', icon: FileText },
];

const Navbar = ({ studentName = 'Student' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    api.logout();
    navigate('/students/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sp-navbar" role="navigation" aria-label="Main navigation">
      <div className="sp-navbar__inner">
        {/* Brand */}
        <Link to="/students/dashboard" className="sp-navbar__brand" aria-label="Campus Placement Portal Home">
          <GraduationCap size={28} strokeWidth={2.2} />
          <span className="sp-navbar__brand-text">PlaceMe</span>
        </Link>

        {/* Desktop nav links */}
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

        {/* Right section */}
        <div className="sp-navbar__right">
          <div className="sp-navbar__user">
            <div className="sp-navbar__avatar">
              <User size={16} />
            </div>
            <span className="sp-navbar__user-name">{studentName}</span>
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

          {/* Mobile toggle */}
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

      {/* Mobile menu */}
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

export default Navbar;
