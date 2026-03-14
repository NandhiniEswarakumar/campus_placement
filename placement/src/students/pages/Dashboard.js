import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Dashboard.css';

const roundStatusMeta = {
  pending: { label: 'Pending', className: 'sp-pill--warning' },
  scheduled: { label: 'Scheduled', className: 'sp-pill--primary' },
  passed: { label: 'Passed', className: 'sp-pill--success' },
  failed: { label: 'Failed', className: 'sp-pill--danger' },
  completed: { label: 'Completed', className: 'sp-pill--info' },
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return formatDate(dateStr);
}

function getCompanyLabel(application) {
  const companies = application.drive?.companies || [];
  return companies.length > 0 ? companies.join(', ') : application.drive?.title || 'Placement Drive';
}

const Dashboard = () => {
  const student = api.getStudent() || {};

  const [jobs, setJobs] = useState([]);
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [driveApplications, setDriveApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const [jobData, driveData, appData, driveAppData, notificationData] = await Promise.all([
          api.getJobs().catch(() => ({ jobs: [] })),
          api.getDrives().catch(() => ({ drives: [] })),
          api.getMyApplications().catch(() => ({ applications: [] })),
          api.getMyDriveApplications().catch(() => ({ applications: [] })),
          api.getNotifications().catch(() => ({ notifications: [] })),
        ]);

        if (!isMounted) return;

        setJobs(jobData.jobs || []);
        setDrives(driveData.drives || []);
        setApplications(appData.applications || []);
        setDriveApplications(driveAppData.applications || []);
        setNotifications(notificationData.notifications || []);
      } catch {
        // ignore fetch failures and keep dashboard resilient
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const streamUrl = api.getNotificationStreamUrl();
    if (!streamUrl) return undefined;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== 'notification') return;

        setNotifications((previous) => {
          const existing = previous.some((item) => item._id === payload.notification._id);
          if (existing) return previous;
          return [payload.notification, ...previous].slice(0, 12);
        });

        const [jobData, driveData, driveAppData, notificationData] = await Promise.all([
          api.getJobs().catch(() => ({ jobs: [] })),
          api.getDrives().catch(() => ({ drives: [] })),
          api.getMyDriveApplications().catch(() => ({ applications: [] })),
          api.getNotifications().catch(() => ({ notifications: [] })),
        ]);

        setJobs(jobData.jobs || []);
        setDrives(driveData.drives || []);
        setDriveApplications(driveAppData.applications || []);
        setNotifications(notificationData.notifications || []);
      } catch {
        // ignore malformed SSE payloads or transient refresh failures
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const upcomingDrives = useMemo(() => (
    drives
      .filter((drive) => drive.status === 'upcoming')
      .sort((left, right) => new Date(left.date) - new Date(right.date))
      .slice(0, 4)
  ), [drives]);

  const recentJobs = useMemo(() => (
    [...jobs]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, 3)
  ), [jobs]);

  const liveApplications = useMemo(() => (
    [...driveApplications]
      .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
      .slice(0, 3)
  ), [driveApplications]);

  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const stats = [
    { label: 'Upcoming Drives', value: upcomingDrives.length, icon: CalendarDays, color: 'blue' },
    { label: 'Available Jobs', value: jobs.length, icon: Briefcase, color: 'emerald' },
    { label: 'Applications Sent', value: applications.length + driveApplications.length, icon: FileText, color: 'violet' },
    { label: 'Unread Alerts', value: unreadNotifications, icon: Bell, color: 'amber' },
  ];

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
    } catch {
      // ignore mark-read failures
    }
  };

  return (
    <div className="sp-dashboard-page">
      <Navbar studentName={student.name} />

      <main className="sp-dashboard">
        <section className="sp-dashboard__welcome">
          <div>
            <h1 className="sp-dashboard__title">
              Welcome back, <span className="sp-dashboard__name">{student.name?.split(' ')[0] || 'Student'}</span>
            </h1>
            <p className="sp-dashboard__subtitle">
              Follow your application rounds and new opportunities in one place.
            </p>
          </div>
          <div className="sp-dashboard__quick-actions">
            <Link to="/students/companies" className="sp-dash-btn sp-dash-btn--primary">
              <Building2 size={18} /> View Companies
            </Link>
            <Link to="/students/jobs" className="sp-dash-btn sp-dash-btn--outline">
              <Briefcase size={18} /> Browse Jobs
            </Link>
          </div>
        </section>

        <section className="sp-dashboard__stats">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`sp-stat-card sp-stat-card--${item.color}`}>
                <div className="sp-stat-card__icon-wrap">
                  <Icon size={22} />
                </div>
                <div className="sp-stat-card__info">
                  <span className="sp-stat-card__value">{loading ? '—' : item.value}</span>
                  <span className="sp-stat-card__label">{item.label}</span>
                </div>
              </div>
            );
          })}
        </section>

        <div className="sp-dashboard__grid">
          <section className="sp-dashboard__section sp-dashboard__section--highlight">
            <div className="sp-dashboard__section-header">
              <h2 className="sp-dashboard__section-title">
                <FileText size={20} /> Application Status
              </h2>
              <Link to="/students/drive-applications" className="sp-dashboard__see-all">
                View drives <ArrowRight size={14} />
              </Link>
            </div>

            <div className="sp-dashboard__status-list">
              {loading ? (
                <div className="sp-dashboard__loading-state">
                  <Loader size={24} className="spin" /> Loading...
                </div>
              ) : liveApplications.length === 0 ? (
                <p className="sp-dashboard__empty-state">No drive applications yet. Apply to a company drive to track interview rounds here.</p>
              ) : (
                liveApplications.map((application) => {
                  const roundMeta = roundStatusMeta[application.currentRoundStatus] || roundStatusMeta.pending;

                  return (
                    <article key={application._id} className="sp-status-card">
                      <div className="sp-status-card__top">
                        <div>
                          <p className="sp-status-card__label">Company</p>
                          <h3 className="sp-status-card__company">{getCompanyLabel(application)}</h3>
                        </div>
                        <span className={`sp-pill ${roundMeta.className}`}>{roundMeta.label}</span>
                      </div>

                      <div className="sp-status-card__body">
                        <div>
                          <p className="sp-status-card__label">Current Round</p>
                          <p className="sp-status-card__value">{application.currentRound || 'Aptitude Test'}</p>
                        </div>
                        <div>
                          <p className="sp-status-card__label">Drive</p>
                          <p className="sp-status-card__value">{application.drive?.title || 'Placement Drive'}</p>
                        </div>
                      </div>

                      {application.status === 'selected' && (
                        <div className="sp-notification sp-notification--unread" style={{ marginTop: '0.9rem' }}>
                          <div className="sp-notification__icon">
                            <CheckCircle2 size={16} />
                          </div>
                          <div className="sp-notification__content">
                            <p className="sp-notification__message">Congratulations! You are selected for {getCompanyLabel(application)}.</p>
                            <span className="sp-notification__time">Open My Drives to submit your round remark, feedback, and suggestions.</span>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="sp-dashboard__section">
            <div className="sp-dashboard__section-header">
              <h2 className="sp-dashboard__section-title">
                <Bell size={20} /> Notifications
              </h2>
              {unreadNotifications > 0 && (
                <button className="sp-dashboard__mark-read" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            <div className="sp-dashboard__notification-list">
              {loading ? (
                <div className="sp-dashboard__loading-state">
                  <Loader size={24} className="spin" /> Loading...
                </div>
              ) : notifications.length === 0 ? (
                <p className="sp-dashboard__empty-state">No notifications yet.</p>
              ) : (
                notifications.slice(0, 6).map((notification) => (
                  <article key={notification._id} className={`sp-notification ${notification.read ? '' : 'sp-notification--unread'}`}>
                    <div className="sp-notification__icon">
                      <Bell size={16} />
                    </div>
                    <div className="sp-notification__content">
                      <p className="sp-notification__message">{notification.message}</p>
                      <span className="sp-notification__time">{formatRelativeTime(notification.createdAt)}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="sp-dashboard__section">
            <div className="sp-dashboard__section-header">
              <h2 className="sp-dashboard__section-title">
                <CalendarDays size={20} /> Upcoming Campus Drives
              </h2>
              <Link to="/students/companies" className="sp-dashboard__see-all">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="sp-dashboard__company-list">
              {loading ? (
                <div className="sp-dashboard__loading-state">
                  <Loader size={24} className="spin" /> Loading...
                </div>
              ) : upcomingDrives.length === 0 ? (
                <p className="sp-dashboard__empty-state">No upcoming drives scheduled.</p>
              ) : (
                upcomingDrives.map((drive) => (
                  <div key={drive._id} className="sp-mini-company-card">
                    <div className="sp-mini-company-card__logo">{(drive.title || '?')[0]}</div>
                    <div className="sp-mini-company-card__info">
                      <h4 className="sp-mini-company-card__name">{drive.title}</h4>
                      <div className="sp-mini-company-card__meta">
                        <span><Clock size={13} /> {formatDate(drive.date)}</span>
                        <span><Briefcase size={13} /> {drive.companies?.length || 0} companies</span>
                      </div>
                      <span className="sp-mini-company-card__package">{drive.venue || 'Venue to be announced'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="sp-dashboard__section">
            <div className="sp-dashboard__section-header">
              <h2 className="sp-dashboard__section-title">
                <TrendingUp size={20} /> Recent Job Postings
              </h2>
              <Link to="/students/jobs" className="sp-dashboard__see-all">
                See all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="sp-dashboard__job-list">
              {loading ? (
                <div className="sp-dashboard__loading-state">
                  <Loader size={24} className="spin" /> Loading...
                </div>
              ) : recentJobs.length === 0 ? (
                <p className="sp-dashboard__empty-state">No jobs posted yet.</p>
              ) : (
                recentJobs.map((job) => (
                  <div key={job._id} className="sp-mini-job-card">
                    <div className="sp-mini-job-card__logo">{(job.company || '?')[0]}</div>
                    <div className="sp-mini-job-card__info">
                      <h4 className="sp-mini-job-card__title">{job.title}</h4>
                      <p className="sp-mini-job-card__company">{job.company}</p>
                      <div className="sp-mini-job-card__meta">
                        <span><MapPin size={13} /> {job.location}</span>
                        <span className="sp-mini-job-card__salary">{job.salary || 'Not disclosed'}</span>
                      </div>
                    </div>
                    <span className={`sp-mini-job-card__type sp-mini-job-card__type--${job.jobType.toLowerCase().replace('-', '')}`}>
                      {job.jobType}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
