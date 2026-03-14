import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader,
  MessageSquarePlus,
  Search,
  Send,
  Star,
  X,
  XCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './StudentDriveApps.css';

const STAGE_LABELS = {
  aptitude_test: 'Aptitude Test',
  technical_interview: 'Technical Interview',
  hr_interview: 'HR Interview',
  final_result: 'Final Result',
};

const roundStatusMeta = {
  pending:   { label: 'Pending',   cls: 'sda-pill--pending'   },
  scheduled: { label: 'Scheduled', cls: 'sda-pill--scheduled' },
  passed:    { label: 'Passed',    cls: 'sda-pill--passed'    },
  failed:    { label: 'Failed',    cls: 'sda-pill--failed'    },
  completed: { label: 'Completed', cls: 'sda-pill--completed' },
};

const appStatusMeta = {
  submitted:   { label: 'Submitted',   cls: 'sda-status--submitted'   },
  reviewed:    { label: 'Reviewed',    cls: 'sda-status--reviewed'    },
  shortlisted: { label: 'Shortlisted', cls: 'sda-status--shortlisted' },
  rejected:    { label: 'Rejected',    cls: 'sda-status--rejected'    },
  selected:    { label: 'Selected',    cls: 'sda-status--selected'    },
};

const DIFFICULTY_OPTS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const STATUS_OPTIONS = ['All', 'submitted', 'reviewed', 'shortlisted', 'rejected', 'selected'];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getCompanyLabel(app) {
  const cos = app.drive?.companies || [];
  return cos.length > 0 ? cos.join(', ') : app.drive?.title || 'Placement Drive';
}

