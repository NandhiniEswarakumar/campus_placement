import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Briefcase, ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import './Home.css';

const roles = [
  {
    id: 'student',
    title: 'Student',
    description: 'Browse jobs, apply to campus drives, and track your placement journey.',
    icon: GraduationCap,
    color: 'blue',
    loginPath: '/students/login',
    signupPath: '/students/signup',
  },
  {
    id: 'hr',
    title: 'HR / Recruiter',
    description: 'Post jobs, review applications, and manage your recruitment pipeline.',
    icon: Briefcase,
    color: 'emerald',
    loginPath: '/hr/login',
    signupPath: '/hr/signup',
  },
  {
    id: 'coordinator',
    title: 'Placement Coordinator',
    description: 'Oversee placement activities, manage schedules, and coordinate between students and companies.',
    icon: ShieldCheck,
    color: 'violet',
    loginPath: '/coordinator/login',
    signupPath: '/coordinator/signup',
  },
];

const Home = () => {
  return (
    <div className="home">
      <div className="home__container">
        {/* Header */}
        <div className="home__header">
          <div className="home__logo">
            <GraduationCap size={40} />
          </div>
          <h1 className="home__title">PlaceMe</h1>
          <p className="home__subtitle">Campus Placement Portal</p>
          <p className="home__desc">
            Select your role to get started
          </p>
        </div>

        {/* Role Cards */}
        <div className="home__roles">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                className={`home__role-card home__role-card--${role.color} ${role.comingSoon ? 'home__role-card--disabled' : ''}`}
              >
                <div className="home__role-icon-wrap">
                  <Icon size={28} />
                </div>
                <h3 className="home__role-title">{role.title}</h3>
                <p className="home__role-desc">{role.description}</p>

                {role.comingSoon ? (
                  <span className="home__coming-soon">Coming Soon</span>
                ) : (
                  <div className="home__role-actions">
                    <Link to={role.loginPath} className="home__role-btn home__role-btn--primary">
                      Login <ArrowRight size={16} />
                    </Link>
                    <Link to={role.signupPath} className="home__role-btn home__role-btn--outline">
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="home__footer">
          &copy; {new Date().getFullYear()} PlaceMe — Campus Placement Portal
        </p>
      </div>
    </div>
  );
};

export default Home;
