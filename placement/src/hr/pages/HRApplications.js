import React, { useState, useEffect } from 'react';
import {
  Search, ChevronDown, Users, Mail, Phone, Calendar, Award,
  Building, Eye, CheckCircle2, XCircle,
  Clock, X, Loader, MapPin, Briefcase, FileText, Download,
} from 'lucide-react';
import HRNavbar from '../components/HRNavbar';
import hrApi from '../services/hrApi';
import './HRApplications.css';

const statusOptions = ['All', 'applied', 'reviewed', 'shortlisted', 'rejected', 'selected'];

const HRApplications = () => {
  const hr = hrApi.getUser() || {};

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [jobFilter, setJobFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await hrApi.getApplications();
        setApplications(data.applications || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Derive job filter options from actual data
  const jobOptions = ['All', ...Array.from(new Set(applications.map((a) => a.job?.title).filter(Boolean)))];

  const filtered = applications
    .filter((a) => {
      const q = search.toLowerCase();
      const name = a.student?.name || '';
      const email = a.student?.email || '';
      const jobTitle = a.job?.title || '';
      const dept = a.student?.department || '';
      const matchSearch =
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        jobTitle.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || a.status === statusFilter;
      const matchJob = jobFilter === 'All' || a.job?.title === jobFilter;
      return matchSearch && matchStatus && matchJob;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name') return (a.student?.name || '').localeCompare(b.student?.name || '');
      return 0;
    });

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const updateStatus = async (appId, newStatus) => {
    try {
      await hrApi.updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a))
      );
      if (selectedApp && selectedApp._id === appId) {
        setSelectedApp((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const statusConfig = {
    applied: { label: 'Applied', className: 'hr-status--new', icon: Clock },
    reviewed: { label: 'Reviewed', className: 'hr-status--reviewed', icon: Eye },
    shortlisted: { label: 'Shortlisted', className: 'hr-status--accepted', icon: CheckCircle2 },
    rejected: { label: 'Rejected', className: 'hr-status--rejected', icon: XCircle },
    selected: { label: 'Selected', className: 'hr-status--accepted', icon: CheckCircle2 },
  };

  const counts = {
    all: applications.length,
    applied: applications.filter((a) => a.status === 'applied').length,
    reviewed: applications.filter((a) => a.status === 'reviewed').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    selected: applications.filter((a) => a.status === 'selected').length,
  };

  return (
    <div className="hr-page">
      <HRNavbar userName={hr.name} />

      <main className="hr-apps">
        {/* Header */}
        <div className="hr-apps__header">
          <div>
            <h1 className="hr-apps__title">Applications</h1>
            <p className="hr-apps__subtitle">
              Review and manage candidate applications — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="hr-apps__tabs">
          {statusOptions.map((s) => {
            const count = s === 'All' ? counts.all : counts[s];
            return (
              <button
                key={s}
                className={`hr-apps__tab ${statusFilter === s ? 'hr-apps__tab--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="hr-apps__tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="hr-apps__filters">
          <div className="hr-jobs__search-wrap">
            <Search size={18} className="hr-jobs__search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, job, department..."
              className="hr-jobs__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="hr-jobs__filter-group">
            <div className="hr-jobs__select-wrap">
              <select
                className="hr-jobs__select"
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
              >
                {jobOptions.map((j) => (
                  <option key={j} value={j}>{j === 'All' ? 'All Jobs' : j}</option>
                ))}
              </select>
              <ChevronDown size={16} className="hr-jobs__select-arrow" />
            </div>
            <div className="hr-jobs__select-wrap">
              <select
                className="hr-jobs__select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
              </select>
              <ChevronDown size={16} className="hr-jobs__select-arrow" />
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading ? (
          <div className="hr-jobs__empty">
            <Loader size={48} className="hr-jobs__spinner" />
            <h3>Loading applications...</h3>
          </div>
        ) : error ? (
          <div className="hr-jobs__empty">
            <XCircle size={48} />
            <h3>Error loading applications</h3>
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="hr-jobs__empty">
            <Users size={48} />
            <h3>No applications found</h3>
            <p>{applications.length === 0 ? 'No students have applied to your jobs yet.' : 'Try adjusting your search or filters.'}</p>
          </div>
        ) : (
          <div className="hr-apps__table-wrap">
            <table className="hr-apps__table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Job Position</th>
                  <th>Department</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const st = statusConfig[app.status] || statusConfig.applied;
                  return (
                    <tr key={app._id}>
                      <td>
                        <div className="hr-apps__applicant">
                          <div className="hr-apps__avatar">{(app.student?.name || '?').charAt(0)}</div>
                          <div>
                            <div className="hr-apps__name">{app.student?.name}</div>
                            <div className="hr-apps__email">{app.student?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="hr-apps__job-title">{app.job?.title}</span></td>
                      <td><span className="hr-apps__dept">{app.student?.department}</span></td>
                      <td><span className="hr-apps__date">{formatDate(app.createdAt)}</span></td>
                      <td><span className={`hr-status-badge ${st.className}`}>{st.label}</span></td>
                      <td>
                        <div className="hr-apps__actions">
                          <button
                            className="hr-apps__action-btn hr-apps__action-btn--view"
                            onClick={() => setSelectedApp(app)}
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                          {app.status !== 'shortlisted' && app.status !== 'selected' && (
                            <button
                              className="hr-apps__action-btn hr-apps__action-btn--accept"
                              onClick={() => updateStatus(app._id, 'shortlisted')}
                              title="Shortlist"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          {app.status !== 'rejected' && (
                            <button
                              className="hr-apps__action-btn hr-apps__action-btn--reject"
                              onClick={() => updateStatus(app._id, 'rejected')}
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className="hr-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="hr-modal hr-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal__header">
              <h2 className="hr-modal__title">Applicant Details</h2>
              <button className="hr-modal__close" onClick={() => setSelectedApp(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="hr-app-detail">
              <div className="hr-app-detail__profile">
                <div className="hr-app-detail__avatar">
                  {(selectedApp.student?.name || '?').charAt(0)}
                </div>
                <div className="hr-app-detail__info">
                  <h3 className="hr-app-detail__name">{selectedApp.student?.name}</h3>
                  <p className="hr-app-detail__role">Applied for <strong>{selectedApp.job?.title}</strong></p>
                  <span className={`hr-status-badge ${(statusConfig[selectedApp.status] || statusConfig.applied).className}`}>
                    {(statusConfig[selectedApp.status] || statusConfig.applied).label}
                  </span>
                </div>
              </div>

              <div className="hr-app-detail__grid">
                <div className="hr-app-detail__item">
                  <Mail size={16} />
                  <div>
                    <span className="hr-app-detail__label">Email</span>
                    <span className="hr-app-detail__value">{selectedApp.student?.email}</span>
                  </div>
                </div>
                <div className="hr-app-detail__item">
                  <Phone size={16} />
                  <div>
                    <span className="hr-app-detail__label">Phone</span>
                    <span className="hr-app-detail__value">{selectedApp.student?.phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="hr-app-detail__item">
                  <Award size={16} />
                  <div>
                    <span className="hr-app-detail__label">Roll Number</span>
                    <span className="hr-app-detail__value">{selectedApp.student?.rollNumber || 'N/A'}</span>
                  </div>
                </div>
                <div className="hr-app-detail__item">
                  <Building size={16} />
                  <div>
                    <span className="hr-app-detail__label">Department</span>
                    <span className="hr-app-detail__value">{selectedApp.student?.department}</span>
                  </div>
                </div>
                <div className="hr-app-detail__item">
                  <Calendar size={16} />
                  <div>
                    <span className="hr-app-detail__label">Graduation Year</span>
                    <span className="hr-app-detail__value">{selectedApp.student?.graduationYear || 'N/A'}</span>
                  </div>
                </div>
                {selectedApp.collegeMail && (
                  <div className="hr-app-detail__item">
                    <Mail size={16} />
                    <div>
                      <span className="hr-app-detail__label">College Mail</span>
                      <span className="hr-app-detail__value">{selectedApp.collegeMail}</span>
                    </div>
                  </div>
                )}
                {selectedApp.location && (
                  <div className="hr-app-detail__item">
                    <MapPin size={16} />
                    <div>
                      <span className="hr-app-detail__label">Location</span>
                      <span className="hr-app-detail__value">{selectedApp.location}</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedApp.workExperience && (
                <div className="hr-app-detail__section">
                  <h4 className="hr-app-detail__section-title"><Briefcase size={16} /> Work Experience</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedApp.workExperience}</p>
                </div>
              )}

              {selectedApp.resumePath && (
                <div className="hr-app-detail__section">
                  <h4 className="hr-app-detail__section-title"><FileText size={16} /> Resume</h4>
                  <a
                    href={`http://localhost:5000${selectedApp.resumePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hr-btn hr-btn--outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    <Download size={16} /> Download Resume
                  </a>
                </div>
              )}

              <div className="hr-app-detail__actions">
                {selectedApp.status === 'applied' && (
                  <button
                    className="hr-btn hr-btn--outline"
                    onClick={() => updateStatus(selectedApp._id, 'reviewed')}
                  >
                    <Eye size={16} /> Mark Reviewed
                  </button>
                )}
                {selectedApp.status !== 'shortlisted' && selectedApp.status !== 'selected' && (
                  <button
                    className="hr-btn hr-btn--success"
                    onClick={() => updateStatus(selectedApp._id, 'shortlisted')}
                  >
                    <CheckCircle2 size={16} /> Shortlist
                  </button>
                )}
                {selectedApp.status === 'shortlisted' && (
                  <button
                    className="hr-btn hr-btn--success"
                    onClick={() => updateStatus(selectedApp._id, 'selected')}
                  >
                    <CheckCircle2 size={16} /> Select
                  </button>
                )}
                {selectedApp.status !== 'rejected' && (
                  <button
                    className="hr-btn hr-btn--danger"
                    onClick={() => updateStatus(selectedApp._id, 'rejected')}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRApplications;