export default function StudentDriveApps() {
  const student = api.getStudent() || {};

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Experience modal state
  const [expModal, setExpModal] = useState(null); // { app, stageKey }
  const [expForm, setExpForm] = useState({ remark: '', content: '', tips: '', difficulty: 'medium' });
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [expError, setExpError] = useState('');
  const [expSuccess, setExpSuccess] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);
    try {
      const data = await api.getMyDriveApplications();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = [...applications];
    if (statusFilter !== 'All') list = list.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          getCompanyLabel(a).toLowerCase().includes(q) ||
          (a.drive?.title || '').toLowerCase().includes(q),
      );
    }
    return list.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt),
    );
  }, [applications, statusFilter, search]);

  // Which stages have been passed and haven't had experience submitted yet
  function getEligibleStages(app) {
    const submitted = new Set((app.roundExperiences || []).map((e) => e.stageKey));
    return (app.interviewStages || []).filter(
      (s) => s.status === 'passed' && !submitted.has(s.key),
    );
  }

  function openExpModal(app, stageKey) {
    setExpModal({ app, stageKey });
    setExpForm({ remark: '', content: '', tips: '', difficulty: 'medium' });
    setExpError('');
    setExpSuccess('');
  }

  function closeExpModal() {
    setExpModal(null);
    setExpError('');
    setExpSuccess('');
  }

  async function submitExperience(e) {
    e.preventDefault();
    if (!expForm.content.trim()) {
      setExpError('Please describe your experience.');
      return;
    }
    setExpSubmitting(true);
    setExpError('');
    try {
      await api.submitRoundExperience(expModal.app._id, {
        stageKey: expModal.stageKey,
        remark: expForm.remark,
        content: expForm.content,
        tips: expForm.tips,
        difficulty: expForm.difficulty,
      });
      setExpSuccess('Experience submitted! Thank you for sharing.');
      // Update local state so the button disappears
      setApplications((prev) =>
        prev.map((a) => {
          if (a._id !== expModal.app._id) return a;
          return {
            ...a,
            roundExperiences: [
              ...(a.roundExperiences || []),
              { stageKey: expModal.stageKey, stageLabel: STAGE_LABELS[expModal.stageKey], remark: expForm.remark },
            ],
          };
        }),
      );
      setTimeout(closeExpModal, 1800);
    } catch (err) {
      setExpError(err.message || 'Could not submit experience. Please try again.');
    } finally {
      setExpSubmitting(false);
    }
  }

  const counts = useMemo(() => {
    const c = { All: applications.length };
    STATUS_OPTIONS.slice(1).forEach((s) => {
      c[s] = applications.filter((a) => a.status === s).length;
    });
    return c;
  }, [applications]);

  return (
    <div className="sda-page">
      <Navbar studentName={student.name} />

      <main className="sda-main">
        <div className="sda-header">
          <div>
            <h1 className="sda-title">Placement Drive Applications</h1>
            <p className="sda-subtitle">
              Track your interview rounds and share your experience with future candidates.
            </p>
          </div>
        </div>

        {/* Status tabs */}
        <div className="sda-tabs">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              className={`sda-tab ${statusFilter === s ? 'sda-tab--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'All' ? 'All' : appStatusMeta[s]?.label || s}
              <span className="sda-tab-count">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="sda-search-wrap">
          <Search size={16} className="sda-search-icon" />
          <input
            className="sda-search"
            placeholder="Search drives or companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="sda-empty">
            <Loader size={44} className="spin" />
            <p>Loading applications…</p>
          </div>
        ) : error ? (
          <div className="sda-empty sda-empty--error">
            <AlertCircle size={44} />
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sda-empty">
            <FileText size={44} />
            <p>
              {applications.length === 0
                ? 'You haven\'t applied to any placement drives yet.'
                : 'No applications match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="sda-list">
            {filtered.map((app) => {
              const statusMeta = appStatusMeta[app.status] || appStatusMeta.submitted;
              const currentStage = (app.interviewStages || []).find(
                (s) => s.key === (app.currentStageKey === 'completed' ? 'final_result' : app.currentStageKey),
              );
              const eligible = getEligibleStages(app);

              return (
                <div key={app._id} className="sda-card">
                  <div className="sda-card__header">
                    <div className="sda-card__logo">
                      {getCompanyLabel(app)[0]}
                    </div>
                    <div className="sda-card__info">
                      <h3 className="sda-card__drive">{app.drive?.title || '—'}</h3>
                      <p className="sda-card__company">{getCompanyLabel(app)}</p>
                      <div className="sda-card__meta">
                        <span><Calendar size={12} /> {formatDate(app.drive?.date)}</span>
                        <span><Clock size={12} /> Applied {formatDate(app.createdAt)}</span>
                      </div>
                    </div>
                    <div className="sda-card__right">
                      <span className={`sda-status ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                      {currentStage && (
                        <span className={`sda-pill ${roundStatusMeta[currentStage.status]?.cls || ''}`}>
                          {currentStage.label}: {roundStatusMeta[currentStage.status]?.label || currentStage.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Round stages mini-timeline */}
                  <div className="sda-card__stages">
                    {(app.interviewStages || []).map((stage) => {
                      const meta = roundStatusMeta[stage.status] || roundStatusMeta.pending;
                      const hasExp = (app.roundExperiences || []).some((e) => e.stageKey === stage.key);
                      return (
                        <div
                          key={stage.key}
                          className={`sda-stage ${stage.status !== 'pending' ? 'sda-stage--active' : ''}`}
                        >
                          <span className={`sda-pill sda-pill--sm ${meta.cls}`}>
                            {stage.label}
                          </span>
                          <span className={`sda-pill sda-pill--xs ${meta.cls}`}>{meta.label}</span>
                          {hasExp && (
                            <span className="sda-exp-badge" title="Experience submitted">
                              <BookOpen size={11} /> Shared
                            </span>
                          )}
                          {stage.status === 'passed' && !hasExp && (
                            <button
                              className="sda-exp-btn"
                              onClick={() => openExpModal(app, stage.key)}
                              title="Share your experience for this round"
                            >
                              <MessageSquarePlus size={12} /> Share Experience
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Failed / rejected alert */}
                  {(app.status === 'rejected' || (app.interviewStages || []).some((s) => s.status === 'failed')) && (
                    <div className="sda-alert sda-alert--failed">
                      <XCircle size={15} />
                      {app.status === 'selected'
                        ? null
                        : 'A round result was marked as failed. Keep going — the next opportunity is around the corner!'}
                    </div>
                  )}
                  {app.status === 'selected' && (
                    <div className="sda-alert sda-alert--selected">
                      <CheckCircle2 size={15} />
                      Congratulations! You are selected for this placement drive. The placement team will contact you with the next steps.
                    </div>
                  )}

                  {/* Eligible experience prompts */}
                  {eligible.length > 0 && (
                    <div className="sda-exp-prompt">
                      <Star size={14} />
                      You can share your experience for:{' '}
                      {eligible.map((s) => (
                        <button
                          key={s.key}
                          className="sda-exp-btn sda-exp-btn--inline"
                          onClick={() => openExpModal(app, s.key)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Experience Submission Modal */}
      {expModal && (
        <div className="sda-modal-overlay" onClick={closeExpModal}>
          <div className="sda-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sda-modal__close" onClick={closeExpModal}>
              <X size={18} />
            </button>

            <div className="sda-modal__header">
              <MessageSquarePlus size={22} />
              <div>
                <h2 className="sda-modal__title">Share Your Round Experience</h2>
                <p className="sda-modal__subtitle">
                  {STAGE_LABELS[expModal.stageKey]} · {getCompanyLabel(expModal.app)}
                </p>
              </div>
            </div>

            {expSuccess ? (
              <div className="sda-modal__success">
                <CheckCircle2 size={40} />
                <p>{expSuccess}</p>
              </div>
            ) : (
              <form className="sda-modal__form" onSubmit={submitExperience}>
                <div className="sda-modal__field">
                  <label className="sda-modal__label">Short remark about this round</label>
                  <input
                    className="sda-modal__input"
                    type="text"
                    placeholder="Example: Aptitude was time-pressured but manageable"
                    maxLength={300}
                    value={expForm.remark}
                    onChange={(e) => setExpForm((f) => ({ ...f, remark: e.target.value }))}
                  />
                  <span className="sda-char-count">{expForm.remark.length}/300</span>
                </div>

                <div className="sda-modal__field">
                  <label className="sda-modal__label">
                    What was the round like? <span className="sda-required">*</span>
                  </label>
                  <textarea
                    className="sda-modal__textarea"
                    rows={5}
                    placeholder="Describe the questions asked, the process, duration, format…"
                    maxLength={5000}
                    value={expForm.content}
                    onChange={(e) => setExpForm((f) => ({ ...f, content: e.target.value }))}
                    required
                  />
                  <span className="sda-char-count">{expForm.content.length}/5000</span>
                </div>

                <div className="sda-modal__field">
                  <label className="sda-modal__label">Tips for future candidates (optional)</label>
                  <textarea
                    className="sda-modal__textarea sda-modal__textarea--sm"
                    rows={3}
                    placeholder="Any advice that would help others prepare for this round…"
                    maxLength={2000}
                    value={expForm.tips}
                    onChange={(e) => setExpForm((f) => ({ ...f, tips: e.target.value }))}
                  />
                </div>

                <div className="sda-modal__field sda-modal__field--row">
                  <label className="sda-modal__label">Difficulty</label>
                  <div className="sda-difficulty-opts">
                    {DIFFICULTY_OPTS.map((d) => (
                      <label
                        key={d.value}
                        className={`sda-difficulty-opt ${expForm.difficulty === d.value ? 'sda-difficulty-opt--active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="difficulty"
                          value={d.value}
                          checked={expForm.difficulty === d.value}
                          onChange={() => setExpForm((f) => ({ ...f, difficulty: d.value }))}
                        />
                        {d.label}
                      </label>
                    ))}
                  </div>
                </div>

                {expError && (
                  <div className="sda-modal__error">
                    <AlertCircle size={14} /> {expError}
                  </div>
                )}

                <div className="sda-modal__actions">
                  <button type="button" className="sda-btn sda-btn--outline" onClick={closeExpModal}>
                    Cancel
                  </button>
                  <button type="submit" className="sda-btn sda-btn--primary" disabled={expSubmitting}>
                    {expSubmitting ? <Loader size={15} className="spin" /> : <Send size={15} />}
                    {expSubmitting ? 'Submitting…' : 'Submit Experience'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
