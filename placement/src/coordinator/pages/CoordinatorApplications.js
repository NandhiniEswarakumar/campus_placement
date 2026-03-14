import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  Download,
  Eye,
  FileText,
  Filter,
  Loader,
  Search,
  XCircle,
} from 'lucide-react';
import CoordinatorNavbar from '../components/CoordinatorNavbar';
import coordinatorApi from '../services/coordinatorApi';
import './CoordinatorApplications.css';

const ROUND_STATUSES = ['All', 'pending', 'scheduled', 'passed', 'failed', 'completed'];

const stageStatusMeta = {
  pending: { label: 'Pending', className: 'coord-badge--warning' },
  scheduled: { label: 'Scheduled', className: 'coord-badge--primary' },
  passed: { label: 'Passed', className: 'coord-badge--success' },
  failed: { label: 'Failed', className: 'coord-badge--danger' },
  completed: { label: 'Completed', className: 'coord-badge--info' },
};

const appStatusMeta = {
  submitted: { label: 'Submitted', className: 'coord-badge--info' },
  reviewed: { label: 'Reviewed', className: 'coord-badge--warning' },
  shortlisted: { label: 'Shortlisted', className: 'coord-badge--success' },
  rejected: { label: 'Rejected', className: 'coord-badge--danger' },
  selected: { label: 'Selected', className: 'coord-badge--primary' },
};

function formatDate(dateValue) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function getCompanyLabel(application) {
  const companies = application.drive?.companies || [];
  return companies.length > 0 ? companies.join(', ') : application.drive?.title || '—';
}

