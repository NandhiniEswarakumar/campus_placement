const mongoose = require('mongoose');

const placementDriveSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Drive title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    companies: [
      {
        type: String,
        trim: true,
      },
    ],
    date: {
      type: Date,
      required: [true, 'Drive date is required'],
    },
    venue: {
      type: String,
      trim: true,
    },
    eligibleDepartments: [
      {
        type: String,
        trim: true,
      },
    ],
    minCGPA: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    deadline: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coordinator',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);
