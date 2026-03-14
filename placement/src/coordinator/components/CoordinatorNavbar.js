import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react';
import coordinatorApi from '../services/coordinatorApi';
import './CoordinatorNavbar.css';

const navLinks = [
  { to: '/coordinator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/coordinator/drives', label: 'Drives', icon: Building2 },
  { to: '/coordinator/students', label: 'Students', icon: Users },
  { to: '/coordinator/applications', label: 'Applications', icon: Briefcase },
];

const CoordinatorNavbar = ({ userName = 'Coordinator' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    coordinatorApi.logout();
    navigate('/coordinator/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sp-navbar" role="navigation" aria-label="Coordinator navigation">
      <div className="sp-navbar__inner">
        <Link to="/coordinator/dashboard" className="sp-navbar__brand" aria-label="PlaceMe Coordinator Portal Home">
          <ShieldCheck size={28} strokeWidth={2.2} />
          <span className="sp-navbar__brand-text">PlaceMe</span>
          <span className="sp-navbar__brand-badge sp-navbar__brand-badge--coord">Coordinator</span>
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

export default CoordinatorNavbar;
