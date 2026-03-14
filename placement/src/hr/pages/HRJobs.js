import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, MapPin, Clock, Edit3, Archive,
  X, Briefcase, ChevronDown, Eye, Loader,
} from 'lucide-react';
import HRNavbar from '../components/HRNavbar';
import hrApi from '../services/hrApi';
import './HRJobs.css';

const jobTypes = ['All', 'Full-Time', 'Internship', 'Contract', 'Part-Time'];
const statusFilters = ['All', 'active', 'closed', 'archived'];

const HRJobs = () => {
  const hr = hrApi.getUser() || {};

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  const [newJob, setNewJob] = useState({
    title: '', description: '', requirements: '', skills: '',
    jobType: 'Full-Time', location: '', salary: '',
    department: '', openings: 1, deadline: '',
  });

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await hrApi.getMyJobs();
      setJobs(data.jobs);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filtered = jobs.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      (j.department || '').toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || j.jobType === typeFilter;
    const matchStatus = statusFilter === 'All' || j.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newJob,
        requirements: newJob.requirements.split(',').map((r) => r.trim()).filter(Boolean),
        skills: newJob.skills.split(',').map((s) => s.trim()).filter(Boolean),
        openings: Number(newJob.openings),
        deadline: newJob.deadline || undefined,
      };
      await hrApi.createJob(payload);
      setNewJob({
        title: '', description: '', requirements: '', skills: '',
        jobType: 'Full-Time', location: '', salary: '',
        department: '', openings: 1, deadline: '',
      });
      setShowCreateModal(false);
      fetchJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditJob = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: editingJob.title,
        description: editingJob.description,
        jobType: editingJob.jobType,
        location: editingJob.location,
        salary: editingJob.salary,
        department: editingJob.department,
        openings: Number(editingJob.openings),
        status: editingJob.status,
        requirements: typeof editingJob.requirements === 'string'
          ? editingJob.requirements.split(',').map((r) => r.trim()).filter(Boolean)
          : editingJob.requirements,
        skills: typeof editingJob.skills === 'string'
          ? editingJob.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : editingJob.skills,
      };
      await hrApi.updateJob(editingJob._id, payload);
      setEditingJob(null);
      fetchJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleArchiveJob = async (jobId) => {
    try {
      await hrApi.archiveJob(jobId);
      fetchJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  const statusConfig = {
    active: { label: 'Active', className: 'hr-status--accepted' },
    closed: { label: 'Closed', className: 'hr-status--rejected' },
    archived: { label: 'Archived', className: 'hr-status--reviewed' },
  };

  return (
    <div className="hr-page">
      <HRNavbar userName={hr.name} />

      <main className="hr-jobs">
        {/* Header */}
        <div className="hr-jobs__header">
          <div>
            <h1 className="hr-jobs__title">Job Postings</h1>
            <p className="hr-jobs__subtitle">
              Manage your job openings — {filtered.length} posting{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <button className="hr-btn hr-btn--primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Create Job
          </button>
        </div>

        {/* Filters */}
        <div className="hr-jobs__filters">
          <div className="hr-jobs__search-wrap">
            <Search size={18} className="hr-jobs__search-icon" />
            <input
              type="text"
              placeholder="Search jobs by title, department, location..."
              className="hr-jobs__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="hr-jobs__filter-group">
            <div className="hr-jobs__select-wrap">
              <select
                className="hr-jobs__select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {jobTypes.map((t) => (
                  <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
                ))}
              </select>
              <ChevronDown size={16} className="hr-jobs__select-arrow" />
            </div>
            <div className="hr-jobs__select-wrap">
              <select
                className="hr-jobs__select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusFilters.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="hr-jobs__select-arrow" />
            </div>
          </div>
        </div>

        {/* Job Cards */}
        {error && (
          <div className="hr-jobs__error" style={{ color: '#ef4444', background: 'rgba(239,68,68,.08)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="hr-jobs__empty">
            <Loader size={36} className="spin" />
            <h3>Loading jobs…</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="hr-jobs__empty">
            <Briefcase size={48} />
            <h3>No job postings found</h3>
            <p>Try adjusting your search or filters, or create a new job posting.</p>
          </div>
        ) : (
          <div className="hr-jobs__grid">
            {filtered.map((job) => {
              const st = statusConfig[job.status] || statusConfig.active;
              return (
                <div key={job._id} className="hr-job-card">
                  <div className="hr-job-card__top">
                    <div className="hr-job-card__title-row">
                      <h3 className="hr-job-card__title">{job.title}</h3>
                      <span className={`hr-status-badge ${st.className}`}>{st.label}</span>
                    </div>
                    <span className={`hr-mini-job-card__type hr-mini-job-card__type--${job.jobType.toLowerCase().replace('-', '')}`}>
                      {job.jobType}
                    </span>
                  </div>

                  <p className="hr-job-card__desc">{job.description.substring(0, 120)}...</p>

                  <div className="hr-job-card__meta">
                    <span><MapPin size={14} /> {job.location}</span>
                    <span><Briefcase size={14} /> {job.openings} openings</span>
                    {job.deadline && <span><Clock size={14} /> {formatDate(job.deadline)}</span>}
                  </div>

                  {job.skills.length > 0 && (
                    <div className="hr-job-card__skills">
                      {job.skills.slice(0, 4).map((skill) => (
                        <span key={skill} className="hr-job-card__skill">{skill}</span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="hr-job-card__skill hr-job-card__skill--more">
                          +{job.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="hr-job-card__salary">{job.salary}</div>

                  <div className="hr-job-card__actions">
                    <button
                      className="hr-btn hr-btn--outline hr-btn--sm"
                      onClick={() => setShowDetailModal(job)}
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      className="hr-btn hr-btn--outline hr-btn--sm"
                      onClick={() =>
                        setEditingJob({
                          ...job,
                          requirements: (job.requirements || []).join(', '),
                          skills: (job.skills || []).join(', '),
                        })
                      }
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      className="hr-btn hr-btn--outline hr-btn--sm"
                      onClick={() => handleArchiveJob(job._id)}
                    >
                      <Archive size={14} /> {job.status === 'archived' ? 'Restore' : 'Archive'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="hr-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal__header">
              <h2 className="hr-modal__title">Create New Job Posting</h2>
              <button className="hr-modal__close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form className="hr-modal__form" onSubmit={handleCreateJob}>
              <div className="hr-modal__grid">
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Job Title *</label>
                  <input
                    className="hr-modal__input"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g. Full Stack Developer"
                    required
                  />
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Job Type *</label>
                  <select
                    className="hr-modal__input"
                    value={newJob.jobType}
                    onChange={(e) => setNewJob({ ...newJob, jobType: e.target.value })}
                    required
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-Time">Part-Time</option>
                  </select>
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Location *</label>
                  <input
                    className="hr-modal__input"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="e.g. Bangalore"
                    required
                  />
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Salary / Package</label>
                  <input
                    className="hr-modal__input"
                    value={newJob.salary}
                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    placeholder="e.g. ₹8-12 LPA"
                  />
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Department</label>
                  <input
                    className="hr-modal__input"
                    value={newJob.department}
                    onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                    placeholder="e.g. Engineering"
                  />
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Openings</label>
                  <input
                    type="number"
                    min="1"
                    className="hr-modal__input"
                    value={newJob.openings}
                    onChange={(e) => setNewJob({ ...newJob, openings: e.target.value })}
                  />
                </div>
              </div>

              <div className="hr-modal__field">
                <label className="hr-modal__label">Description *</label>
                <textarea
                  className="hr-modal__textarea"
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Describe the role, responsibilities, and what makes it exciting..."
                  rows={4}
                  required
                />
              </div>

              <div className="hr-modal__field">
                <label className="hr-modal__label">Requirements (comma-separated)</label>
                <input
                  className="hr-modal__input"
                  value={newJob.requirements}
                  onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                  placeholder="e.g. B.Tech in CS, 1+ years experience, Team player"
                />
              </div>

              <div className="hr-modal__field">
                <label className="hr-modal__label">Skills (comma-separated)</label>
                <input
                  className="hr-modal__input"
                  value={newJob.skills}
                  onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })}
                  placeholder="e.g. React, Node.js, MongoDB"
                />
              </div>

              <div className="hr-modal__field">
                <label className="hr-modal__label">Application Deadline</label>
                <input
                  type="date"
                  className="hr-modal__input"
                  value={newJob.deadline}
                  onChange={(e) => setNewJob({ ...newJob, deadline: e.target.value })}
                />
              </div>

              <div className="hr-modal__actions">
                <button type="button" className="hr-btn hr-btn--outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="hr-btn hr-btn--primary">
                  <Plus size={16} /> Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingJob && (
        <div className="hr-modal-overlay" onClick={() => setEditingJob(null)}>
          <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal__header">
              <h2 className="hr-modal__title">Edit Job Posting</h2>
              <button className="hr-modal__close" onClick={() => setEditingJob(null)}>
                <X size={20} />
              </button>
            </div>
            <form className="hr-modal__form" onSubmit={handleEditJob}>
              <div className="hr-modal__grid">
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Job Title *</label>
                  <input
                    className="hr-modal__input"
                    value={editingJob.title}
                    onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                    required
                  />
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Job Type *</label>
                  <select
                    className="hr-modal__input"
                    value={editingJob.jobType}
                    onChange={(e) => setEditingJob({ ...editingJob, jobType: e.target.value })}
                    required
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                    <option value="Part-Time">Part-Time</option>
                  </select>
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Location *</label>
                  <input
                    className="hr-modal__input"
                    value={editingJob.location}
                    onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                    required
                  />
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Salary / Package</label>
                  <input
                    className="hr-modal__input"
                    value={editingJob.salary}
                    onChange={(e) => setEditingJob({ ...editingJob, salary: e.target.value })}
                  />
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Department</label>
                  <input
                    className="hr-modal__input"
                    value={editingJob.department}
                    onChange={(e) => setEditingJob({ ...editingJob, department: e.target.value })}
                  />
                </div>
                <div className="hr-modal__field">
                  <label className="hr-modal__label">Openings</label>
                  <input
                    type="number"
                    min="1"
                    className="hr-modal__input"
                    value={editingJob.openings}
                    onChange={(e) => setEditingJob({ ...editingJob, openings: e.target.value })}
                  />
                </div>
              </div>

              <div className="hr-modal__field">
                <label className="hr-modal__label">Description *</label>
                <textarea
                  className="hr-modal__textarea"
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="hr-modal__field">
                <label className="hr-modal__label">Requirements (comma-separated)</label>
                <input
                  className="hr-modal__input"
                  value={editingJob.requirements}
                  onChange={(e) => setEditingJob({ ...editingJob, requirements: e.target.value })}
                />
              </div>

              <div className="hr-modal__field">
                <label className="hr-modal__label">Skills (comma-separated)</label>
                <input
                  className="hr-modal__input"
                  value={editingJob.skills}
                  onChange={(e) => setEditingJob({ ...editingJob, skills: e.target.value })}
                />
              </div>

              <div className="hr-modal__field">
                <label className="hr-modal__label">Status</label>
                <select
                  className="hr-modal__input"
                  value={editingJob.status}
                  onChange={(e) => setEditingJob({ ...editingJob, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="hr-modal__actions">
                <button type="button" className="hr-btn hr-btn--outline" onClick={() => setEditingJob(null)}>
                  Cancel
                </button>
                <button type="submit" className="hr-btn hr-btn--primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="hr-modal-overlay" onClick={() => setShowDetailModal(null)}>
          <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal__header">
              <h2 className="hr-modal__title">{showDetailModal.title}</h2>
              <button className="hr-modal__close" onClick={() => setShowDetailModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="hr-modal__detail">
              <div className="hr-modal__detail-row">
                <span className={`hr-status-badge ${(statusConfig[showDetailModal.status] || statusConfig.active).className}`}>
                  {(statusConfig[showDetailModal.status] || statusConfig.active).label}
                </span>
                <span className={`hr-mini-job-card__type hr-mini-job-card__type--${showDetailModal.jobType.toLowerCase().replace('-', '')}`}>
                  {showDetailModal.jobType}
                </span>
              </div>

              <div className="hr-modal__detail-meta">
                <span><MapPin size={14} /> {showDetailModal.location}</span>
                <span><Briefcase size={14} /> {showDetailModal.openings} openings</span>
                {showDetailModal.deadline && <span><Clock size={14} /> Deadline: {formatDate(showDetailModal.deadline)}</span>}
              </div>

              <div className="hr-modal__detail-salary">{showDetailModal.salary}</div>

              <h4 className="hr-modal__detail-heading">Description</h4>
              <p className="hr-modal__detail-text">{showDetailModal.description}</p>

              {showDetailModal.requirements.length > 0 && (
                <>
                  <h4 className="hr-modal__detail-heading">Requirements</h4>
                  <ul className="hr-modal__detail-list">
                    {showDetailModal.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </>
              )}

              {showDetailModal.skills.length > 0 && (
                <>
                  <h4 className="hr-modal__detail-heading">Skills</h4>
                  <div className="hr-job-card__skills">
                    {showDetailModal.skills.map((s) => (
                      <span key={s} className="hr-job-card__skill">{s}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRJobs;
