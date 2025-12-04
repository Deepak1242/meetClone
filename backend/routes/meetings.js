const express = require('express');
const Meeting = require('../models/Meeting');
const { auth, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const router = express.Router();

// Email transporter setup
const createTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return null;
};

// Send invitation email
const sendInvitationEmail = async (email, meeting, hostName) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log(`[Email] Would send invitation to ${email} for meeting ${meeting.meetingId}`);
    return;
  }

  const meetingLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/join/${meeting.meetingId}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `You're invited to ${meeting.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">You're invited to a meeting!</h2>
        <p>Hi,</p>
        <p><strong>${hostName}</strong> has invited you to join a MeetUp meeting.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px;">${meeting.name}</h3>
          <p style="margin: 0; color: #6b7280;">
            Scheduled: ${new Date(meeting.scheduledTime).toLocaleString()}
          </p>
        </div>
        <a href="${meetingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Join Meeting
        </a>
        <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
          Or copy this link: ${meetingLink}
        </p>
      </div>
    `,
  });
};

// @route   GET /api/meetings
// @desc    Get all meetings for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { 'invitees.email': req.user.email },
      ],
    })
      .populate('host', 'name email')
      .sort({ scheduledTime: -1 });

    res.json(meetings);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/meetings/:meetingId
// @desc    Get single meeting
// @access  Private
router.get('/:meetingId', optionalAuth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId })
      .populate('host', 'name email');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/meetings
// @desc    Create a new meeting
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { meetingId, name, scheduledTime, invitees, settings } = req.body;

    // Create meeting
    const meeting = new Meeting({
      meetingId: meetingId || uuidv4().split('-')[0],
      name: name || `Meeting ${Date.now()}`,
      host: req.user._id,
      scheduledTime: scheduledTime || new Date(),
      invitees: (invitees || []).filter(email => email).map(email => ({
        email: email.toLowerCase(),
        status: 'pending',
      })),
      settings: settings || {},
    });

    await meeting.save();

    // Send invitation emails
    if (meeting.invitees.length > 0) {
      for (const invitee of meeting.invitees) {
        try {
          await sendInvitationEmail(invitee.email, meeting, req.user.name);
        } catch (emailError) {
          console.error(`Failed to send invitation to ${invitee.email}:`, emailError);
        }
      }
    }

    // Populate host info before sending response
    await meeting.populate('host', 'name email');

    res.status(201).json(meeting);
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/meetings/:meetingId
// @desc    Update meeting
// @access  Private (host only)
router.put('/:meetingId', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this meeting' });
    }

    const { name, scheduledTime, invitees, settings, status } = req.body;

    if (name) meeting.name = name;
    if (scheduledTime) meeting.scheduledTime = scheduledTime;
    if (settings) meeting.settings = { ...meeting.settings, ...settings };
    if (status) meeting.status = status;
    
    if (invitees) {
      // Get new invitees
      const existingEmails = meeting.invitees.map(i => i.email);
      const newEmails = invitees.filter(email => email && !existingEmails.includes(email.toLowerCase()));
      
      // Add new invitees
      for (const email of newEmails) {
        meeting.invitees.push({
          email: email.toLowerCase(),
          status: 'pending',
        });
        
        try {
          await sendInvitationEmail(email, meeting, req.user.name);
        } catch (emailError) {
          console.error(`Failed to send invitation to ${email}:`, emailError);
        }
      }
    }

    await meeting.save();
    await meeting.populate('host', 'name email');

    res.json(meeting);
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/meetings/:meetingId
// @desc    Delete meeting
// @access  Private (host only)
router.delete('/:meetingId', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this meeting' });
    }

    await Meeting.deleteOne({ _id: meeting._id });

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/meetings/:meetingId/join
// @desc    Join a meeting
// @access  Private
router.post('/:meetingId/join', optionalAuth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const participantData = {
      joinedAt: new Date(),
    };

    if (req.user) {
      participantData.user = req.user._id;
      participantData.name = req.user.name;
      participantData.email = req.user.email;
    } else {
      participantData.name = req.body.name || 'Guest';
    }

    meeting.participants.push(participantData);
    
    if (meeting.status === 'scheduled') {
      meeting.status = 'ongoing';
    }

    await meeting.save();

    res.json({ 
      message: 'Joined meeting successfully',
      meeting: {
        meetingId: meeting.meetingId,
        name: meeting.name,
        settings: meeting.settings,
      },
    });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/meetings/:meetingId/leave
// @desc    Leave a meeting
// @access  Private
router.post('/:meetingId/leave', optionalAuth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Find and update participant
    if (req.user) {
      const participant = meeting.participants.find(
        p => p.user?.toString() === req.user._id.toString() && !p.leftAt
      );
      if (participant) {
        participant.leftAt = new Date();
      }
    }

    // Check if all participants have left
    const activeParticipants = meeting.participants.filter(p => !p.leftAt);
    if (activeParticipants.length === 0) {
      meeting.status = 'ended';
      meeting.endTime = new Date();
    }

    await meeting.save();

    res.json({ message: 'Left meeting successfully' });
  } catch (error) {
    console.error('Leave meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/meetings/:meetingId/end
// @desc    End a meeting
// @access  Private (host only)
router.post('/:meetingId/end', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to end this meeting' });
    }

    meeting.status = 'ended';
    meeting.endTime = new Date();

    // Mark all participants as left
    meeting.participants.forEach(p => {
      if (!p.leftAt) {
        p.leftAt = new Date();
      }
    });

    await meeting.save();

    res.json({ message: 'Meeting ended successfully' });
  } catch (error) {
    console.error('End meeting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/meetings/:meetingId/recording
// @desc    Save recording URL
// @access  Private (host only)
router.post('/:meetingId/recording', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    meeting.recordingUrl = req.body.recordingUrl;
    await meeting.save();

    res.json({ message: 'Recording saved successfully' });
  } catch (error) {
    console.error('Save recording error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
