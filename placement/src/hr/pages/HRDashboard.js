import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Users, FileText, TrendingUp,
  ArrowRight, Clock, MapPin, CheckCircle2, Loader,
} from 'lucide-react';
import HRNavbar from '../components/HRNavbar';
import hrApi from '../services/hrApi';
import './HRDashboard.css';

const HRDashboard = () => {
  const hr = hrApi.getUser() || {};

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobData, appData] = await Promise.all([
          hrApi.getMyJobs().catch(() => ({ jobs: [] })),
          hrApi.getApplications().catch(() => ({ applications: [] })),
        ]);
        setJobs(jobData.jobs || []);
        setApplications(appData.applications || []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeJobs = jobs.filter((j) => j.status === 'active');
  const totalApplicants = applications.length;
  const newApplications = applications.filter((a) => a.status === 'applied').length;
  const shortlistedApplications = applications.filter((a) => a.status === 'shortlisted' || a.status === 'selected').length;

  const stats = [
    { label: 'Active Jobs', value: activeJobs.length, icon: Briefcase, color: 'blue' },
    { label: 'Total Applicants', value: totalApplicants, icon: Users, color: 'emerald' },
    { label: 'New Applications', value: newApplications, icon: FileText, color: 'violet' },
    { label: 'Shortlisted', value: shortlistedApplications, icon: CheckCircle2, color: 'amber' },
  ];

  const recentApplications = [...applications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const statusConfig = {
    applied: { label: 'New', className: 'hr-status--new' },
    reviewed: { label: 'Reviewed', className: 'hr-status--reviewed' },
    shortlisted: { label: 'Shortlisted', className: 'hr-status--accepted' },
    selected: { label: 'Selected', className: 'hr-status--accepted' },
    rejected: { label: 'Rejected', className: 'hr-status--rejected' },
  };

  return (
    <div className="hr-page">
      <HRNavbar userName={hr.name} />

      <main className="hr-dashboard">
        {/* Welcome */}
        <section className="hr-dashboard__welcome">
          <div>
            <h1 className="hr-dashboard__title">
              Welcome back, <span className="hr-dashboard__name">{hr.name?.split(' ')[0]}</span>
            </h1>
            <p className="hr-dashboard__subtitle">
              Here&apos;s your recruitment overview for {hr.company || 'your company'}.
            </p>
          </div>
          <div className="hr-dashboard__quick-actions">
            <Link to="/hr/jobs" className="hr-btn hr-btn--primary">
              <Briefcase size={18} /> Manage Jobs
            </Link>
            <Link to="/hr/applications" className="hr-btn hr-btn--outline">
              <Users size={18} /> View Applications
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="hr-dashboard__stats">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`sp-stat-card sp-stat-card--${s.color}`}>
                <div className="sp-stat-card__icon-wrap">
                  <Icon size={22} />
                </div>
                <div className="sp-stat-card__info">
                  <span className="sp-stat-card__value">{loading ? '—' : s.value}</span>
                  <span className="sp-stat-card__label">{s.label}</span>
                </div>
              </div>
            );
          })}
        </section>

        <div className="hr-dashboard__grid">
          {/* Active Job Postings */}
          <section className="hr-dashboard__section">
            <div className="hr-dashboard__section-header">
              <h2 className="hr-dashboard__section-title">
                <Briefcase size={20} /> Active Job Postings
              </h2>
              <Link to="/hr/jobs" className="hr-dashboard__see-all">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="hr-dashboard__job-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <Loader size={24} className="hr-jobs__spinner" /> Loading...
                </div>
              ) : activeJobs.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No active job postings yet.</p>
              ) : (
                activeJobs.slice(0, 4).map((job) => (
                  <div key={job._id} className="hr-mini-job-card">
                    <div className="hr-mini-job-card__info">
                      <h4 className="hr-mini-job-card__title">{job.title}</h4>
                      <div className="hr-mini-job-card__meta">
                        <span><MapPin size={13} /> {job.location}</span>
                        <span><Users size={13} /> {job.openings} openings</span>
                        {job.deadline && <span><Clock size={13} /> Deadline: {formatDate(job.deadline)}</span>}
                      </div>
                    </div>
                    <span className={`hr-mini-job-card__type hr-mini-job-card__type--${job.jobType.toLowerCase().replace('-', '')}`}>
                      {job.jobType}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent Applications */}
          <section className="hr-dashboard__section">
            <div className="hr-dashboard__section-header">
              <h2 className="hr-dashboard__section-title">
                <TrendingUp size={20} /> Recent Applications
              </h2>
              <Link to="/hr/applications" className="hr-dashboard__see-all">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="hr-dashboard__app-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <Loader size={24} className="hr-jobs__spinner" /> Loading...
                </div>
              ) : recentApplications.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No applications received yet.</p>
              ) : (
                recentApplications.map((app) => {
                  const st = statusConfig[app.status] || statusConfig.applied;
                  return (
                    <div key={app._id} className="hr-mini-app-card">
                      <div className="hr-mini-app-card__avatar">
                        {(app.student?.name || '?').charAt(0)}
                      </div>
                      <div className="hr-mini-app-card__info">
                        <h4 className="hr-mini-app-card__name">{app.student?.name}</h4>
                        <p className="hr-mini-app-card__job">{app.job?.title}</p>
                      </div>
                      <div className="hr-mini-app-card__right">
                        <span className={`hr-status-badge ${st.className}`}>{st.label}</span>
                        <span className="hr-mini-app-card__date">{formatDate(app.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default HRDashboard;
