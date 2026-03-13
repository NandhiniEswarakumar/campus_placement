const express = require('express');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const PlacementDrive = require('../models/PlacementDrive');
const DriveApplication = require('../models/DriveApplication');
const Coordinator = require('../models/Coordinator');
const Student = require('../models/Student');
const { requireRole, requireAuth } = require('../middleware/roleAuth');
const {
  createManyNotifications,
  createNotification,
} = require('../services/notificationService');

const router = express.Router();

const requireCoordinator = requireRole('coordinator');
const requireStudent = requireRole('student');
const DEFAULT_INTERVIEW_STAGES = DriveApplication.DEFAULT_INTERVIEW_STAGES;

const STAGE_KEY_TO_APP_STATUS = {
  aptitude_test: 'submitted',
  technical_interview: 'reviewed',
  hr_interview: 'shortlisted',
  final_result: 'shortlisted',
  completed: 'selected',
};

const STAGE_LABELS = Object.fromEntries(DEFAULT_INTERVIEW_STAGES.map((stage) => [stage.key, stage.label]));

function buildInterviewStages() {
  return DEFAULT_INTERVIEW_STAGES.map((stage) => ({ ...stage, status: 'pending' }));
}

function getCurrentStage(application) {
  if (!application.interviewStages || application.interviewStages.length === 0) {
    return null;
  }

  if (application.currentStageKey === 'completed') {
    return application.interviewStages[application.interviewStages.length - 1];
  }

  return application.interviewStages.find((stage) => stage.key === application.currentStageKey)
    || [...application.interviewStages].reverse().find((stage) => stage.status !== 'pending')
    || application.interviewStages[0];
}

function formatStageMessage(stageKey, stageStatus, driveTitle, scheduledAt) {
  const stageLabel = STAGE_LABELS[stageKey] || 'Interview stage';
  if (stageStatus === 'scheduled') {
    if (scheduledAt) {
      const scheduleLabel = new Date(scheduledAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      return `${stageLabel} for ${driveTitle} is scheduled on ${scheduleLabel}`;
    }
    return `Interview scheduled for ${stageLabel} in ${driveTitle}`;
  }
  if (stageStatus === 'passed') {
    return `You are shortlisted for the next round of ${driveTitle}. ${stageLabel} cleared.`;
  }
  if (stageStatus === 'failed') {
    return `You are failed in ${stageLabel} for ${driveTitle}. Please review the coordinator feedback for the round.`;
  }
  if (stageStatus === 'completed') {
    return `${stageLabel} has been completed for ${driveTitle}.`;
  }
  return `Your ${stageLabel} status for ${driveTitle} is now ${stageStatus}.`;
}

function serializeDriveApplication(application) {
  const currentStage = getCurrentStage(application);
  return {
    ...application.toObject(),
    currentRound: currentStage?.label || 'Aptitude Test',
    currentRoundStatus: currentStage?.status || 'pending',
  };
}

// Multer config for drive resume uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'resumes')),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `drive-${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  },
});

// ==================== COORDINATOR ROUTES ====================

