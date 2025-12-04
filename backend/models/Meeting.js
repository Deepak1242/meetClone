const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: String,
  email: String,
  joinedAt: Date,
  leftAt: Date,
});

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  senderName: String,
  text: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
});

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'ended'],
    default: 'scheduled',
  },
  invitees: [{
    email: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  participants: [participantSchema],
  messages: [messageSchema],
  recordingUrl: {
    type: String,
  },
  settings: {
    waitingRoom: {
      type: Boolean,
      default: false,
    },
    muteOnEntry: {
      type: Boolean,
      default: false,
    },
    allowScreenShare: {
      type: Boolean,
      default: true,
    },
    allowRecording: {
      type: Boolean,
      default: true,
    },
    allowChat: {
      type: Boolean,
      default: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp
meetingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for duration
meetingSchema.virtual('duration').get(function() {
  if (this.endTime && this.scheduledTime) {
    return Math.round((this.endTime - this.scheduledTime) / 60000); // in minutes
  }
  return 0;
});

// Indexes
meetingSchema.index({ host: 1, scheduledTime: -1 });
meetingSchema.index({ 'invitees.email': 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
