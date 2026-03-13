const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const JobPosting = require('../models/JobPosting');
const HR = require('../models/HR');
const Student = require('../models/Student');
const { createManyNotifications } = require('../services/notificationService');

const router = express.Router();

// ── HR auth middleware (extracts HR user from token) ──
const requireHR = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied. HR only.' });
    }
    req.hr = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// ==================== HR ROUTES (protected) ====================

// GET /api/jobs/hr — list jobs posted by this HR
router.get('/hr', requireHR, async (req, res) => {
  try {
    const jobs = await JobPosting.find({ postedBy: req.hr.id })
      .sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (error) {
    console.error('Fetch HR jobs error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/jobs — create a new job posting
router.post(
  '/',
  requireHR,
  [
    body('title').trim().notEmpty().withMessage('Job title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('jobType').isIn(['Full-Time', 'Internship', 'Contract', 'Part-Time'])
      .withMessage('Invalid job type'),
    body('location').trim().notEmpty().withMessage('Location is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const hr = await HR.findById(req.hr.id);
      if (!hr) return res.status(404).json({ message: 'HR user not found.' });

      const {
        title, description, requirements, skills,
        jobType, location, salary, department, openings, deadline,
      } = req.body;

      const job = await JobPosting.create({
        title,
        description,
        requirements: requirements || [],
        skills: skills || [],
        jobType,
        location,
        salary,
        department,
        openings: openings || 1,
        deadline: deadline || null,
        status: 'active',
        postedBy: hr._id,
        company: hr.company,
      });

      // Notify all students about new job
      const students = await Student.find().select('_id');
      const notifications = students.map((s) => ({
        recipient: s._id,
        recipientModel: 'Student',
        type: 'job_posted',
        title: 'New Job Posted',
        message: `${hr.company} posted a new ${jobType} role: ${title}`,
        relatedJob: job._id,
      }));
      await createManyNotifications(notifications);

      res.status(201).json({ message: 'Job created successfully', job });
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// PUT /api/jobs/:id — update a job posting (HR owner only)
router.put('/:id', requireHR, async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (job.postedBy.toString() !== req.hr.id) {
      return res.status(403).json({ message: 'Not authorized to edit this job.' });
    }

    const allowed = [
      'title', 'description', 'requirements', 'skills',
      'jobType', 'location', 'salary', 'department', 'openings', 'deadline', 'status',
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) job[field] = req.body[field];
    });

    await job.save();
    res.json({ message: 'Job updated', job });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/jobs/:id/archive — toggle archive (HR owner only)
router.patch('/:id/archive', requireHR, async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (job.postedBy.toString() !== req.hr.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    job.status = job.status === 'archived' ? 'active' : 'archived';
    await job.save();
    res.json({ message: `Job ${job.status}`, job });
  } catch (error) {
    console.error('Archive job error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ==================== PUBLIC / STUDENT ROUTES ====================

// GET /api/jobs — list all active jobs (for students)
router.get('/', async (req, res) => {
  try {
    const jobs = await JobPosting.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .populate('postedBy', 'name company');
    res.json({ jobs });
  } catch (error) {
    console.error('Fetch public jobs error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
