import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, ArrowUpDown, Download,
  FileText, AlertCircle, ChevronDown, ChevronUp,
  Users, CheckCircle, Clock, Mail, Loader,
} from 'lucide-react';
import CoordinatorNavbar from '../components/CoordinatorNavbar';
import coordinatorApi from '../services/coordinatorApi';
import './CoordinatorStudents.css';

const STATUSES = ['All', 'Applied', 'Not Applied'];

export default function CoordinatorStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField]   = useState('name');
  const [sortDir, setSortDir]       = useState('asc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await coordinatorApi.getStudents();
        setStudents(data.students || []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Unique departments from real data
  const allDepartments = useMemo(() => {
    const depts = new Set(students.map((s) => s.department).filter(Boolean));
    return ['All', ...depts];
  }, [students]);

  /* ── Sorting handler ── */
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={13} className="coord-stu__sort-icon" />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="coord-stu__sort-icon coord-stu__sort-icon--active" />
      : <ChevronDown size={13} className="coord-stu__sort-icon coord-stu__sort-icon--active" />;
  };

  /* ── Derived data ── */
  const filtered = useMemo(() => {
    let list = [...students];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.rollNumber || '').toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== 'All') list = list.filter(s => s.department === deptFilter);
    if (statusFilter === 'Applied') list = list.filter(s => s.driveApplications > 0);
    if (statusFilter === 'Not Applied') list = list.filter(s => !s.driveApplications);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':       cmp = a.name.localeCompare(b.name); break;
        case 'rollNumber': cmp = (a.rollNumber || '').localeCompare(b.rollNumber || ''); break;
        case 'department': cmp = (a.department || '').localeCompare(b.department || ''); break;
        case 'apps':       cmp = (a.driveApplications || 0) - (b.driveApplications || 0); break;
        default: break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [students, search, deptFilter, statusFilter, sortField, sortDir]);

  /* ── Stats ── */
  const totalStudents   = students.length;
  const applied         = students.filter(s => s.driveApplications > 0).length;
  const notApplied      = totalStudents - applied;

  /* ── Export ── */
  const handleExport = () => {
    const header = 'Name,Roll No,Department,Email,Phone,Drive Applications';
    const rows = filtered.map(s =>
      `"${s.name}","${s.rollNumber || ''}","${s.department}","${s.email}","${s.phone || ''}",${s.driveApplications || 0}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_tracking.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="coord-page">
        <CoordinatorNavbar />
        <main className="coord-stu" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Loader size={48} className="spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="coord-page">
      <CoordinatorNavbar />

      <main className="coord-stu">
        {/* Header */}
        <div className="coord-stu__header">
          <div>
            <h1 className="coord-stu__title">Student Tracking</h1>
            <p className="coord-stu__subtitle">
              Monitor registered students and their drive application status
            </p>
          </div>
          <div className="coord-stu__actions">
            <button className="coord-btn coord-btn--outline coord-btn--sm" onClick={() => setShowFilters(f => !f)}>
              <Filter size={15} /> Filters {showFilters ? '▲' : '▼'}
            </button>
            <button className="coord-btn coord-btn--primary coord-btn--sm" onClick={handleExport}>
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stat Summary */}
        <div className="coord-stu__summary">
          <div className="coord-stu__summary-card">
            <Users size={18} />
            <span className="coord-stu__summary-val">{totalStudents}</span>
            <span className="coord-stu__summary-label">Total Students</span>
          </div>
          <div className="coord-stu__summary-card coord-stu__summary-card--success">
            <CheckCircle size={18} />
            <span className="coord-stu__summary-val">{applied}</span>
            <span className="coord-stu__summary-label">Applied to Drives</span>
          </div>
          <div className="coord-stu__summary-card coord-stu__summary-card--warning">
            <Clock size={18} />
            <span className="coord-stu__summary-val">{notApplied}</span>
            <span className="coord-stu__summary-label">Not Applied</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="coord-stu__toolbar">
          <div className="coord-stu__search-wrap">
            <Search size={16} className="coord-stu__search-icon" />
            <input
              className="coord-stu__search"
              placeholder="Search by name, roll number, or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {showFilters && (
            <div className="coord-stu__filters">
              <div className="coord-stu__filter-group">
                <label className="coord-stu__filter-label">Department</label>
                <select
                  className="coord-stu__select"
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                >
                  {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="coord-stu__filter-group">
                <label className="coord-stu__filter-label">Application Status</label>
                <select
                  className="coord-stu__select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button
                className="coord-btn coord-btn--outline coord-btn--sm"
                onClick={() => { setDeptFilter('All'); setStatusFilter('All'); setSearch(''); }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <p className="coord-stu__count">
          Showing <strong>{filtered.length}</strong> of {totalStudents} students
        </p>

        {/* Table */}
        <div className="coord-stu__table-wrap">
          <table className="coord-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="coord-table__sortable">
                  Student Name <SortIcon field="name" />
                </th>
                <th onClick={() => handleSort('rollNumber')} className="coord-table__sortable">
                  Roll No <SortIcon field="rollNumber" />
                </th>
                <th onClick={() => handleSort('department')} className="coord-table__sortable">
                  Department <SortIcon field="department" />
                </th>
                <th onClick={() => handleSort('apps')} className="coord-table__sortable">
                  Drive Apps <SortIcon field="apps" />
                </th>
                <th>Phone</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="coord-stu__empty">
                    <AlertCircle size={20} />
                    No students match your criteria
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s._id} className="coord-stu__row">
                    <td className="coord-stu__name-cell">
                      <span className="coord-stu__avatar">{s.name.charAt(0)}</span>
                      {s.name}
                    </td>
                    <td><code className="coord-stu__roll">{s.rollNumber}</code></td>
                    <td>{s.department}</td>
                    <td>
                      <span className={`coord-badge ${s.driveApplications > 0 ? 'coord-badge--success' : 'coord-badge--warning'}`}>
                        {s.driveApplications > 0 ? <FileText size={12} /> : <Clock size={12} />}
                        {s.driveApplications || 0}
                      </span>
                    </td>
                    <td>{s.phone || <span className="coord-stu__na">—</span>}</td>
                    <td>
                      <a href={`mailto:${s.email}`} className="coord-stu__mail-link" title={s.email}>
                        <Mail size={15} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Back to dashboard */}
        <div className="coord-stu__footer">
          <Link to="/coordinator/dashboard" className="coord-btn coord-btn--outline coord-btn--sm">
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
