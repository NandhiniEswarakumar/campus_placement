const API_BASE = 'http://localhost:5000/api';

const hrApi = {
  async post(endpoint, data) {
    const token = localStorage.getItem('hr_token');
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
    const token = localStorage.getItem('hr_token');
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

  async put(endpoint, data) {
    const token = localStorage.getItem('hr_token');
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
      throw new Error('Unable to connect to the server. Please make sure the backend is running.');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },

  // Auth
  login(email, password) {
    return this.post('/hr/auth/login', { email, password });
  },

  signup(data) {
    return this.post('/hr/auth/signup', data);
  },

  // Token management
  saveAuth(token, hr) {
    localStorage.setItem('hr_token', token);
    localStorage.setItem('hr_user', JSON.stringify(hr));
  },

  getUser() {
    const data = localStorage.getItem('hr_user');
    return data ? JSON.parse(data) : null;
  },

  getToken() {
    return localStorage.getItem('hr_token');
  },

  isLoggedIn() {
    return !!localStorage.getItem('hr_token');
  },

  logout() {
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');
  },

  // Job Postings
  getMyJobs() {
    return this.get('/jobs/hr');
  },

  createJob(data) {
    return this.post('/jobs', data);
  },

  updateJob(id, data) {
    return this.put(`/jobs/${id}`, data);
  },

  async archiveJob(id) {
    return this.patch(`/jobs/${id}/archive`);
  },

  async patch(endpoint, data) {
    const token = localStorage.getItem('hr_token');
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
      throw new Error('Unable to connect to the server. Please make sure the backend is running.');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },

  // Applications
  getApplications() {
    return this.get('/applications/hr');
  },

  updateApplicationStatus(id, status) {
    return this.patch(`/applications/${id}/status`, { status });
  },

  // Notifications
  getNotifications() {
    return this.get('/notifications');
  },

  markAllNotificationsRead() {
    return this.patch('/notifications/read-all');
  },

  markNotificationRead(id) {
    return this.patch(`/notifications/${id}/read`);
  },
};

export default hrApi;
