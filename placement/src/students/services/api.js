const API_BASE = 'http://localhost:5000/api';

const api = {
  // POST request helper
  async post(endpoint, data) {
    const token = localStorage.getItem('token');
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

  // GET request helper
  async get(endpoint) {
    const token = localStorage.getItem('token');
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

  // Auth methods
  login(email, password) {
    return this.post('/auth/login', { email, password });
  },

  signup(data) {
    return this.post('/auth/signup', data);
  },

  getProfile() {
    return this.get('/auth/me');
  },

  // Token management
  saveAuth(token, student) {
    localStorage.setItem('token', token);
    localStorage.setItem('student', JSON.stringify(student));
  },

  getStudent() {
    const data = localStorage.getItem('student');
    return data ? JSON.parse(data) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isLoggedIn() {
    return !!localStorage.getItem('token');
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
  },

  // Jobs
  getJobs() {
    return this.get('/jobs');
  },

  // Applications
  applyToJob(formData) {
    return this.postFormData('/applications', formData);
  },

  async postFormData(endpoint, formData) {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch {
      throw new Error('Unable to connect to the server. Please make sure the backend is running.');
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },

  getMyApplications() {
    return this.get('/applications/my');
  },

  // Drives
  getDrives() {
    return this.get('/drives');
  },

  // Notifications
  async patch(endpoint, data) {
    const token = localStorage.getItem('token');
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

  getNotificationStreamUrl() {
    const token = this.getToken();
    return token ? `${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}` : '';
  },

  markAllNotificationsRead() {
    return this.patch('/notifications/read-all');
  },

  markNotificationRead(id) {
    return this.patch(`/notifications/${id}/read`);
  },

  // Drive applications
  applyToDrive(driveId, formData) {
    return this.postFormData(`/drives/${driveId}/apply`, formData);
  },

  getMyDriveApplications() {
    return this.get('/drives/my-applications');
  },

  // Round experience submissions
  submitRoundExperience(appId, data) {
    return this.post(`/drives/applications/${appId}/experience`, data);
  },

  getApplicationExperiences(appId) {
    return this.get(`/drives/applications/${appId}/experiences`);
  },
};

export default api;