export default function CoordinatorApplications() {
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [driveFilter, setDriveFilter] = useState('All');
  const [roundStatusFilter, setRoundStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedStageKey, setSelectedStageKey] = useState('');
  const [stageStatus, setStageStatus] = useState('pending');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driveRes, appRes] = await Promise.all([
          coordinatorApi.getAllDrives().catch(() => ({ drives: [] })),
          coordinatorApi.getAllDriveApplications().catch(() => ({ applications: [] })),
        ]);

        setDrives(driveRes.drives || []);
        setApplications(appRes.applications || []);
      } catch {
        // ignore fetch failures and show empty state
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedApp) return;

    const activeStageKey = selectedApp.currentStageKey === 'completed'
      ? 'final_result'
      : (selectedApp.currentStageKey || selectedApp.interviewStages?.[0]?.key || '');

    setSelectedStageKey(activeStageKey);
  }, [selectedApp]);

  useEffect(() => {
    if (!selectedApp || !selectedStageKey) return;

    const stage = selectedApp.interviewStages?.find((item) => item.key === selectedStageKey);
    if (!stage) return;

    setStageStatus(stage.status || 'pending');
    setScheduledAt(formatDateTime(stage.scheduledAt));
    setNotes(stage.notes || '');
  }, [selectedApp, selectedStageKey]);

  const filtered = useMemo(() => {
    let list = [...applications];

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((application) => {
        const roundValues = (application.interviewStages || []).map((stage) => `${stage.label} ${stage.status}`.toLowerCase());
        return [
          application.student?.name,
          application.student?.email,
          application.student?.rollNumber,
          application.drive?.title,
          getCompanyLabel(application),
          application.currentRound,
          ...roundValues,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      });
    }

    if (driveFilter !== 'All') {
      list = list.filter((application) => (application.drive?._id || application.drive) === driveFilter);
    }

    if (roundStatusFilter !== 'All') {
      list = list.filter((application) => application.currentRoundStatus === roundStatusFilter);
    }

    return list.sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  }, [applications, search, driveFilter, roundStatusFilter]);

  const totalApplications = applications.length;
  const activeRounds = applications.filter((application) => !['selected', 'rejected'].includes(application.status)).length;
  const scheduledRounds = applications.filter((application) => application.currentRoundStatus === 'scheduled').length;
  const selectedStudents = applications.filter((application) => application.status === 'selected').length;

  const handleExport = () => {
    const header = 'Student Name,Company,Round,Status,Application Status';
    const rows = filtered.map((application) => (
      `"${application.student?.name || ''}","${getCompanyLabel(application)}","${application.currentRound || ''}","${application.currentRoundStatus || ''}","${application.status || ''}"`
    ));

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'interview-rounds.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateApplicationInState = (application) => {
    setApplications((previous) => previous.map((item) => (
      item._id === application._id ? application : item
    )));
    setSelectedApp(application);
  };

  const submitStageUpdate = async (nextStatus = stageStatus) => {
    if (!selectedApp || !selectedStageKey) return;

    setUpdating(true);
    try {
      const response = await coordinatorApi.updateInterviewStage(selectedApp._id, {
        stageKey: selectedStageKey,
        stageStatus: nextStatus,
        scheduledAt: nextStatus === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        notes,
      });
      updateApplicationInState(response.application);
    } catch {
      // ignore and preserve existing values
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="coord-page">
        <CoordinatorNavbar />
        <main className="coord-app coord-app--loading">
          <Loader size={48} className="spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="coord-page">
      <CoordinatorNavbar />

      <main className="coord-app">
        <div className="coord-app__header">
          <div>
            <h1 className="coord-app__title">Interview Round System</h1>
            <p className="coord-app__subtitle">
              Track aptitude, technical, HR, and final-result stages for every drive application.
            </p>
          </div>
          <div className="coord-app__actions">
            <button className="coord-btn coord-btn--outline coord-btn--sm" onClick={() => setShowFilters((value) => !value)}>
              <Filter size={15} /> Filters {showFilters ? '▲' : '▼'}
            </button>
            <button className="coord-btn coord-btn--primary coord-btn--sm" onClick={handleExport}>
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        <div className="coord-app__summary">
          <div className="coord-app__summary-card">
            <span className="coord-app__summary-val">{totalApplications}</span>
            <span className="coord-app__summary-label">Applications</span>
          </div>
          <div className="coord-app__summary-card coord-app__summary-card--success">
            <span className="coord-app__summary-val">{activeRounds}</span>
            <span className="coord-app__summary-label">In Progress</span>
          </div>
          <div className="coord-app__summary-card coord-app__summary-card--violet">
            <span className="coord-app__summary-val">{scheduledRounds}</span>
            <span className="coord-app__summary-label">Scheduled Rounds</span>
          </div>
          <div className="coord-app__summary-card coord-app__summary-card--amber">
            <span className="coord-app__summary-val">{selectedStudents}</span>
            <span className="coord-app__summary-label">Selected</span>
          </div>
        </div>

        <div className="coord-app__toolbar">
          <div className="coord-app__search-wrap">
            <Search size={16} className="coord-app__search-icon" />
            <input
              className="coord-app__search"
              placeholder="Search by student, company, or round"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {showFilters && (
            <div className="coord-app__filters">
              <div className="coord-app__filter-group">
                <label className="coord-app__filter-label">Drive</label>
                <select className="coord-app__select" value={driveFilter} onChange={(event) => setDriveFilter(event.target.value)}>
                  <option value="All">All Drives</option>
                  {drives.map((drive) => (
                    <option key={drive._id} value={drive._id}>{drive.title}</option>
                  ))}
                </select>
              </div>

              <div className="coord-app__filter-group">
                <label className="coord-app__filter-label">Round Status</label>
                <select className="coord-app__select" value={roundStatusFilter} onChange={(event) => setRoundStatusFilter(event.target.value)}>
                  {ROUND_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status === 'All' ? 'All' : stageStatusMeta[status]?.label || status}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="coord-btn coord-btn--outline coord-btn--sm"
                onClick={() => {
                  setDriveFilter('All');
                  setRoundStatusFilter('All');
                  setSearch('');
                }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        <p className="coord-app__count">
          Showing <strong>{filtered.length}</strong> of {totalApplications} applications
        </p>

        <div className="coord-app__table-wrap">
          <table className="coord-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Company</th>
                <th>Round</th>
                <th>Status</th>
                <th>Application</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="coord-app__empty">
                    <AlertCircle size={20} />
                    No interview rounds found
                  </td>
                </tr>
              ) : (
                filtered.map((application) => {
                  const roundMeta = stageStatusMeta[application.currentRoundStatus] || stageStatusMeta.pending;
                  const statusMeta = appStatusMeta[application.status] || appStatusMeta.submitted;

                  return (
                    <tr key={application._id} className="coord-app__row">
                      <td className="coord-app__student-cell">
                        <span className="coord-stu__avatar">{(application.student?.name || '?')[0]}</span>
                        <div>
                          <span className="coord-app__student-name">{application.student?.name || '—'}</span>
                          <span className="coord-app__student-email">{application.student?.email || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="coord-app__company-block">
                          <span className="coord-app__company-name">{getCompanyLabel(application)}</span>
                          <span className="coord-app__company-drive">{application.drive?.title || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="coord-app__round-cell">
                          <span className="coord-app__round-name">{application.currentRound || 'Aptitude Test'}</span>
                          <span className="coord-app__round-note">4-stage placement flow</span>
                        </div>
                      </td>
                      <td>
                        <span className={`coord-badge ${roundMeta.className}`}>
                          {roundMeta.label}
                        </span>
                      </td>
                      <td>
                        <span className={`coord-badge ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="coord-app__date">
                        <Calendar size={13} /> {formatDate(application.updatedAt || application.createdAt)}
                      </td>
                      <td>
                        <button
                          className="coord-app__action-btn coord-app__action-btn--view"
                          title="Manage interview rounds"
                          onClick={() => setSelectedApp(application)}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedApp && (
          <div className="coord-app__modal-overlay" onClick={() => setSelectedApp(null)}>
            <div className="coord-app__modal" onClick={(event) => event.stopPropagation()}>
              <button className="coord-app__modal-close" onClick={() => setSelectedApp(null)}>
                <XCircle size={20} />
              </button>

              <div className="coord-app__modal-header">
                <div>
                  <h2 className="coord-app__modal-title">Interview Stage Manager</h2>
                  <p className="coord-app__modal-subtitle">
                    {selectedApp.student?.name} · {getCompanyLabel(selectedApp)}
                  </p>
                </div>
                <span className={`coord-badge ${(appStatusMeta[selectedApp.status] || appStatusMeta.submitted).className}`}>
                  {(appStatusMeta[selectedApp.status] || appStatusMeta.submitted).label}
                </span>
              </div>

              <div className="coord-app__modal-grid">
                <div className="coord-app__modal-field">
                  <label>Student Name</label>
                  <span>{selectedApp.student?.name || '—'}</span>
                </div>
                <div className="coord-app__modal-field">
                  <label>Roll Number</label>
                  <span>{selectedApp.student?.rollNumber || '—'}</span>
                </div>
                <div className="coord-app__modal-field">
                  <label>Department</label>
                  <span>{selectedApp.student?.department || '—'}</span>
                </div>
                <div className="coord-app__modal-field">
                  <label>Current Round</label>
                  <span>{selectedApp.currentRound || 'Aptitude Test'}</span>
                </div>
              </div>

              <div className="coord-app__stage-layout">
                <div className="coord-app__stage-list">
                  {(selectedApp.interviewStages || []).map((stage) => {
                    const meta = stageStatusMeta[stage.status] || stageStatusMeta.pending;

                    return (
                      <button
                        key={stage.key}
                        className={`coord-app__stage-item ${selectedStageKey === stage.key ? 'coord-app__stage-item--active' : ''}`}
                        onClick={() => setSelectedStageKey(stage.key)}
                      >
                        <span className="coord-app__stage-order">Round {stage.order}</span>
                        <span className="coord-app__stage-label">{stage.label}</span>
                        <span className={`coord-badge ${meta.className}`}>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="coord-app__stage-editor">
                  <div className="coord-app__field-group">
                    <label className="coord-app__filter-label">Round Status</label>
                    <select className="coord-app__select" value={stageStatus} onChange={(event) => setStageStatus(event.target.value)}>
                      {ROUND_STATUSES.filter((status) => status !== 'All').map((status) => (
                        <option key={status} value={status}>{stageStatusMeta[status]?.label || status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="coord-app__field-group">
                    <label className="coord-app__filter-label">Interview Schedule</label>
                    <input
                      type="datetime-local"
                      className="coord-app__search coord-app__search--input"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                    />
                  </div>

                  <div className="coord-app__field-group">
                    <label className="coord-app__filter-label">Notes</label>
                    <textarea
                      className="coord-app__notes"
                      rows="4"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Optional internal notes or interview remarks"
                    />
                  </div>

                  <div className="coord-app__quick-actions-row">
                    <button className="coord-btn coord-btn--outline coord-btn--sm" disabled={updating} onClick={() => submitStageUpdate('scheduled')}>
                      Schedule
                    </button>
                    <button className="coord-btn coord-btn--primary coord-btn--sm" disabled={updating} onClick={() => submitStageUpdate('passed')}>
                      Mark Passed
                    </button>
                    <button className="coord-btn coord-btn--danger coord-btn--sm" disabled={updating} onClick={() => submitStageUpdate('failed')}>
                      Mark Failed
                    </button>
                    <button className="coord-btn coord-btn--success coord-btn--sm" disabled={updating} onClick={() => submitStageUpdate('completed')}>
                      Mark Completed
                    </button>
                  </div>

                  <div className="coord-app__modal-actions">
                    {selectedApp.resumePath && (
                      <a
                        href={`http://localhost:5000${selectedApp.resumePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="coord-btn coord-btn--outline coord-btn--sm"
                      >
                        <FileText size={15} /> View Resume
                      </a>
                    )}

                    <button className="coord-btn coord-btn--primary coord-btn--sm" disabled={updating} onClick={() => submitStageUpdate()}>
                      {updating ? 'Saving…' : 'Save Round Update'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="coord-app__footer">
          <Link to="/coordinator/dashboard" className="coord-btn coord-btn--outline coord-btn--sm">
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
