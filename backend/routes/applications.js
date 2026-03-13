const express = require('express');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const JobPosting = require('../models/JobPosting');
const Student = require('../models/Student');
const { requireRole } = require('../middleware/roleAuth');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

// Multer config for resume uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'resumes')),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  },
});

const requireStudent = requireRole('student');
const requireHR = requireRole('hr');

// ==================== STUDENT ROUTES ====================

// POST /api/applications — student applies to a job (with resume upload)
router.post(
  '/',
  requireStudent,
  upload.single('resume'),
  async (req, res) => {
    try {
      const { jobId, name, collegeMail, location, workExperience } = req.body;
      if (!jobId) return res.status(400).json({ message: 'Job ID is required' });

      const job = await JobPosting.findById(jobId);
      if (!job) return res.status(404).json({ message: 'Job not found.' });
      if (job.status !== 'active') {
        return res.status(400).json({ message: 'This job is no longer accepting applications.' });
      }

      // Check duplicate
      const existing = await Application.findOne({ job: jobId, student: req.user.id });
      if (existing) {
        return res.status(400).json({ message: 'You have already applied to this job.' });
      }

      const student = await Student.findById(req.user.id);
      if (!student) return res.status(404).json({ message: 'Student not found.' });

      const application = await Application.create({
        job: jobId,
        student: req.user.id,
        hr: job.postedBy,
        collegeMail: collegeMail || '',
        location: location || '',
        workExperience: workExperience || '',
        resumePath: req.file ? `/uploads/resumes/${req.file.filename}` : '',
      });

      // Notify HR about new application
      await createNotification({
        recipient: job.postedBy,
        recipientModel: 'HR',
        type: 'application_received',
        title: 'New Application',
        message: `${student.name} applied for ${job.title}`,
        relatedJob: job._id,
        relatedApplication: application._id,
      });

      res.status(201).json({ message: 'Application submitted successfully', application });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: 'You have already applied to this job.' });
      }
      console.error('Apply error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// GET /api/applications/my — student's own applications
router.get('/my', requireStudent, async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate('job', 'title company jobType location salary deadline status')
      .sort({ createdAt: -1 });
    res.json({ applications });
  } catch (error) {
    console.error('Fetch student applications error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ==================== HR ROUTES ====================

// GET /api/applications/hr — all applications for HR's jobs
router.get('/hr', requireHR, async (req, res) => {
  try {
    const applications = await Application.find({ hr: req.user.id })
      .populate('student', 'name email rollNumber department graduationYear phone')
      .populate('job', 'title company jobType location')
      .sort({ createdAt: -1 });
    res.json({ applications });
  } catch (error) {
    console.error('Fetch HR applications error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/applications/:id/status — HR updates application status
router.patch(
  '/:id/status',
  requireHR,
  [body('status').isIn(['reviewed', 'shortlisted', 'rejected', 'selected']).withMessage('Invalid status')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const application = await Application.findById(req.params.id)
        .populate('job', 'title company');
      if (!application) return res.status(404).json({ message: 'Application not found.' });
      if (application.hr.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized.' });
      }

      application.status = req.body.status;
      await application.save();

      // Notify student about status change
      const statusLabels = {
        reviewed: 'is being reviewed',
        shortlisted: 'has been shortlisted',
        rejected: 'has been rejected',
        selected: 'has been selected',
      };

      await createNotification({
        recipient: application.student,
        recipientModel: 'Student',
        type: 'application_status',
        title: 'Application Update',
        message: `Your application for ${application.job.title} at ${application.job.company} ${statusLabels[req.body.status]}`,
        relatedJob: application.job._id,
        relatedApplication: application._id,
      });

      res.json({ message: 'Status updated', application });
    } catch (error) {
      console.error('Update application status error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// ==================== COORDINATOR ROUTES ====================

// GET /api/applications/all — coordinator sees all applications
router.get('/all', requireRole('coordinator'), async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('student', 'name email rollNumber department graduationYear')
      .populate('job', 'title company jobType status')
      .sort({ createdAt: -1 });
    res.json({ applications });
  } catch (error) {
    console.error('Fetch all applications error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
