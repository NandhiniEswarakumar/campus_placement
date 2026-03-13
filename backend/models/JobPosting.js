const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    requirements: {
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    jobType: {
      type: String,
      enum: ['Full-Time', 'Internship', 'Contract', 'Part-Time'],
      required: [true, 'Job type is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    salary: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    openings: {
      type: Number,
      default: 1,
    },
    deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'archived'],
      default: 'active',
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HR',
      required: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

jobPostingSchema.index({ title: 'text', description: 'text', skills: 'text' });

module.exports = mongoose.model('JobPosting', jobPostingSchema);
