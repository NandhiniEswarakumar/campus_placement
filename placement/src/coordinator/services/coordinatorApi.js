const API_BASE = 'http://localhost:5000/api';

const coordinatorApi = {
  // ── Generic request helpers ──
  async post(endpoint, data) {
    const token = localStorage.getItem('coordinator_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error('Unable to connect to the server. Please make sure the backend is running.');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },

  async get(endpoint) {
    const token = localStorage.getItem('coordinator_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, { headers });
    } catch {
      throw new Error('Unable to connect to the server. Please make sure the backend is running.');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },

  // ── Auth — placeholder endpoints for future backend ──
  // POST /api/coordinator/auth/login
  login(email, password) {
    return this.post('/coordinator/auth/login', { email, password });
  },

  // POST /api/coordinator/auth/signup
  signup(data) {
    return this.post('/coordinator/auth/signup', data);
  },

  // ── Token management ──
  saveAuth(token, coordinator) {
    localStorage.setItem('coordinator_token', token);
    localStorage.setItem('coordinator_user', JSON.stringify(coordinator));
  },

  getUser() {
    const data = localStorage.getItem('coordinator_user');
    return data ? JSON.parse(data) : null;
  },

  getToken() {
    return localStorage.getItem('coordinator_token');
  },

  isLoggedIn() {
    return !!localStorage.getItem('coordinator_token');
  },

  logout() {
    localStorage.removeItem('coordinator_token');
    localStorage.removeItem('coordinator_user');
  },

  // ── Data endpoints ──
  getStudents() {
    return this.get('/drives/students');
  },

  getAllApplications() {
    return this.get('/applications/all');
  },

  getAllJobs() {
    return this.get('/jobs');
  },

  // Drives
  createDrive(data) {
    return this.post('/drives', data);
  },

  getMyDrives() {
    return this.get('/drives/my');
  },

  getAllDrives() {
    return this.get('/drives/all');
  },

  getDriveApplications(driveId) {
    return this.get(`/drives/${driveId}/applications`);
  },

  getAllDriveApplications() {
    return this.get('/drives/all-applications');
  },

  updateDriveAppStatus(appId, status) {
    return this.patch(`/drives/applications/${appId}/status`, { status });
  },

  updateInterviewStage(appId, data) {
    return this.patch(`/drives/applications/${appId}/interview-stage`, data);
  },

  async put(endpoint, data) {
    const token = localStorage.getItem('coordinator_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error('Unable to connect to the server.');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },

  updateDrive(id, data) {
    return this.put(`/drives/${id}`, data);
  },

  // Notifications
  async patch(endpoint, data) {
    const token = localStorage.getItem('coordinator_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    } catch {
      throw new Error('Unable to connect to the server.');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },

  getNotifications() {
    return this.get('/notifications');
  },

  markAllNotificationsRead() {
    return this.patch('/notifications/read-all');
  },

  markNotificationRead(id) {
    return this.patch(`/notifications/${id}/read`);
  },

  deleteDrive(id) {
    return this.delete(`/drives/${id}`);
  },

  // Feedback history
  getFeedbackHistory(params = {}) {
    const query = new URLSearchParams();
    if (params.driveId) query.set('driveId', params.driveId);
    if (params.stageKey) query.set('stageKey', params.stageKey);
    if (params.studentId) query.set('studentId', params.studentId);
    const qs = query.toString();
    return this.get(`/drives/feedback-history${qs ? `?${qs}` : ''}`);
  },

  // Experience submissions by students
  getAllExperiences() {
    return this.get('/drives/all-experiences');
  },

  getApplicationExperiences(appId) {
    return this.get(`/drives/applications/${appId}/experiences`);
  },

  async delete(endpoint) {
    const token = localStorage.getItem('coordinator_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers });
    } catch {
      throw new Error('Unable to connect to the server.');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },
};

export default coordinatorApi;