// POST /api/drives — create a placement drive
router.post(
  '/',
  requireCoordinator,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('date').notEmpty().withMessage('Date is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const {
        title, description, companies, date,
        venue, eligibleDepartments, minCGPA, status, deadline,
      } = req.body;

      const drive = await PlacementDrive.create({
        title,
        description,
        companies: companies || [],
        date,
        venue: venue || '',
        eligibleDepartments: eligibleDepartments || [],
        minCGPA: minCGPA || 0,
        status: status || 'upcoming',
        deadline: deadline || null,
        createdBy: req.user.id,
      });

      // Notify eligible students
      const studentFilter = {};
      if (eligibleDepartments && eligibleDepartments.length > 0) {
        studentFilter.department = { $in: eligibleDepartments };
      }

      const students = await Student.find(studentFilter).select('_id');
      const notifications = students.map((s) => ({
        recipient: s._id,
        recipientModel: 'Student',
        type: 'drive_announced',
        title: 'New Placement Drive',
        message: `${title} — ${companies && companies.length ? companies.join(', ') : 'Multiple companies'} on ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        relatedDrive: drive._id,
      }));

      await createManyNotifications(notifications);

      res.status(201).json({ message: 'Drive created and students notified', drive });
    } catch (error) {
      console.error('Create drive error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// GET /api/drives/my — coordinator's drives
router.get('/my', requireCoordinator, async (req, res) => {
  try {
    const drives = await PlacementDrive.find({ createdBy: req.user.id })
      .sort({ date: -1 });
    res.json({ drives });
  } catch (error) {
    console.error('Fetch drives error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/drives/:id — update a drive
router.put('/:id', requireCoordinator, async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Drive not found.' });
    if (drive.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const allowed = [
      'title', 'description', 'companies', 'date',
      'venue', 'eligibleDepartments', 'minCGPA', 'status',
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) drive[field] = req.body[field];
    });

    await drive.save();

    // Notify students about update
    const studentFilter = {};
    if (drive.eligibleDepartments && drive.eligibleDepartments.length > 0) {
      studentFilter.department = { $in: drive.eligibleDepartments };
    }

    const students = await Student.find(studentFilter).select('_id');
    const notifications = students.map((s) => ({
      recipient: s._id,
      recipientModel: 'Student',
      type: 'drive_updated',
      title: 'Drive Updated',
      message: `${drive.title} has been updated — check the latest details`,
      relatedDrive: drive._id,
    }));

    await createManyNotifications(notifications);

    res.json({ message: 'Drive updated', drive });
  } catch (error) {
    console.error('Update drive error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/drives/:id — coordinator deletes a drive (only if no applications exist)
router.delete('/:id', requireCoordinator, async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Drive not found.' });
    if (drive.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this drive.' });
    }

    const appCount = await DriveApplication.countDocuments({ drive: req.params.id });
    if (appCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${appCount} application(s) already exist for this drive.`,
      });
    }

    await PlacementDrive.findByIdAndDelete(req.params.id);
    res.json({ message: 'Drive deleted successfully.' });
  } catch (error) {
    console.error('Delete drive error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ==================== PUBLIC / STUDENT ROUTES ====================

// GET /api/drives — all upcoming/ongoing drives (for students)
router.get('/', async (req, res) => {
  try {
    const drives = await PlacementDrive.find({ status: { $in: ['upcoming', 'ongoing'] } })
      .populate('createdBy', 'name college')
      .sort({ date: 1 });
    res.json({ drives });
  } catch (error) {
    console.error('Fetch drives error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/drives/all — coordinator sees all drives
router.get('/all', requireCoordinator, async (req, res) => {
  try {
    const drives = await PlacementDrive.find()
      .populate('createdBy', 'name college')
      .sort({ date: -1 });
    res.json({ drives });
  } catch (error) {
    console.error('Fetch all drives error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ==================== DRIVE APPLICATIONS (Students) ====================

// POST /api/drives/:id/apply — student applies to a drive with resume
router.post(
  '/:id/apply',
  requireStudent,
  upload.single('resume'),
  async (req, res) => {
    try {
      const drive = await PlacementDrive.findById(req.params.id);
      if (!drive) return res.status(404).json({ message: 'Drive not found.' });

      if (drive.status === 'completed' || drive.status === 'cancelled') {
        return res.status(400).json({ message: 'This drive is no longer accepting applications.' });
      }

      if (drive.deadline && new Date(drive.deadline) < new Date()) {
        return res.status(400).json({ message: 'The deadline for this drive has passed.' });
      }

      // Check duplicate
      const existing = await DriveApplication.findOne({ drive: req.params.id, student: req.user.id });
      if (existing) {
        return res.status(400).json({ message: 'You have already applied to this drive.' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Resume file is required.' });
      }

      const application = await DriveApplication.create({
        drive: req.params.id,
        student: req.user.id,
        resumePath: `/uploads/resumes/${req.file.filename}`,
        interviewStages: buildInterviewStages(),
      });

      // Notify coordinator
      if (drive.createdBy) {
        const student = await Student.findById(req.user.id);
        await createNotification({
          recipient: drive.createdBy,
          recipientModel: 'Coordinator',
          type: 'application_received',
          title: 'Drive Application',
          message: `${student?.name || 'A student'} applied for "${drive.title}"`,
          relatedDrive: drive._id,
        });
      }

      res.status(201).json({ message: 'Application submitted successfully', application });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ message: 'You have already applied to this drive.' });
      }
      console.error('Drive apply error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// GET /api/drives/my-applications — student's own drive applications
router.get('/my-applications', requireStudent, async (req, res) => {
  try {
    const applications = await DriveApplication.find({ student: req.user.id })
      .populate('drive', 'title companies date venue status deadline')
      .sort({ createdAt: -1 });
    res.json({ applications: applications.map(serializeDriveApplication) });
  } catch (error) {
    console.error('Fetch drive applications error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ==================== DRIVE APPLICATIONS (Coordinator) ====================

// GET /api/drives/:id/applications — coordinator sees applications for a drive
router.get('/:id/applications', requireCoordinator, async (req, res) => {
  try {
    const applications = await DriveApplication.find({ drive: req.params.id })
      .populate('student', 'name email rollNumber department graduationYear phone')
      .sort({ createdAt: -1 });
    res.json({ applications: applications.map(serializeDriveApplication) });
  } catch (error) {
    console.error('Fetch drive applications error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/drives/all-applications — coordinator sees all drive applications
router.get('/all-applications', requireCoordinator, async (req, res) => {
  try {
    const applications = await DriveApplication.find()
      .populate('student', 'name email rollNumber department graduationYear phone')
      .populate('drive', 'title companies date venue status deadline')
      .sort({ createdAt: -1 });
    res.json({ applications: applications.map(serializeDriveApplication) });
  } catch (error) {
    console.error('Fetch all drive applications error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/drives/applications/:id/status — coordinator updates drive application status
router.patch(
  '/applications/:id/status',
  requireCoordinator,
  [body('status').isIn(['reviewed', 'shortlisted', 'rejected', 'selected']).withMessage('Invalid status')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const application = await DriveApplication.findById(req.params.id)
        .populate('drive', 'title');
      if (!application) return res.status(404).json({ message: 'Application not found.' });

      application.status = req.body.status;
      await application.save();

      // Notify student
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
        title: 'Drive Application Update',
        message: `Your application for "${application.drive.title}" ${statusLabels[req.body.status]}`,
        relatedDrive: application.drive._id,
      });

      res.json({ message: 'Status updated', application: serializeDriveApplication(application) });
    } catch (error) {
      console.error('Update drive application status error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// PATCH /api/drives/applications/:id/interview-stage — coordinator updates interview round
router.patch(
  '/applications/:id/interview-stage',
  requireCoordinator,
  [
    body('stageKey')
      .isIn(DEFAULT_INTERVIEW_STAGES.map((stage) => stage.key))
      .withMessage('Invalid interview stage'),
    body('stageStatus')
      .isIn(['pending', 'passed', 'failed', 'scheduled', 'completed'])
      .withMessage('Invalid interview stage status'),
    body('scheduledAt')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Scheduled date must be valid'),
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be text'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const application = await DriveApplication.findById(req.params.id)
        .populate('drive', 'title createdBy');
      if (!application) return res.status(404).json({ message: 'Application not found.' });

      const coordinator = await Coordinator.findById(req.user.id).select('name');

      const { stageKey, stageStatus, scheduledAt, notes } = req.body;
      if (!application.interviewStages || application.interviewStages.length === 0) {
        application.interviewStages = buildInterviewStages();
      }

      const stage = application.interviewStages.find((item) => item.key === stageKey);
      if (!stage) {
        return res.status(400).json({ message: 'Interview stage not found.' });
      }

      const trimmedNotes = typeof notes === 'string' ? notes.trim() : stage.notes;

      stage.status = stageStatus;
      stage.updatedAt = new Date();
      stage.notes = trimmedNotes;
      stage.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

      const currentIndex = application.interviewStages.findIndex((item) => item.key === stageKey);
      const nextStage = application.interviewStages[currentIndex + 1] || null;

      if (stageStatus === 'passed' && nextStage) {
        application.currentStageKey = nextStage.key;
        if (nextStage.status === 'pending') {
          nextStage.updatedAt = nextStage.updatedAt || new Date();
        }
      } else if (stageStatus === 'passed' && stageKey === 'final_result') {
        application.currentStageKey = 'completed';
        application.status = 'selected';
      } else if (stageStatus === 'failed') {
        application.currentStageKey = stageKey;
        application.status = 'rejected';
      } else {
        application.currentStageKey = stageKey;
        application.status = STAGE_KEY_TO_APP_STATUS[stageKey] || application.status;
      }

      if (stageStatus === 'completed' && stageKey === 'final_result') {
        application.currentStageKey = 'completed';
      }

      if (application.status !== 'rejected' && application.status !== 'selected') {
        application.status = STAGE_KEY_TO_APP_STATUS[application.currentStageKey] || application.status;
      }

      application.feedbackHistory.push({
        stageKey,
        stageLabel: stage.label,
        stageStatus,
        feedback: trimmedNotes || '',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        coordinator: req.user.id,
        coordinatorName: coordinator?.name || 'Coordinator',
        createdAt: new Date(),
      });

      await application.save();

      // Send differentiated notifications based on outcome
      let notifType = 'application_status';
      let notifTitle = 'Interview Round Update';
      const notifMessage = formatStageMessage(stageKey, stageStatus, application.drive.title, scheduledAt);

      if (stageStatus === 'failed') {
        notifType = 'placement_result';
        notifTitle = 'Placement Round Result';
      } else if (stageStatus === 'passed') {
        notifType = 'round_passed';
        notifTitle = 'Round Cleared — Share Your Experience!';
      }

      await createNotification({
        recipient: application.student,
        recipientModel: 'Student',
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        relatedDrive: application.drive._id,
        relatedDriveApplication: application._id,
        metadata: {
          stageKey,
          stageStatus,
          coordinatorId: req.user.id,
          driveTitle: application.drive.title,
        },
      });

      const refreshedApplication = await DriveApplication.findById(application._id)
        .populate('student', 'name email rollNumber department graduationYear phone')
        .populate('drive', 'title companies date venue status deadline');

      res.json({
        message: 'Interview stage updated',
        application: serializeDriveApplication(refreshedApplication),
      });
    } catch (error) {
      console.error('Update interview stage error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// ==================== COORDINATOR — Students list ====================

// GET /api/drives/students — coordinator gets all registered students
router.get('/students', requireCoordinator, async (req, res) => {
  try {
    const students = await Student.find().select('-password').sort({ name: 1 });

    // For each student, check how many drive applications they have
    const driveApps = await DriveApplication.find().select('student drive');
    const appMap = {};
    driveApps.forEach((a) => {
      const sid = a.student.toString();
      if (!appMap[sid]) appMap[sid] = 0;
      appMap[sid]++;
    });

    const studentsWithStats = students.map((s) => ({
      ...s.toObject(),
      driveApplications: appMap[s._id.toString()] || 0,
    }));

    res.json({ students: studentsWithStats });
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ==================== EXPERIENCE SUBMISSIONS ====================

// POST /api/drives/applications/:id/experience — student submits round experience
// Only allowed when the student has passed at least one round for this application
router.post(
  '/applications/:id/experience',
  requireStudent,
  [
    body('stageKey')
      .isIn(DEFAULT_INTERVIEW_STAGES.map((s) => s.key))
      .withMessage('Invalid stage key'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Experience content is required')
      .isLength({ max: 5000 })
      .withMessage('Content must be under 5000 characters'),
    body('tips')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Tips must be under 2000 characters'),
    body('remark')
      .optional()
      .isString()
      .isLength({ max: 300 })
      .withMessage('Remark must be under 300 characters'),
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Difficulty must be easy, medium, or hard'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const application = await DriveApplication.findById(req.params.id)
        .populate('drive', 'title');
      if (!application) return res.status(404).json({ message: 'Application not found.' });

      // Must be the student's own application
      if (application.student.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized.' });
      }

      const { stageKey, remark, content, tips, difficulty } = req.body;

      // The student must have passed this stage to submit an experience for it
      const stage = application.interviewStages.find((s) => s.key === stageKey);
      if (!stage || stage.status !== 'passed') {
        return res.status(400).json({
          message: 'You can only submit an experience for a round you have passed.',
        });
      }

      // Prevent duplicate experience for the same stage
      const alreadySubmitted = application.roundExperiences.some((e) => e.stageKey === stageKey);
      if (alreadySubmitted) {
        return res.status(400).json({
          message: 'You have already submitted an experience for this round.',
        });
      }

      const stageLabel = STAGE_LABELS[stageKey] || stageKey;
      application.roundExperiences.push({
        stageKey,
        stageLabel,
        remark: typeof remark === 'string' ? remark.trim() : '',
        content: content.trim(),
        tips: tips ? tips.trim() : '',
        difficulty: difficulty || 'medium',
        submittedAt: new Date(),
      });
      await application.save();

      res.status(201).json({
        message: 'Experience submitted successfully',
        experience: application.roundExperiences[application.roundExperiences.length - 1],
      });
    } catch (error) {
      console.error('Submit experience error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// GET /api/drives/applications/:id/experiences — get all experiences for an application
router.get('/applications/:id/experiences', requireAuth, async (req, res) => {
  try {
    const application = await DriveApplication.findById(req.params.id)
      .populate('student', 'name email rollNumber department')
      .populate('drive', 'title companies');
    if (!application) return res.status(404).json({ message: 'Application not found.' });

    // Students can only view their own; coordinators can view all
    if (req.user.role === 'student' && application.student._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    res.json({ experiences: application.roundExperiences });
  } catch (error) {
    console.error('Fetch experiences error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ==================== FEEDBACK HISTORY ====================

// GET /api/drives/feedback-history — coordinator gets all feedback across all rounds
router.get('/feedback-history', requireCoordinator, async (req, res) => {
  try {
    const { driveId, stageKey, studentId } = req.query;

    const filter = {};
    if (driveId) filter.drive = driveId;
    if (studentId) filter.student = studentId;

    const applications = await DriveApplication.find(filter)
      .populate('student', 'name email rollNumber department graduationYear')
      .populate('drive', 'title companies date')
      .sort({ updatedAt: -1 });

    const feedbackHistory = [];
    for (const app of applications) {
      for (const entry of (app.feedbackHistory || [])) {
        if (stageKey && entry.stageKey !== stageKey) continue;

        feedbackHistory.push({
          applicationId: app._id,
          student: app.student,
          drive: app.drive,
          stageKey: entry.stageKey,
          stageLabel: entry.stageLabel,
          stageStatus: entry.stageStatus,
          feedback: entry.feedback,
          scheduledAt: entry.scheduledAt,
          updatedAt: entry.createdAt,
          coordinator: entry.coordinator,
          coordinatorName: entry.coordinatorName,
          applicationStatus: app.status,
        });
      }
    }

    // Sort newest first
    feedbackHistory.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    res.json({ feedbackHistory, total: feedbackHistory.length });
  } catch (error) {
    console.error('Fetch feedback history error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/drives/all-experiences — coordinator views all student experience submissions
router.get('/all-experiences', requireCoordinator, async (req, res) => {
  try {
    const applications = await DriveApplication.find({ 'roundExperiences.0': { $exists: true } })
      .populate('student', 'name email rollNumber department')
      .populate('drive', 'title companies')
      .sort({ updatedAt: -1 });

    const allExperiences = [];
    for (const app of applications) {
      for (const exp of app.roundExperiences) {
        allExperiences.push({
          applicationId: app._id,
          student: app.student,
          drive: app.drive,
          stageKey: exp.stageKey,
          stageLabel: exp.stageLabel,
          remark: exp.remark,
          content: exp.content,
          tips: exp.tips,
          difficulty: exp.difficulty,
          submittedAt: exp.submittedAt,
        });
      }
    }

    allExperiences.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
    res.json({ experiences: allExperiences, total: allExperiences.length });
  } catch (error) {
    console.error('Fetch all experiences error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
