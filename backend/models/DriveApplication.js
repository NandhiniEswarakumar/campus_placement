const mongoose = require('mongoose');

const DEFAULT_INTERVIEW_STAGES = [
  { key: 'aptitude_test', label: 'Aptitude Test', order: 1 },
  { key: 'technical_interview', label: 'Technical Interview', order: 2 },
  { key: 'hr_interview', label: 'HR Interview', order: 3 },
  { key: 'final_result', label: 'Final Result', order: 4 },
];

const interviewStageSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      enum: DEFAULT_INTERVIEW_STAGES.map((stage) => stage.key),
    },
    label: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'scheduled', 'completed'],
      default: 'pending',
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const driveApplicationSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementDrive',
      required: [true, 'Drive reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    resumePath: {
      type: String,
      required: [true, 'Resume is required'],
    },
    status: {
      type: String,
      enum: ['submitted', 'reviewed', 'shortlisted', 'rejected', 'selected'],
      default: 'submitted',
    },
    currentStageKey: {
      type: String,
      enum: [...DEFAULT_INTERVIEW_STAGES.map((stage) => stage.key), 'completed'],
      default: 'aptitude_test',
    },
    interviewStages: {
      type: [interviewStageSchema],
      default: () => DEFAULT_INTERVIEW_STAGES.map((stage) => ({ ...stage, status: 'pending' })),
    },
    roundExperiences: {
      type: [
        {
          stageKey: { type: String, required: true },
          stageLabel: { type: String, required: true },
          remark: { type: String, trim: true, maxlength: 300, default: '' },
          content: { type: String, required: true, trim: true, maxlength: 5000 },
          tips: { type: String, trim: true, maxlength: 2000, default: '' },
          difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
          submittedAt: { type: Date, default: () => new Date() },
        },
      ],
      default: [],
    },
    feedbackHistory: {
      type: [
        {
          stageKey: { type: String, required: true },
          stageLabel: { type: String, required: true },
          stageStatus: {
            type: String,
            enum: ['pending', 'passed', 'failed', 'scheduled', 'completed'],
            required: true,
          },
          feedback: { type: String, trim: true, maxlength: 2000, default: '' },
          scheduledAt: { type: Date, default: null },
          coordinator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coordinator',
            required: true,
          },
          coordinatorName: { type: String, required: true },
          createdAt: { type: Date, default: () => new Date() },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// One student can apply to one drive only once
driveApplicationSchema.index({ drive: 1, student: 1 }, { unique: true });

driveApplicationSchema.statics.DEFAULT_INTERVIEW_STAGES = DEFAULT_INTERVIEW_STAGES;

module.exports = mongoose.model('DriveApplication', driveApplicationSchema);
