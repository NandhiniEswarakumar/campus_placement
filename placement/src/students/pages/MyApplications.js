import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ChevronDown, Briefcase, Clock, CheckCircle2,
  XCircle, Eye, AlertCircle, Loader, Calendar,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './MyApplications.css';

const statusConfig = {
  applied:     { label: 'Applied',     className: 'sp-app-status--applied',     icon: Clock,        message: 'Your application has been submitted successfully. Hang tight while the recruiter reviews it!' },
  reviewed:    { label: 'Reviewed',    className: 'sp-app-status--reviewed',    icon: Eye,          message: 'Great news! The recruiter has reviewed your application. Stay tuned for the next update.' },
  shortlisted: { label: 'Shortlisted', className: 'sp-app-status--shortlisted', icon: CheckCircle2, message: 'Congratulations! You have been shortlisted. Please check your email for further instructions and be ready for the next round.' },
  rejected:    { label: 'Rejected',    className: 'sp-app-status--rejected',    icon: XCircle,      message: 'Unfortunately, your application was not selected this time. Don\'t lose heart — better opportunities are ahead. Keep applying!' },
  selected:    { label: 'Selected',    className: 'sp-app-status--selected',    icon: CheckCircle2, message: 'You\'ve been selected! Congratulations on this achievement. The HR team will reach out to you shortly with the offer details.' },
};

const MyApplications = () => {
  const student = api.getStudent() || {};

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await api.getMyApplications();
        setApplications(data.applications || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const statusOptions = ['All', 'applied', 'reviewed', 'shortlisted', 'rejected', 'selected'];

  const counts = useMemo(() => {
    const c = { all: applications.length };
    statusOptions.slice(1).forEach((s) => {
      c[s] = applications.filter((a) => a.status === s).length;
    });
    return c;
  }, [applications]);

  const filtered = useMemo(() => {
    let result = [...applications];

    if (statusFilter !== 'All') result = result.filter((a) => a.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          (a.job?.title || '').toLowerCase().includes(q) ||
          (a.job?.company || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === 'company') result.sort((a, b) => (a.job?.company || '').localeCompare(b.job?.company || ''));

    return result;
  }, [applications, statusFilter, search, sortBy]);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="sp-apps-page">
      <Navbar studentName={student.name} />

      <main className="sp-apps">
        <div className="sp-apps__header">
          <h1 className="sp-apps__title">My Applications</h1>
          <p className="sp-apps__subtitle">Track the status of your job applications</p>
        </div>

        {/* Status Tabs */}
        <div className="sp-apps__tabs">
          {statusOptions.map((s) => {
            const count = s === 'All' ? counts.all : counts[s];
            return (
              <button
                key={s}
                className={`sp-apps__tab ${statusFilter === s ? 'sp-apps__tab--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="sp-apps__tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="sp-apps__filters">
          <div className="sp-apps__search-wrap">
            <Search size={18} className="sp-apps__search-icon" />
            <input
              type="text"
              placeholder="Search by job title or company..."
              className="sp-apps__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sp-apps__sort-wrap">
            <select
              className="sp-apps__sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="company">Company A-Z</option>
            </select>
            <ChevronDown size={16} className="sp-apps__sort-arrow" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="sp-apps__empty">
            <Loader size={48} className="spin" />
            <h3>Loading applications…</h3>
          </div>
        ) : error ? (
          <div className="sp-apps__empty">
            <AlertCircle size={48} />
            <h3>Error loading applications</h3>
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sp-apps__empty">
            <Briefcase size={48} />
            <h3>No applications found</h3>
            <p>{applications.length === 0 ? 'You haven\'t applied to any jobs yet.' : 'Try adjusting your filters.'}</p>
          </div>
        ) : (
          <div className="sp-apps__list">
            {filtered.map((app) => {
              const st = statusConfig[app.status] || statusConfig.applied;
              const StIcon = st.icon;
              return (
                <div
                  key={app._id}
                  className="sp-app-card"
                  onClick={() => setSelectedApp(app)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedApp(app)}
                >
                  <div className="sp-app-card__logo">
                    {(app.job?.company || '?')[0]}
                  </div>
                  <div className="sp-app-card__info">
                    <h3 className="sp-app-card__title">{app.job?.title}</h3>
                    <p className="sp-app-card__company">{app.job?.company}</p>
                    <div className="sp-app-card__meta">
                      <span><Calendar size={13} /> Applied {formatDate(app.createdAt)}</span>
                      {app.job?.location && <span><Briefcase size={13} /> {app.job.location}</span>}
                    </div>
                  </div>
                  <div className="sp-app-card__right">
                    <span className={`sp-app-status ${st.className}`}>
                      <StIcon size={14} /> {st.label}
                    </span>
                    <p className={`sp-app-card__message ${st.className}`}>{st.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedApp && (
        <div className="sp-app-modal__overlay" onClick={() => setSelectedApp(null)}>
          <div className="sp-app-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sp-app-modal__close" onClick={() => setSelectedApp(null)}>
              <XCircle size={20} />
            </button>
            <div className="sp-app-modal__header">
              <div className="sp-app-modal__logo">
                {(selectedApp.job?.company || '?')[0]}
              </div>
              <div>
                <h2 className="sp-app-modal__title">{selectedApp.job?.title}</h2>
                <p className="sp-app-modal__company">{selectedApp.job?.company}</p>
              </div>
            </div>

            <div className="sp-app-modal__status-bar">
              {Object.entries(statusConfig).map(([key, cfg]) => {
                const reached = getStatusOrder(selectedApp.status) >= getStatusOrder(key);
                const isCurrent = selectedApp.status === key;
                return (
                  <div
                    key={key}
                    className={`sp-app-modal__step ${reached ? 'sp-app-modal__step--reached' : ''} ${isCurrent ? 'sp-app-modal__step--current' : ''}`}
                  >
                    <cfg.icon size={16} />
                    <span>{cfg.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Status message banner */}
            {(() => {
              const st = statusConfig[selectedApp.status] || statusConfig.applied;
              return (
                <div className={`sp-app-modal__message ${st.className}`}>
                  <st.icon size={18} />
                  <p>{st.message}</p>
                </div>
              );
            })()}

            <div className="sp-app-modal__details">
              <div className="sp-app-modal__detail">
                <span className="sp-app-modal__label">Applied On</span>
                <span className="sp-app-modal__value">{formatDate(selectedApp.createdAt)}</span>
              </div>
              {selectedApp.job?.location && (
                <div className="sp-app-modal__detail">
                  <span className="sp-app-modal__label">Location</span>
                  <span className="sp-app-modal__value">{selectedApp.job.location}</span>
                </div>
              )}
              {selectedApp.job?.salary && (
                <div className="sp-app-modal__detail">
                  <span className="sp-app-modal__label">Salary</span>
                  <span className="sp-app-modal__value">{selectedApp.job.salary}</span>
                </div>
              )}
              {selectedApp.job?.jobType && (
                <div className="sp-app-modal__detail">
                  <span className="sp-app-modal__label">Job Type</span>
                  <span className="sp-app-modal__value">{selectedApp.job.jobType}</span>
                </div>
              )}
              {selectedApp.coverLetter && (
                <div className="sp-app-modal__detail sp-app-modal__detail--full">
                  <span className="sp-app-modal__label">Cover Letter</span>
                  <p className="sp-app-modal__value">{selectedApp.coverLetter}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getStatusOrder(status) {
  const order = { applied: 0, reviewed: 1, shortlisted: 2, selected: 3, rejected: -1 };
  return order[status] ?? -2;
}

export default MyApplications;
