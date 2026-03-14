import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Filter, MapPin, Briefcase, DollarSign,
  Clock, ChevronDown, X, Calendar, Tag, CheckCircle2,
  ExternalLink, Loader, Upload, User, Mail,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('deadline');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [applying, setApplying] = useState(null);
  const [applyJob, setApplyJob] = useState(null);
  const [applyForm, setApplyForm] = useState({ name: '', collegeMail: '', location: '', workExperience: '', resume: null });
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [jobData, appData] = await Promise.all([
          api.getJobs(),
          api.getMyApplications().catch(() => ({ applications: [] })),
        ]);
        setJobs(jobData.jobs);
        const appliedIds = new Set((appData.applications || []).map((a) => a.job?._id || a.job));
        setAppliedJobs(appliedIds);
        setFetchError('');
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const companies = useMemo(() => [...new Set(jobs.map((j) => j.company))], [jobs]);
  const jobTypes = useMemo(() => [...new Set(jobs.map((j) => j.jobType))], [jobs]);
  const locations = useMemo(() => [...new Set(jobs.map((j) => j.location))], [jobs]);

  const filtered = useMemo(() => {
    let result = [...jobs];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }

    if (companyFilter) result = result.filter((j) => j.company === companyFilter);
    if (typeFilter) result = result.filter((j) => j.jobType === typeFilter);
    if (locationFilter) result = result.filter((j) => j.location === locationFilter);

    if (sortBy === 'deadline') {
      result.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
    } else if (sortBy === 'posted') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'company') {
      result.sort((a, b) => a.company.localeCompare(b.company));
    }

    return result;
  }, [jobs, search, companyFilter, typeFilter, locationFilter, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setCompanyFilter('');
    setTypeFilter('');
    setLocationFilter('');
    setSortBy('deadline');
  };

  const hasFilters = search || companyFilter || typeFilter || locationFilter;

  const handleApply = async (jobId) => {
    try {
      setApplying(jobId);
      setApplyError('');
      const formData = new FormData();
      formData.append('jobId', jobId);
      formData.append('name', applyForm.name);
      formData.append('collegeMail', applyForm.collegeMail);
      formData.append('location', applyForm.location);
      formData.append('workExperience', applyForm.workExperience);
      if (applyForm.resume) formData.append('resume', applyForm.resume);
      await api.applyToJob(formData);
      setAppliedJobs((prev) => new Set([...prev, jobId]));
      setApplyJob(null);
      setApplyForm({ name: '', collegeMail: '', location: '', workExperience: '', resume: null });
    } catch (err) {
      setApplyError(err.message || 'Failed to apply');
    } finally {
      setApplying(null);
    }
  };

  const openApplyForm = (job) => {
    const student = api.getStudent();
    setApplyForm({ name: student?.name || '', collegeMail: student?.email || '', location: '', workExperience: '', resume: null });
    setApplyError('');
    setApplyJob(job);
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const daysLeft = (dateStr) => {
    const deadline = new Date(dateStr);
    const today = new Date();
    // Compare dates only (ignore time) so the job stays open through the deadline day
    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Expired';
    if (diff === 0) return 'Last day';
    if (diff === 1) return '1 day left';
    return `${diff} days left`;
  };

  return (
    <div className="sp-jobs-page">
      <Navbar studentName={api.getStudent()?.name || 'Student'} />

      <main className="sp-jobs">
        {/* Header */}
        <div className="sp-jobs__header">
          <div>
            <h1 className="sp-jobs__title">Job Postings</h1>
            <p className="sp-jobs__subtitle">
              {jobs.length} open positions from campus recruiters
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="sp-jobs__toolbar">
          <div className="sp-jobs__search-wrap">
            <Search size={18} className="sp-jobs__search-icon" />
            <input
              type="text"
              placeholder="Search jobs, companies, skills..."
              className="sp-jobs__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search jobs"
            />
            {search && (
              <button className="sp-jobs__search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className={`sp-jobs__filter-toggle ${showFilters ? 'sp-jobs__filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filters <ChevronDown size={14} />
          </button>

          <div className="sp-jobs__sort">
            <label htmlFor="job-sort" className="sp-jobs__sort-label">Sort:</label>
            <select id="job-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sp-jobs__sort-select">
              <option value="deadline">Deadline</option>
              <option value="posted">Recently Posted</option>
              <option value="company">Company</option>
            </select>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="sp-jobs__filters-panel">
            <div className="sp-jobs__filter-group">
              <label className="sp-jobs__filter-label">Company</label>
              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="sp-jobs__filter-select">
                <option value="">All Companies</option>
                {companies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sp-jobs__filter-group">
              <label className="sp-jobs__filter-label">Job Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sp-jobs__filter-select">
                <option value="">All Types</option>
                {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sp-jobs__filter-group">
              <label className="sp-jobs__filter-label">Location</label>
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="sp-jobs__filter-select">
                <option value="">All Locations</option>
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button className="sp-jobs__clear-btn" onClick={clearFilters}>
                <X size={14} /> Clear
              </button>
            )}
          </div>
        )}

        <p className="sp-jobs__count">
          Showing {filtered.length} of {jobs.length} jobs
        </p>

        {fetchError && (
          <div style={{ color: '#ef4444', background: 'rgba(239,68,68,.08)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
            {fetchError}
          </div>
        )}

        {/* Job list */}
        {loading ? (
          <div className="sp-jobs__empty">
            <Loader size={36} className="spin" />
            <h3>Loading jobs…</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sp-jobs__empty">
            <Briefcase size={48} />
            <h3>No jobs found</h3>
            <p>Try adjusting your filters or search.</p>
          </div>
        ) : (
          <div className="sp-jobs__list">
            {filtered.map((job) => {
              const isApplied = appliedJobs.has(job._id);
              const deadlineStr = job.deadline ? daysLeft(job.deadline) : 'No deadline';
              const isExpired = deadlineStr === 'Expired';

              return (
                <article key={job._id} className="sp-job-card">
                  <div className="sp-job-card__main" onClick={() => setSelectedJob(job)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedJob(job)}>
                    <div className="sp-job-card__logo">{(job.company || '')[0] || '?'}</div>
                    <div className="sp-job-card__info">
                      <div className="sp-job-card__top-row">
                        <h3 className="sp-job-card__title">{job.title}</h3>
                        <span className={`sp-job-card__type sp-job-card__type--${job.jobType.toLowerCase().replace('-', '')}`}>
                          {job.jobType}
                        </span>
                      </div>
                      <p className="sp-job-card__company">{job.company}</p>

                      <div className="sp-job-card__meta-row">
                        <span className="sp-job-card__meta"><MapPin size={14} /> {job.location}</span>
                        <span className="sp-job-card__meta sp-job-card__meta--salary"><DollarSign size={14} /> {job.salary || 'Not disclosed'}</span>
                        {job.deadline && <span className="sp-job-card__meta"><Clock size={14} /> {formatDate(job.deadline)}</span>}
                      </div>

                      <p className="sp-job-card__desc">{job.description}</p>

                      <div className="sp-job-card__skills">
                        {job.skills.map((s) => (
                          <span key={s} className="sp-job-card__skill">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="sp-job-card__actions">
                    <span className={`sp-job-card__deadline ${isExpired ? 'sp-job-card__deadline--expired' : ''}`}>
                      <Calendar size={13} /> {deadlineStr}
                    </span>
                    {isApplied ? (
                      <button className="sp-job-card__applied-btn" disabled>
                        <CheckCircle2 size={16} /> Applied
                      </button>
                    ) : (
                      <button
                        className="sp-job-card__apply-btn"
                        onClick={() => openApplyForm(job)}
                        disabled={isExpired || applying === job._id}
                      >
                        {applying === job._id ? 'Applying…' : isExpired ? 'Closed' : 'Apply Now'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Job Detail Modal */}
        {selectedJob && (
          <div className="sp-job-modal__overlay" onClick={() => setSelectedJob(null)} role="dialog" aria-modal="true">
            <div className="sp-job-modal" onClick={(e) => e.stopPropagation()}>
              <button className="sp-job-modal__close" onClick={() => setSelectedJob(null)} aria-label="Close">
                <X size={20} />
              </button>

              <div className="sp-job-modal__header">
                <div className="sp-job-modal__logo">{(selectedJob.company || '')[0] || '?'}</div>
                <div>
                  <h2 className="sp-job-modal__title">{selectedJob.title}</h2>
                  <p className="sp-job-modal__company">{selectedJob.company}</p>
                </div>
                <span className={`sp-job-modal__type sp-job-modal__type--${selectedJob.jobType.toLowerCase().replace('-', '')}`}>
                  {selectedJob.jobType}
                </span>
              </div>

              <div className="sp-job-modal__meta-grid">
                <div className="sp-job-modal__meta-item">
                  <MapPin size={16} />
                  <div>
                    <span className="sp-job-modal__meta-label">Location</span>
                    <span className="sp-job-modal__meta-value">{selectedJob.location}</span>
                  </div>
                </div>
                <div className="sp-job-modal__meta-item">
                  <DollarSign size={16} />
                  <div>
                    <span className="sp-job-modal__meta-label">Compensation</span>
                    <span className="sp-job-modal__meta-value">{selectedJob.salary || 'Not disclosed'}</span>
                  </div>
                </div>
                <div className="sp-job-modal__meta-item">
                  <Calendar size={16} />
                  <div>
                    <span className="sp-job-modal__meta-label">Deadline</span>
                    <span className="sp-job-modal__meta-value">{selectedJob.deadline ? formatDate(selectedJob.deadline) : 'Open'}</span>
                  </div>
                </div>
                <div className="sp-job-modal__meta-item">
                  <Tag size={16} />
                  <div>
                    <span className="sp-job-modal__meta-label">Department</span>
                    <span className="sp-job-modal__meta-value">{selectedJob.department || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="sp-job-modal__section">
                <h4>Job Description</h4>
                <p>{selectedJob.description}</p>
              </div>

              <div className="sp-job-modal__section">
                <h4>Required Skills</h4>
                <div className="sp-job-modal__skills">
                  {selectedJob.skills.map((s) => (
                    <span key={s} className="sp-job-modal__skill">{s}</span>
                  ))}
                </div>
              </div>

              <div className="sp-job-modal__footer">
                {appliedJobs.has(selectedJob._id) ? (
                  <button className="sp-job-modal__applied-btn" disabled>
                    <CheckCircle2 size={18} /> You have applied
                  </button>
                ) : (
                  <button
                    className="sp-job-modal__apply-btn"
                    onClick={() => { setSelectedJob(null); openApplyForm(selectedJob); }}
                    disabled={(selectedJob.deadline && daysLeft(selectedJob.deadline) === 'Expired') || applying === selectedJob._id}
                  >
                    <ExternalLink size={18} />
                    {applying === selectedJob._id ? 'Applying…' : selectedJob.deadline && daysLeft(selectedJob.deadline) === 'Expired' ? 'Applications Closed' : 'Apply for this position'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Application Form Modal */}
        {applyJob && (
          <div className="sp-job-modal__overlay" onClick={() => setApplyJob(null)} role="dialog" aria-modal="true">
            <div className="sp-apply-modal" onClick={(e) => e.stopPropagation()}>
              <button className="sp-job-modal__close" onClick={() => setApplyJob(null)} aria-label="Close">
                <X size={20} />
              </button>

              <div className="sp-apply-modal__header">
                <div className="sp-job-modal__logo">{(applyJob.company || '')[0] || '?'}</div>
                <div>
                  <h2 className="sp-apply-modal__title">Apply for {applyJob.title}</h2>
                  <p className="sp-apply-modal__company">{applyJob.company}</p>
                </div>
              </div>

              {applyError && <div className="sp-apply-modal__error">{applyError}</div>}

              <form className="sp-apply-modal__form" onSubmit={(e) => { e.preventDefault(); handleApply(applyJob._id); }}>
                <div className="sp-apply-modal__field">
                  <label className="sp-apply-modal__label"><User size={15} /> Full Name</label>
                  <input
                    type="text"
                    className="sp-apply-modal__input"
                    value={applyForm.name}
                    onChange={(e) => setApplyForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="sp-apply-modal__field">
                  <label className="sp-apply-modal__label"><Mail size={15} /> College Mail ID</label>
                  <input
                    type="email"
                    className="sp-apply-modal__input"
                    value={applyForm.collegeMail}
                    onChange={(e) => setApplyForm((f) => ({ ...f, collegeMail: e.target.value }))}
                    required
                    placeholder="yourname@college.edu"
                  />
                </div>

                <div className="sp-apply-modal__field">
                  <label className="sp-apply-modal__label"><MapPin size={15} /> Location</label>
                  <input
                    type="text"
                    className="sp-apply-modal__input"
                    value={applyForm.location}
                    onChange={(e) => setApplyForm((f) => ({ ...f, location: e.target.value }))}
                    required
                    placeholder="Your current city"
                  />
                </div>

                <div className="sp-apply-modal__field">
                  <label className="sp-apply-modal__label"><Briefcase size={15} /> Work Experience</label>
                  <textarea
                    className="sp-apply-modal__textarea"
                    value={applyForm.workExperience}
                    onChange={(e) => setApplyForm((f) => ({ ...f, workExperience: e.target.value }))}
                    placeholder="Describe your relevant work experience (or 'Fresher')"
                    rows={3}
                  />
                </div>

                <div className="sp-apply-modal__field">
                  <label className="sp-apply-modal__label"><Upload size={15} /> Upload Resume</label>
                  <div className="sp-apply-modal__file-wrap">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setApplyForm((f) => ({ ...f, resume: e.target.files[0] || null }))}
                      className="sp-apply-modal__file-input"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="sp-apply-modal__file-label">
                      <Upload size={16} />
                      {applyForm.resume ? applyForm.resume.name : 'Choose PDF, DOC, or DOCX (max 5MB)'}
                    </label>
                  </div>
                </div>

                <div className="sp-apply-modal__actions">
                  <button type="button" className="sp-apply-modal__cancel" onClick={() => setApplyJob(null)}>Cancel</button>
                  <button type="submit" className="sp-apply-modal__submit" disabled={applying === applyJob._id}>
                    {applying === applyJob._id ? 'Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Jobs;
