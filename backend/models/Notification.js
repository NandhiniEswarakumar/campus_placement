const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ['Student', 'HR', 'Coordinator'],
    },
    type: {
      type: String,
      required: true,
      enum: [
        'job_posted',           // HR posts a job → notify students
        'application_received', // student applies → notify HR
        'application_status',   // HR updates status → notify student
        'drive_announced',      // coordinator announces drive → notify students
        'drive_updated',        // coordinator updates drive → notify students
        'placement_result',     // coordinator marks student failed/rejected → strong alert
        'round_passed',         // student passed a round → can submit experience
        'document_uploaded',    // coordinator uploads/updates drive document
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
    },
    relatedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
    },
    relatedDrive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementDrive',
    },
    relatedDriveApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DriveApplication',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
