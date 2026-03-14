import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, FileText, Briefcase, AlertTriangle,
  ArrowRight, Bell, TrendingUp,
  Building, Clock, Loader, MessageSquare, NotebookPen,
} from 'lucide-react';
import CoordinatorNavbar from '../components/CoordinatorNavbar';
import coordinatorApi from '../services/coordinatorApi';
import './CoordinatorDashboard.css';

const CoordinatorDashboard = () => {
  const user = coordinatorApi.getUser() || {};

  const [students, setStudents] = useState([]);
  const [drives, setDrives] = useState([]);
  const [driveApps, setDriveApps] = useState([]);
  const [jobApps, setJobApps] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [studentExperiences, setStudentExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [stuRes, driveRes, driveAppRes, jobAppRes, notifRes, feedbackRes, experienceRes] = await Promise.all([
          coordinatorApi.getStudents().catch(() => ({ students: [] })),
          coordinatorApi.getAllDrives().catch(() => ({ drives: [] })),
          coordinatorApi.getAllDriveApplications().catch(() => ({ applications: [] })),
          coordinatorApi.getAllApplications().catch(() => ({ applications: [] })),
          coordinatorApi.getNotifications().catch(() => ({ notifications: [] })),
          coordinatorApi.getFeedbackHistory().catch(() => ({ feedbackHistory: [] })),
          coordinatorApi.getAllExperiences().catch(() => ({ experiences: [] })),
        ]);
        setStudents(stuRes.students || []);
        setDrives(driveRes.drives || []);
        setDriveApps(driveAppRes.applications || []);
        setJobApps(jobAppRes.applications || []);
        setNotifications(notifRes.notifications || []);
        setFeedbackHistory(feedbackRes.feedbackHistory || []);
        setStudentExperiences(experienceRes.experiences || []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const totalStudents = students.length;
  const studentsApplied = new Set([
    ...jobApps.map((a) => a.student?._id || a.student),
    ...driveApps.map((a) => a.student?._id || a.student),
  ]).size;
  const totalDriveApps = driveApps.length;
  const notAppliedCount = totalStudents - studentsApplied;

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'blue' },
    { label: 'Active Drives', value: drives.filter((d) => d.status === 'upcoming' || d.status === 'ongoing').length, icon: Briefcase, color: 'emerald' },
    { label: 'Drive Submissions', value: totalDriveApps, icon: FileText, color: 'violet' },
    { label: 'Haven\'t Applied', value: notAppliedCount, icon: AlertTriangle, color: 'amber' },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      await coordinatorApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffHrs = Math.floor(diffMs / 3600000);
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const notifIcon = (type) => {
    switch (type) {
      case 'application_received': return <FileText size={16} />;
      case 'drive_announced': return <Briefcase size={16} />;
      default: return <Bell size={16} />;
    }
  };

  // Department breakdown from real students
  const deptMap = {};
  students.forEach((s) => {
    const dept = s.department || 'Other';
    if (!deptMap[dept]) deptMap[dept] = { department: dept, totalStudents: 0, applied: 0 };
    deptMap[dept].totalStudents++;
  });
  // Count who has applied (from job apps + drive apps)
  const appliedStudentDepts = {};
  [...jobApps, ...driveApps].forEach((a) => {
    const stu = a.student;
    const sid = stu?._id || stu;
    const dept = stu?.department;
    if (dept && !appliedStudentDepts[`${sid}_${dept}`]) {
      appliedStudentDepts[`${sid}_${dept}`] = true;
      if (deptMap[dept]) deptMap[dept].applied++;
    }
  });
  const departmentStats = Object.values(deptMap);

  // Not applied students (students who have zero applications)
  const appliedStudentIds = new Set([
    ...jobApps.map((a) => (a.student?._id || a.student)?.toString()),
    ...driveApps.map((a) => (a.student?._id || a.student)?.toString()),
  ]);
  const notAppliedStudents = students.filter((s) => !appliedStudentIds.has(s._id?.toString()));

  // Recent drives with application counts
  const activeDrives = drives
    .filter((d) => d.status === 'upcoming' || d.status === 'ongoing')
    .slice(0, 5);

  const driveAppCounts = {};
  driveApps.forEach((a) => {
    const did = a.drive?._id || a.drive;
    if (did) driveAppCounts[did] = (driveAppCounts[did] || 0) + 1;
  });

  const recentFeedback = feedbackHistory.slice(0, 6);
  const recentExperiences = studentExperiences.slice(0, 6);

  if (loading) {
    return (
      <div className="coord-page">
        <CoordinatorNavbar userName={user.name} />
        <main className="coord-dash" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Loader size={48} className="spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="coord-page">
      <CoordinatorNavbar userName={user.name} />

      <main className="coord-dash">
        {/* Welcome Section */}
        <section className="coord-dash__welcome">
          <div>
            <h1 className="coord-dash__title">
              Welcome back, <span className="coord-dash__name">{user.name?.split(' ')[0] || 'Coordinator'}</span>
            </h1>
            <p className="coord-dash__subtitle">
              Here&apos;s the placement overview for {user.college || 'your institution'}.
            </p>
          </div>
          <div className="coord-dash__quick-actions">
            <Link to="/coordinator/drives" className="coord-btn coord-btn--primary">
              <Briefcase size={18} /> Manage Drives
            </Link>
            <Link to="/coordinator/students" className="coord-btn coord-btn--outline">
              <Users size={18} /> View Students
            </Link>
          </div>
        </section>

        {/* Stat Cards */}
        <section className="coord-dash__stats">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`coord-stat-card coord-stat-card--${s.color}`}>
                <div className="coord-stat-card__icon-wrap">
                  <Icon size={22} />
                </div>
                <div className="coord-stat-card__info">
                  <span className="coord-stat-card__value">{s.value}</span>
                  <span className="coord-stat-card__label">{s.label}</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Main Grid — Department Stats + Notifications */}
        <div className="coord-dash__grid">
          {/* Department Breakdown */}
          <section className="coord-dash__card">
            <div className="coord-dash__card-header">
              <h3 className="coord-dash__card-title">
                <Building size={20} /> Department Overview
              </h3>
              <Link to="/coordinator/students" className="coord-dash__card-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="coord-dash__dept-table-wrap">
              {departmentStats.length === 0 ? (
                <p style={{ padding: '1rem', color: '#888' }}>No students registered yet.</p>
              ) : (
                <table className="coord-table coord-table--compact">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Students</th>
                      <th>Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentStats.map((d) => (
                      <tr key={d.department}>
                        <td className="coord-table__dept">{d.department}</td>
                        <td>{d.totalStudents}</td>
                        <td>
                          <span className={d.applied > 0 ? 'coord-badge coord-badge--success' : 'coord-badge coord-badge--muted'}>
                            {d.applied}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Notifications */}
          <section className="coord-dash__card">
            <div className="coord-dash__card-header">
              <h3 className="coord-dash__card-title">
                <Bell size={20} /> Recent Activity
                {unreadCount > 0 && (
                  <span className="coord-dash__unread-badge">{unreadCount}</span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button className="coord-dash__mark-read" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p style={{ padding: '1rem', color: '#888' }}>No notifications yet.</p>
            ) : (
              <ul className="coord-dash__notif-list">
                {notifications.slice(0, 8).map((n) => (
                  <li key={n._id} className={`coord-dash__notif ${!n.read ? 'coord-dash__notif--unread' : ''}`}>
                    <span className={`coord-dash__notif-icon coord-dash__notif-icon--application`}>
                      {notifIcon(n.type)}
                    </span>
                    <div className="coord-dash__notif-content">
                      <p className="coord-dash__notif-msg">{n.message}</p>
                      <span className="coord-dash__notif-time">{formatTime(n.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Quick Info Row — Not Applied + Active Drives */}
        <div className="coord-dash__grid">
          {/* Students Not Applied */}
          <section className="coord-dash__card">
            <div className="coord-dash__card-header">
              <h3 className="coord-dash__card-title">
                <AlertTriangle size={20} /> Haven&apos;t Applied
              </h3>
              <Link to="/coordinator/students" className="coord-dash__card-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {notAppliedStudents.length === 0 ? (
              <p style={{ padding: '1rem', color: '#888' }}>All students have applied!</p>
            ) : (
              <ul className="coord-dash__not-applied-list">
                {notAppliedStudents.slice(0, 5).map((s) => (
                  <li key={s._id} className="coord-dash__not-applied-item">
                    <div className="coord-dash__not-applied-info">
                      <span className="coord-dash__not-applied-name">{s.name}</span>
                      <span className="coord-dash__not-applied-meta">{s.rollNumber} · {s.department}</span>
                    </div>
                    <span className="coord-badge coord-badge--danger">No applications</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Active Drives */}
          <section className="coord-dash__card">
            <div className="coord-dash__card-header">
              <h3 className="coord-dash__card-title">
                <TrendingUp size={20} /> Active Drives
              </h3>
              <Link to="/coordinator/applications" className="coord-dash__card-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {activeDrives.length === 0 ? (
              <p style={{ padding: '1rem', color: '#888' }}>No active drives.</p>
            ) : (
              <ul className="coord-dash__top-jobs-list">
                {activeDrives.map((d) => (
                  <li key={d._id} className="coord-dash__top-job">
                    <div className="coord-dash__top-job-info">
                      <span className="coord-dash__top-job-title">{d.title}</span>
                      <span className="coord-dash__top-job-company">{(d.companies || []).join(', ') || '—'}</span>
                    </div>
                    <div className="coord-dash__top-job-stats">
                      <span className="coord-badge coord-badge--primary">{driveAppCounts[d._id] || 0} apps</span>
                      <span className="coord-dash__top-job-deadline">
                        <Clock size={12} /> {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="coord-dash__grid">
          <section className="coord-dash__card">
            <div className="coord-dash__card-header">
              <h3 className="coord-dash__card-title">
                <NotebookPen size={20} /> Coordinator Feedback History
              </h3>
              <span className="coord-dash__card-hint">Every round update is stored</span>
            </div>
            {recentFeedback.length === 0 ? (
              <p style={{ padding: '1rem', color: '#888' }}>No round feedback recorded yet.</p>
            ) : (
              <ul className="coord-dash__history-list">
                {recentFeedback.map((entry) => (
                  <li key={`${entry.applicationId}-${entry.updatedAt}-${entry.stageKey}`} className="coord-dash__history-item">
                    <div className="coord-dash__history-top">
                      <div>
                        <p className="coord-dash__history-title">{entry.student?.name || 'Student'} · {entry.stageLabel}</p>
                        <p className="coord-dash__history-meta">{entry.drive?.title || 'Placement Drive'} · {entry.coordinatorName || 'Coordinator'} · {formatTime(entry.updatedAt)}</p>
                      </div>
                      <span className="coord-badge coord-badge--info">{entry.stageStatus}</span>
                    </div>
                    <p className="coord-dash__history-text">{entry.feedback || 'No written feedback, only status/schedule updated.'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="coord-dash__card">
            <div className="coord-dash__card-header">
              <h3 className="coord-dash__card-title">
                <MessageSquare size={20} /> Student Round Experiences
              </h3>
              <span className="coord-dash__card-hint">Remarks, suggestions, and feedback</span>
            </div>
            {recentExperiences.length === 0 ? (
              <p style={{ padding: '1rem', color: '#888' }}>No student round experiences submitted yet.</p>
            ) : (
              <ul className="coord-dash__history-list">
                {recentExperiences.map((entry) => (
                  <li key={`${entry.applicationId}-${entry.submittedAt}-${entry.stageKey}`} className="coord-dash__history-item">
                    <div className="coord-dash__history-top">
                      <div>
                        <p className="coord-dash__history-title">{entry.student?.name || 'Student'} · {entry.stageLabel}</p>
                        <p className="coord-dash__history-meta">{entry.drive?.title || 'Placement Drive'} · {formatTime(entry.submittedAt)}</p>
                      </div>
                      <span className="coord-badge coord-badge--success">{entry.difficulty}</span>
                    </div>
                    {entry.remark ? <p className="coord-dash__history-remark">Remark: {entry.remark}</p> : null}
                    <p className="coord-dash__history-text">{entry.content}</p>
                    {entry.tips ? <p className="coord-dash__history-tips">Suggestions: {entry.tips}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default CoordinatorDashboard;
