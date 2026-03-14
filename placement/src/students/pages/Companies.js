import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Filter, CalendarDays, Briefcase, MapPin,
  Users, ChevronDown, X, Building2, Loader, Upload, CheckCircle2, Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './Companies.css';

const Companies = () => {
  const student = api.getStudent() || {};
  const [drives, setDrives] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState(null);

  // Apply state
  const [applyingDriveId, setApplyingDriveId] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driveRes, appRes] = await Promise.all([
          api.getDrives(),
          api.getMyDriveApplications().catch(() => ({ applications: [] })),
        ]);
        setDrives(driveRes.drives || []);
        setMyApps(appRes.applications || []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Set of drive IDs the student already applied to
  const appliedDriveIds = useMemo(() => {
    return new Set(myApps.map((a) => a.drive?._id || a.drive));
  }, [myApps]);

  // Check eligibility
  const isEligible = (drive) => {
    if (drive.eligibleDepartments && drive.eligibleDepartments.length > 0) {
      if (!drive.eligibleDepartments.includes(student.department)) return false;
    }
    return true;
  };

  const isDeadlinePassed = (drive) => {
    if (!drive.deadline) return false;
    return new Date(drive.deadline) < new Date();
  };

  const allDepartments = useMemo(() => {
    const depts = new Set();
    drives.forEach((d) => (d.eligibleDepartments || []).forEach((dep) => depts.add(dep)));
    return [...depts];
  }, [drives]);

  const filtered = useMemo(() => {
    let result = [...drives];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (d.companies || []).some((c) => c.toLowerCase().includes(q))
      );
    }

    if (deptFilter) {
      result = result.filter((d) => (d.eligibleDepartments || []).includes(deptFilter));
    }

    if (sortBy === 'date') {
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [drives, search, deptFilter, sortBy]);

  const clearFilters = () => {
    setSearch('');
    setDeptFilter('');
    setSortBy('date');
  };

  const hasFilters = search || deptFilter;

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  return (
    <div className="sp-companies-page">
      <Navbar studentName={student.name || 'Student'} />

      <main className="sp-companies">
        {/* Header */}
        <div className="sp-companies__header">
          <div>
            <h1 className="sp-companies__title">Campus Drives</h1>
            <p className="sp-companies__subtitle">
              {drives.length} drives scheduled for campus recruitment
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="sp-companies__toolbar">
          <div className="sp-companies__search-wrap">
            <Search size={18} className="sp-companies__search-icon" />
            <input
              type="text"
              placeholder="Search drives or companies..."
              className="sp-companies__search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search drives"
            />
            {search && (
              <button className="sp-companies__search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className={`sp-companies__filter-toggle ${showFilters ? 'sp-companies__filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filters <ChevronDown size={14} />
          </button>

          <div className="sp-companies__sort">
            <label htmlFor="sort-select" className="sp-companies__sort-label">Sort:</label>
            <select id="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sp-companies__sort-select">
              <option value="date">Date</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="sp-companies__filters-panel">
            <div className="sp-companies__filter-group">
              <label className="sp-companies__filter-label">Department</label>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="sp-companies__filter-select">
                <option value="">All Departments</option>
                {allDepartments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button className="sp-companies__clear-btn" onClick={clearFilters}>
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="sp-companies__count">
          Showing {filtered.length} of {drives.length} drives
        </p>

        {/* Grid */}
        {loading ? (
          <div className="sp-companies__empty">
            <Loader size={48} className="spin" />
            <h3>Loading drives…</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sp-companies__empty">
            <Building2 size={48} />
            <h3>No drives found</h3>
            <p>{drives.length === 0 ? 'No campus drives have been scheduled yet.' : 'Try adjusting your filters or search query.'}</p>
          </div>
        ) : (
          <div className="sp-companies__grid">
            {filtered.map((drive) => (
              <article
                key={drive._id}
                className="sp-company-card"
                onClick={() => setSelectedDrive(drive)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedDrive(drive)}
              >
                <div className="sp-company-card__top">
                  <div className="sp-company-card__logo">{(drive.title || '?')[0]}</div>
                  <div>
                    <h3 className="sp-company-card__name">{drive.title}</h3>
                    <span className="sp-company-card__role-type">{drive.status}</span>
                  </div>
                </div>

                <p className="sp-company-card__desc">{drive.description}</p>

                <div className="sp-company-card__details">
                  <div className="sp-company-card__detail">
                    <CalendarDays size={14} />
                    <span>{formatDate(drive.date)}</span>
                    <span className="sp-company-card__countdown">{daysUntil(drive.date)}</span>
                  </div>
                  <div className="sp-company-card__detail">
                    <Users size={14} /> <span>{(drive.companies || []).length} companies</span>
                  </div>
                  {drive.venue && (
                    <div className="sp-company-card__detail">
                      <MapPin size={14} /> <span>{drive.venue}</span>
                    </div>
                  )}
                </div>

                <div className="sp-company-card__footer">
                  {drive.minCGPA > 0 && <span className="sp-company-card__eligibility">Min CGPA: {drive.minCGPA}</span>}
                  {appliedDriveIds.has(drive._id) ? (
                    <span className="sp-company-card__applied-badge"><CheckCircle2 size={14} /> Applied</span>
                  ) : !isEligible(drive) ? (
                    <span className="sp-company-card__not-eligible">Not Eligible</span>
                  ) : isDeadlinePassed(drive) ? (
                    <span className="sp-company-card__deadline-passed">Deadline Passed</span>
                  ) : (
                    <span className="sp-company-card__apply-hint">Click to Apply</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedDrive && (
          <div className="sp-company-modal__overlay" onClick={() => { setSelectedDrive(null); setApplyingDriveId(null); setApplyError(''); setApplySuccess(''); setResumeFile(null); }} role="dialog" aria-modal="true">
            <div className="sp-company-modal" onClick={(e) => e.stopPropagation()}>
              <button className="sp-company-modal__close" onClick={() => { setSelectedDrive(null); setApplyingDriveId(null); setApplyError(''); setApplySuccess(''); setResumeFile(null); }} aria-label="Close">
                <X size={20} />
              </button>

              <div className="sp-company-modal__header">
                <div className="sp-company-modal__logo">{(selectedDrive.title || '?')[0]}</div>
                <div>
                  <h2 className="sp-company-modal__name">{selectedDrive.title}</h2>
                  <span className="sp-company-modal__type">{selectedDrive.status}</span>
                </div>
              </div>

              <p className="sp-company-modal__desc">{selectedDrive.description}</p>

              <div className="sp-company-modal__info-grid">
                <div className="sp-company-modal__info-item">
                  <CalendarDays size={16} />
                  <div>
                    <span className="sp-company-modal__info-label">Date</span>
                    <span className="sp-company-modal__info-value">{formatDate(selectedDrive.date)}</span>
                  </div>
                </div>
                <div className="sp-company-modal__info-item">
                  <Users size={16} />
                  <div>
                    <span className="sp-company-modal__info-label">Companies</span>
                    <span className="sp-company-modal__info-value">{(selectedDrive.companies || []).join(', ') || '—'}</span>
                  </div>
                </div>
                {selectedDrive.venue && (
                  <div className="sp-company-modal__info-item">
                    <MapPin size={16} />
                    <div>
                      <span className="sp-company-modal__info-label">Venue</span>
                      <span className="sp-company-modal__info-value">{selectedDrive.venue}</span>
                    </div>
                  </div>
                )}
                {selectedDrive.minCGPA > 0 && (
                  <div className="sp-company-modal__info-item">
                    <Briefcase size={16} />
                    <div>
                      <span className="sp-company-modal__info-label">Min CGPA</span>
                      <span className="sp-company-modal__info-value">{selectedDrive.minCGPA}</span>
                    </div>
                  </div>
                )}
                {selectedDrive.deadline && (
                  <div className="sp-company-modal__info-item">
                    <Clock size={16} />
                    <div>
                      <span className="sp-company-modal__info-label">Deadline</span>
                      <span className="sp-company-modal__info-value">{formatDate(selectedDrive.deadline)}</span>
                    </div>
                  </div>
                )}
              </div>

              {(selectedDrive.eligibleDepartments || []).length > 0 && (
                <div className="sp-company-modal__departments">
                  <h4>Eligible Departments</h4>
                  <div className="sp-company-modal__dept-tags">
                    {selectedDrive.eligibleDepartments.map((d) => (
                      <span key={d} className={`sp-company-modal__dept-tag ${d === student.department ? 'sp-company-modal__dept-tag--match' : ''}`}>{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Section */}
              <div className="sp-company-modal__apply-section">
                {appliedDriveIds.has(selectedDrive._id) ? (
                  <div className="sp-company-modal__already-applied">
                    <CheckCircle2 size={20} />
                    <span>You have already applied to this drive.</span>
                  </div>
                ) : !isEligible(selectedDrive) ? (
                  <div className="sp-company-modal__not-eligible-msg">
                    Your department ({student.department || '—'}) is not eligible for this drive.
                  </div>
                ) : isDeadlinePassed(selectedDrive) ? (
                  <div className="sp-company-modal__not-eligible-msg">
                    The deadline for this drive has passed.
                  </div>
                ) : applyingDriveId === selectedDrive._id ? (
                  <div className="sp-company-modal__apply-form">
                    <h4>Upload Your Resume</h4>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => { setResumeFile(e.target.files[0]); setApplyError(''); }}
                      className="sp-company-modal__file-input"
                    />
                    {resumeFile && <p className="sp-company-modal__file-name">{resumeFile.name}</p>}
                    {applyError && <p className="sp-company-modal__error">{applyError}</p>}
                    {applySuccess && <p className="sp-company-modal__success">{applySuccess}</p>}
                    <div className="sp-company-modal__form-actions">
                      <button
                        className="sp-company-modal__submit-btn"
                        disabled={submitting || !resumeFile}
                        onClick={async () => {
                          if (!resumeFile) { setApplyError('Please select a resume file.'); return; }
                          setSubmitting(true);
                          setApplyError('');
                          try {
                            const fd = new FormData();
                            fd.append('resume', resumeFile);
                            const res = await api.applyToDrive(selectedDrive._id, fd);
                            setApplySuccess('Application submitted successfully!');
                            setMyApps((prev) => [...prev, { ...(res.application || {}), drive: selectedDrive._id }]);
                          } catch (err) {
                            setApplyError(err.message || 'Failed to submit application.');
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                      >
                        {submitting ? 'Submitting…' : 'Submit Application'}
                      </button>
                      <button
                        className="sp-company-modal__cancel-btn"
                        onClick={() => { setApplyingDriveId(null); setResumeFile(null); setApplyError(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="sp-company-modal__apply-btn"
                    onClick={() => { setApplyingDriveId(selectedDrive._id); setApplyError(''); setApplySuccess(''); }}
                  >
                    <Upload size={16} /> Apply to this Drive
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Companies;
