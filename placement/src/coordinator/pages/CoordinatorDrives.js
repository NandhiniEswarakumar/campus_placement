import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Building2, CalendarDays, MapPin,
  Users, Search, GraduationCap, Edit3, Trash2, Clock,
  AlertTriangle, Loader, FileText, X,
} from 'lucide-react';
import CoordinatorNavbar from '../components/CoordinatorNavbar';
import coordinatorApi from '../services/coordinatorApi';
import './CoordinatorDrives.css';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical',
  'Chemical',
  'MBA',
];

const STATUS_META = {
  upcoming:  { label: 'Upcoming',  cls: 'drive-badge--upcoming'  },
  ongoing:   { label: 'Ongoing',   cls: 'drive-badge--ongoing'   },
  completed: { label: 'Completed', cls: 'drive-badge--completed' },
  cancelled: { label: 'Cancelled', cls: 'drive-badge--cancelled' },
};

const EMPTY_FORM = {
  title: '',
  description: '',
  companies: '',
  date: '',
  deadline: '',
  venue: '',
  eligibleDepartments: [],
  minCGPA: 0,
  status: 'upcoming',
};

function toDatetimeLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CoordinatorDrives() {
  const user = coordinatorApi.getUser() || {};
  const [drives, setDrives] = useState([]);
  const [driveApps, setDriveApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [driveRes, appRes] = await Promise.all([
        coordinatorApi.getMyDrives().catch(() => ({ drives: [] })),
        coordinatorApi.getAllDriveApplications().catch(() => ({ applications: [] })),
      ]);
      setDrives(driveRes.drives || []);
      setDriveApps(appRes.applications || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  // Application count per drive
  const appCounts = useMemo(() => {
    const counts = {};
    driveApps.forEach((a) => {
      const id = a.drive?._id || a.drive;
      if (id) counts[String(id)] = (counts[String(id)] || 0) + 1;
    });
    return counts;
  }, [driveApps]);

  const filtered = useMemo(() => {
    let list = [...drives];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.companies || []).some((c) => c.toLowerCase().includes(q)) ||
          (d.venue || '').toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((d) => d.status === statusFilter);
    }
    return list;
  }, [drives, search, statusFilter]);

  function openCreate() {
    setEditingDrive(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(drive) {
    setEditingDrive(drive);
    setForm({
      title: drive.title,
      description: drive.description,
      companies: (drive.companies || []).join(', '),
      date: toDatetimeLocal(drive.date),
      deadline: toDatetimeLocal(drive.deadline),
      venue: drive.venue || '',
      eligibleDepartments: drive.eligibleDepartments || [],
      minCGPA: drive.minCGPA ?? 0,
      status: drive.status || 'upcoming',
    });
    setFormError('');
    setShowForm(true);
  }

  function handleDeptToggle(dept) {
    setForm((prev) => ({
      ...prev,
      eligibleDepartments: prev.eligibleDepartments.includes(dept)
        ? prev.eligibleDepartments.filter((d) => d !== dept)
        : [...prev.eligibleDepartments, dept],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) { setFormError('Drive title is required.'); return; }
    if (!form.description.trim()) { setFormError('Description is required.'); return; }
    if (!form.date) { setFormError('Drive date is required.'); return; }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      companies: form.companies
        ? form.companies.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      date: form.date,
      deadline: form.deadline || null,
      venue: form.venue.trim(),
      eligibleDepartments: form.eligibleDepartments,
      minCGPA: parseFloat(form.minCGPA) || 0,
      status: form.status,
    };

    setFormLoading(true);
    try {
      if (editingDrive) {
        const res = await coordinatorApi.updateDrive(editingDrive._id, payload);
        setDrives((prev) => prev.map((d) => (d._id === editingDrive._id ? res.drive : d)));
      } else {
        const res = await coordinatorApi.createDrive(payload);
        setDrives((prev) => [res.drive, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await coordinatorApi.deleteDrive(deleteTarget._id);
      setDrives((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete drive.');
    } finally {
      setDeleting(false);
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const deadlineLabel = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const diffDays = Math.ceil((d - new Date()) / 86400000);
    if (diffDays < 0) return { text: 'Deadline passed', warn: true };
    if (diffDays === 0) return { text: 'Deadline today!', warn: true };
    if (diffDays === 1) return { text: '1 day left', warn: false };
    return { text: `${diffDays} days left`, warn: false };
  };

  if (loading) {
    return (
      <div className="coord-page">
        <CoordinatorNavbar userName={user.name} />
        <main className="coord-drives" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Loader size={40} className="spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="coord-page">
      <CoordinatorNavbar userName={user.name} />

      <main className="coord-drives">
        {/* ── Header ── */}
        <div className="coord-drives__header">
          <div>
            <h1 className="coord-drives__title">Placement Drives</h1>
            <p className="coord-drives__subtitle">
              {drives.length} drive{drives.length !== 1 ? 's' : ''} created · manage campus recruitment drives
            </p>
          </div>
          <button className="coord-btn coord-btn--primary" onClick={openCreate}>
            <Plus size={18} /> Create Drive
          </button>
        </div>

        {/* ── Status filter chips ── */}
        <div className="coord-drives__stats">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              className={`coord-drives__stat-chip ${statusFilter === key ? 'coord-drives__stat-chip--active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            >
              <span className={`drive-badge ${meta.cls}`}>{meta.label}</span>
              <span className="coord-drives__stat-count">
                {drives.filter((d) => d.status === key).length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="coord-drives__search-wrap">
          <Search size={16} className="coord-drives__search-icon" />
          <input
            type="text"
            placeholder="Search by title, company, venue…"
            className="coord-drives__search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="coord-drives__search-clear" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Drive List ── */}
        {filtered.length === 0 ? (
          <div className="coord-drives__empty">
            <Building2 size={52} />
            <h3>{drives.length === 0 ? 'No drives yet' : 'No matching drives'}</h3>
            <p>
              {drives.length === 0
                ? 'Create your first placement drive — eligible students will be notified automatically.'
                : 'Try adjusting your search or clear the status filter.'}
            </p>
            {drives.length === 0 && (
              <button className="coord-btn coord-btn--primary" onClick={openCreate}>
                <Plus size={18} /> Create Drive
              </button>
            )}
          </div>
        ) : (
          <div className="coord-drives__list">
            {filtered.map((drive) => {
              const count = appCounts[String(drive._id)] || 0;
              const meta = STATUS_META[drive.status] || STATUS_META.upcoming;
              const dl = deadlineLabel(drive.deadline);
              return (
                <div key={drive._id} className="coord-drive-card">
                  {/* Card Header */}
                  <div className="coord-drive-card__header">
                    <div className="coord-drive-card__title-row">
                      <Building2 size={20} className="coord-drive-card__icon" />
                      <h3 className="coord-drive-card__title">{drive.title}</h3>
                      <span className={`drive-badge ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <div className="coord-drive-card__actions">
                      <Link
                        to="/coordinator/applications"
                        className="coord-btn coord-btn--xs coord-btn--outline"
                        title="View applications for this drive"
                      >
                        <FileText size={14} />
                        {count} App{count !== 1 ? 's' : ''}
                      </Link>
                      <button
                        className="coord-btn coord-btn--xs coord-btn--ghost"
                        onClick={() => openEdit(drive)}
                        title="Edit drive"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="coord-btn coord-btn--xs coord-btn--danger-ghost"
                        onClick={() => { setDeleteTarget(drive); setDeleteError(''); }}
                        title="Delete drive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Company badges */}
                  {(drive.companies || []).length > 0 && (
                    <div className="coord-drive-card__companies">
                      {drive.companies.map((c) => (
                        <span key={c} className="coord-drive-card__company-badge">{c}</span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <p className="coord-drive-card__desc">{drive.description}</p>

                  {/* Meta row */}
                  <div className="coord-drive-card__meta">
                    <span className="coord-drive-card__meta-item">
                      <CalendarDays size={14} />
                      {formatDate(drive.date)}
                    </span>
                    {drive.venue && (
                      <span className="coord-drive-card__meta-item">
                        <MapPin size={14} />
                        {drive.venue}
                      </span>
                    )}
                    <span className="coord-drive-card__meta-item">
                      <GraduationCap size={14} />
                      CGPA ≥ {drive.minCGPA || 0}
                    </span>
                    {dl && (
                      <span className={`coord-drive-card__meta-item${dl.warn ? ' coord-drive-card__meta-item--warn' : ''}`}>
                        <Clock size={14} />
                        {dl.text}
                      </span>
                    )}
                  </div>

                  {/* Eligible departments */}
                  {(drive.eligibleDepartments || []).length > 0 ? (
                    <div className="coord-drive-card__depts">
                      <Users size={13} />
                      {drive.eligibleDepartments.map((d) => (
                        <span key={d} className="coord-drive-card__dept-badge">{d}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="coord-drive-card__depts coord-drive-card__depts--all">
                      <Users size={13} />
                      <span className="coord-drive-card__dept-all">All departments eligible</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            CREATE / EDIT MODAL
        ══════════════════════════════════════════════ */}
        {showForm && (
          <div
            className="coord-modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => !formLoading && setShowForm(false)}
          >
            <div className="coord-modal" onClick={(e) => e.stopPropagation()}>
              <div className="coord-modal__header">
                <h2 className="coord-modal__title">
                  {editingDrive ? 'Edit Placement Drive' : 'Create Placement Drive'}
                </h2>
                <button
                  className="coord-modal__close"
                  onClick={() => !formLoading && setShowForm(false)}
                  disabled={formLoading}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <form className="coord-modal__body" onSubmit={handleSubmit}>
                {formError && (
                  <div className="coord-form-error">
                    <AlertTriangle size={15} />
                    {formError}
                  </div>
                )}

                {/* Title */}
                <div className="coord-form-row">
                  <div className="coord-form-group coord-form-group--full">
                    <label className="coord-form-label">Drive Title *</label>
                    <input
                      type="text"
                      className="coord-form-input"
                      placeholder="e.g. TCS NQT Campus Drive 2025"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="coord-form-row">
                  <div className="coord-form-group coord-form-group--full">
                    <label className="coord-form-label">Description *</label>
                    <textarea
                      className="coord-form-input coord-form-textarea"
                      placeholder="Describe the drive — roles offered, CTC, selection process, bond details…"
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Companies */}
                <div className="coord-form-row">
                  <div className="coord-form-group coord-form-group--full">
                    <label className="coord-form-label">
                      Companies &nbsp;<span className="coord-form-hint">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      className="coord-form-input"
                      placeholder="e.g. TCS, Infosys, Wipro"
                      value={form.companies}
                      onChange={(e) => setForm((p) => ({ ...p, companies: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Date + Deadline */}
                <div className="coord-form-row">
                  <div className="coord-form-group">
                    <label className="coord-form-label">Drive Date &amp; Time *</label>
                    <input
                      type="datetime-local"
                      className="coord-form-input"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="coord-form-group">
                    <label className="coord-form-label">
                      Application Deadline &nbsp;<span className="coord-form-hint">(optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="coord-form-input"
                      value={form.deadline}
                      onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Venue + CGPA */}
                <div className="coord-form-row">
                  <div className="coord-form-group">
                    <label className="coord-form-label">Venue</label>
                    <input
                      type="text"
                      className="coord-form-input"
                      placeholder="e.g. Main Auditorium, Block A"
                      value={form.venue}
                      onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))}
                    />
                  </div>
                  <div className="coord-form-group">
                    <label className="coord-form-label">Minimum CGPA</label>
                    <input
                      type="number"
                      className="coord-form-input"
                      min="0"
                      max="10"
                      step="0.1"
                      value={form.minCGPA}
                      onChange={(e) => setForm((p) => ({ ...p, minCGPA: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="coord-form-row">
                  <div className="coord-form-group">
                    <label className="coord-form-label">Status</label>
                    <select
                      className="coord-form-input"
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Eligible Departments */}
                <div className="coord-form-group coord-form-group--full">
                  <label className="coord-form-label">
                    Eligible Departments &nbsp;
                    <span className="coord-form-hint">(leave all unchecked = all departments eligible)</span>
                  </label>
                  <div className="coord-form-checkbox-grid">
                    {DEPARTMENTS.map((dept) => (
                      <label key={dept} className="coord-form-checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.eligibleDepartments.includes(dept)}
                          onChange={() => handleDeptToggle(dept)}
                        />
                        {dept}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="coord-modal__footer">
                  <button
                    type="button"
                    className="coord-btn coord-btn--outline"
                    onClick={() => setShowForm(false)}
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="coord-btn coord-btn--primary"
                    disabled={formLoading}
                  >
                    {formLoading
                      ? <><Loader size={16} className="spin" /> Saving…</>
                      : editingDrive ? 'Save Changes' : 'Create Drive'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            DELETE CONFIRM MODAL
        ══════════════════════════════════════════════ */}
        {deleteTarget && (
          <div
            className="coord-modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <div className="coord-modal coord-modal--sm" onClick={(e) => e.stopPropagation()}>
              <div className="coord-modal__header">
                <h2 className="coord-modal__title">Delete Drive?</h2>
                <button
                  className="coord-modal__close"
                  onClick={() => !deleting && setDeleteTarget(null)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="coord-modal__body">
                <p className="coord-delete-confirm__text">
                  Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
                  This action cannot be undone.
                </p>
                {deleteError && (
                  <div className="coord-form-error">
                    <AlertTriangle size={15} />
                    {deleteError}
                  </div>
                )}
                <div className="coord-modal__footer">
                  <button
                    className="coord-btn coord-btn--outline"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="coord-btn coord-btn--danger"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting
                      ? <><Loader size={16} className="spin" /> Deleting…</>
                      : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
