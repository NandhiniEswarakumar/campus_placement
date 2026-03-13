const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
      required: [true, 'Job reference is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    hr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HR',
      required: [true, 'HR reference is required'],
    },
    status: {
      type: String,
      enum: ['applied', 'reviewed', 'shortlisted', 'rejected', 'selected'],
      default: 'applied',
    },
    coverLetter: {
      type: String,
      default: '',
    },
    collegeMail: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    workExperience: {
      type: String,
      trim: true,
      default: '',
    },
    resumePath: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// One student can apply to one job only once
applicationSchema.index({ job: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
