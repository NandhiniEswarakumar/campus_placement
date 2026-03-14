const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const { startDeadlineScheduler } = require('./scheduler');

const app = express();

// Middleware
app.use(cors({ origin: 'https://campus-placement-tau.vercel.app', credentials: true }));
app.use(express.json());

// Serve uploaded files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hr/auth', require('./routes/hrAuth'));
app.use('/api/coordinator/auth', require('./routes/coordinatorAuth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/drives', require('./routes/drives'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Placement Portal API is running' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startDeadlineScheduler();
});
