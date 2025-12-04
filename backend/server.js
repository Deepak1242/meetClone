require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://frontend-jcgdb99eg-demoncommander12-1854s-projects.vercel.app',
  'https://frontend-demoncommander12-1854s-projects.vercel.app',
  'https://meetclone-sk68.onrender.com',
  process.env.CLIENT_URL,
].filter(Boolean);

// Also allow any vercel.app subdomain
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
};

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all for now
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// SOCKET.IO ROOM MANAGEMENT
// ============================================

// Room data structure
const rooms = new Map();
// Track visitorId to socketId mapping for refresh handling
// Key: `${roomId}:${visitorId}`, Value: socketId
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ============================================
  // JOIN ROOM
  // ============================================
  socket.on('join-room', ({ roomId, visitorId, userName }) => {
    console.log(`\n=== JOIN ROOM: ${userName} (${visitorId}) joining ${roomId} ===`);
    
    const existingRoom = rooms.get(roomId);
    
    // Check if meeting is locked (but allow host to rejoin)
    if (existingRoom?.locked && existingRoom.hostUserId !== visitorId) {
      socket.emit('meeting-is-locked');
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.visitorId = visitorId;
    socket.userName = userName;
    
    // Track this user's socket for refresh detection
    const visitorKey = `${roomId}:${visitorId}`;
    const oldSocketId = userSockets.get(visitorKey);
    userSockets.set(visitorKey, socket.id);

    // Initialize room if not exists (first person becomes host)
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        hostSocketId: socket.id,
        hostUserId: visitorId,       // Persistent - never changes unless host truly leaves
        participants: new Map(),
        locked: false,
        mutedUsers: new Set(),    // Track userIds muted by host
      });
      console.log(`Created new room ${roomId}, host: ${userName} (${visitorId})`);
    }

    const room = rooms.get(roomId);
    
    // Handle refresh: clean up old socket for same user
    if (oldSocketId && oldSocketId !== socket.id) {
      console.log(`Refresh detected: ${userName} old socket ${oldSocketId} -> new socket ${socket.id}`);
      
      // Remove old socket from participants
      room.participants.delete(oldSocketId);
      
      // Tell everyone to clean up the old socket's connection
      socket.to(roomId).emit('user-left', { socketId: oldSocketId, visitorId: visitorId });
      
      // If old socket was the host socket, update to new socket
      // BUT keep hostUserId the same - this is the key fix
      if (room.hostSocketId === oldSocketId) {
        room.hostSocketId = socket.id;
        console.log(`Updated host socket from ${oldSocketId} to ${socket.id}`);
      }
    }
    
    // Restore host status if this user is the original host
    if (room.hostUserId === visitorId) {
      room.hostSocketId = socket.id;
      console.log(`Restored host status to ${userName} (hostUserId: ${room.hostUserId})`);
    }
    
    // Add to participants
    room.participants.set(socket.id, { visitorId, userName });

    // Determine if current user is host
    const isHost = room.hostSocketId === socket.id;
    
    // Notify others in the room about new user
    socket.to(roomId).emit('user-joined', {
      visitorId,
      userName,
      socketId: socket.id,
      isHost: isHost,
    });

    // Build list of existing participants for new joiner
    const participantsList = [];
    room.participants.forEach((user, sid) => {
      if (sid !== socket.id) {
        participantsList.push({
          socketId: sid,
          visitorId: user.visitorId,
          userName: user.userName,
          isHost: sid === room.hostSocketId,
        });
      }
    });
    
    // Check if user was muted by host (persists across refresh)
    const wasMuted = room.mutedUsers.has(visitorId);
    
    // Send room info to new joiner
    socket.emit('room-participants', participantsList, { 
      isHost: isHost, 
      hostSocketId: room.hostSocketId,
      wasMuted: wasMuted
    });

    console.log(`${userName} joined room ${roomId} (isHost: ${isHost}, wasMuted: ${wasMuted}, participants: ${room.participants.size})`);
  });

  // ============================================
  // WEBRTC SIGNALING
  // ============================================
  socket.on('offer', ({ to, offer }) => {
    console.log(`Offer: ${socket.id} -> ${to}`);
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    console.log(`Answer: ${socket.id} -> ${to}`);
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  // ============================================
  // CHAT & REACTIONS
  // ============================================
  socket.on('chat-message', ({ roomId, message }) => {
    socket.to(roomId).emit('chat-message', message);
  });

  socket.on('reaction', ({ roomId, emoji }) => {
    socket.to(roomId).emit('reaction', { emoji, visitorId: socket.visitorId });
  });

  socket.on('raise-hand', ({ roomId, raised }) => {
    socket.to(roomId).emit('hand-raised', { visitorId: socket.visitorId, socketId: socket.id, raised });
  });

  // ============================================
  // AUDIO/VIDEO TOGGLE
  // ============================================
  socket.on('toggle-audio', ({ roomId, muted }) => {
    socket.to(roomId).emit('user-audio-toggle', { socketId: socket.id, muted });
  });

  socket.on('toggle-video', ({ roomId, videoOff }) => {
    socket.to(roomId).emit('user-video-toggle', { socketId: socket.id, videoOff });
  });

  socket.on('screen-share', ({ roomId, sharing }) => {
    socket.to(roomId).emit('user-screen-share', { visitorId: socket.visitorId, sharing });
  });

  // ============================================
  // HOST CONTROLS
  // ============================================
  
  // Remove user (host only)
  socket.on('remove-user', ({ roomId, targetSocketId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) {
      const targetUser = room.participants.get(targetSocketId);
      if (targetUser) {
        // Clean up user tracking
        const visitorKey = `${roomId}:${targetUser.visitorId}`;
        userSockets.delete(visitorKey);
        room.participants.delete(targetSocketId);
        room.mutedUsers.delete(targetUser.visitorId);
      }
      
      // Notify the removed user
      io.to(targetSocketId).emit('removed-from-meeting');
      // Notify everyone to clean up
      io.to(roomId).emit('user-left', { socketId: targetSocketId });
      
      // Force target to leave room
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(roomId);
      }
      console.log(`Host removed user: ${targetUser?.userName}`);
    }
  });

  // Mute user (host only)
  socket.on('mute-user', ({ roomId, targetSocketId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) {
      const targetUser = room.participants.get(targetSocketId);
      if (targetUser) {
        // Track by visitorId so it persists across refresh
        room.mutedUsers.add(targetUser.visitorId);
        console.log(`Host muted: ${targetUser.userName} (${targetUser.visitorId})`);
      }
      // Force mute the target
      io.to(targetSocketId).emit('force-mute');
      // Notify everyone
      io.to(roomId).emit('user-audio-toggle', { socketId: targetSocketId, muted: true });
    }
  });

  // Unmute user (host only) - allows user to unmute themselves
  socket.on('unmute-user', ({ roomId, targetSocketId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) {
      const targetUser = room.participants.get(targetSocketId);
      if (targetUser) {
        room.mutedUsers.delete(targetUser.visitorId);
        console.log(`Host unmuted: ${targetUser.userName} (${targetUser.visitorId})`);
      }
      io.to(targetSocketId).emit('force-unmute');
      io.to(roomId).emit('user-audio-toggle', { socketId: targetSocketId, muted: false });
    }
  });

  // Mute all (host only)
  socket.on('mute-all', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) {
      console.log('Host muting all participants');
      room.participants.forEach((participant, socketId) => {
        if (socketId !== socket.id) {
          room.mutedUsers.add(participant.visitorId);
          io.to(socketId).emit('force-mute');
        }
      });
      // Notify everyone about mute status
      socket.to(roomId).emit('all-muted');
    }
  });

  // Unmute all (host only)
  socket.on('unmute-all', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) {
      console.log('Host unmuting all participants');
      room.mutedUsers.clear();
      room.participants.forEach((participant, socketId) => {
        if (socketId !== socket.id) {
          io.to(socketId).emit('force-unmute');
        }
      });
    }
  });

  // End meeting for all (host only)
  socket.on('end-meeting-for-all', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) {
      console.log(`Host ending meeting ${roomId} for all`);
      io.to(roomId).emit('meeting-ended');
      
      // Clean up all user socket mappings
      room.participants.forEach((participant, socketId) => {
        const visitorKey = `${roomId}:${participant.visitorId}`;
        userSockets.delete(visitorKey);
        const targetSocket = io.sockets.sockets.get(socketId);
        if (targetSocket) {
          targetSocket.leave(roomId);
        }
      });
      rooms.delete(roomId);
    }
  });

  // Lock/unlock meeting (host only)
  socket.on('toggle-lock', ({ roomId, locked }) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) {
      room.locked = locked;
      socket.to(roomId).emit('meeting-locked', { locked });
      console.log(`Meeting ${roomId} ${locked ? 'locked' : 'unlocked'}`);
    }
  });

  // Spotlight participant (host only)
  socket.on('spotlight', ({ roomId, targetSocketId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostSocketId === socket.id) {
      io.to(roomId).emit('user-spotlighted', { socketId: targetSocketId });
    }
  });

  // ============================================
  // LEAVE ROOM & DISCONNECT
  // ============================================
  socket.on('leave-room', ({ roomId }) => {
    handleLeaveRoom(socket, roomId, false);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.roomId) {
      handleLeaveRoom(socket, socket.roomId, true);
    }
  });
});

/**
 * Handle user leaving room
 * @param {Socket} socket - The socket that's leaving
 * @param {string} roomId - The room ID
 * @param {boolean} isDisconnect - Whether this is from disconnect event
 */
function handleLeaveRoom(socket, roomId, isDisconnect) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const leavingUserId = socket.visitorId;
  const visitorKey = `${roomId}:${leavingUserId}`;
  
  // For disconnects, wait briefly to check for refresh (reconnect)
  const delay = isDisconnect ? 1500 : 0;
  
  setTimeout(() => {
    const currentRoom = rooms.get(roomId);
    if (!currentRoom) return;
    
    const currentSocketForUser = userSockets.get(visitorKey);
    
    // If user has a new socket (refreshed), ignore this disconnect
    if (currentSocketForUser && currentSocketForUser !== socket.id) {
      console.log(`Ignoring disconnect from old socket ${socket.id}, user ${leavingUserId} has new socket ${currentSocketForUser}`);
      // Just clean up old socket from participants if still there
      currentRoom.participants.delete(socket.id);
      return;
    }
    
    // If host socket was updated (refresh), but this is old socket, ignore
    if (currentRoom.hostUserId === leavingUserId && currentRoom.hostSocketId !== socket.id) {
      console.log(`Ignoring disconnect - host has new socket ${currentRoom.hostSocketId}`);
      currentRoom.participants.delete(socket.id);
      return;
    }
    
    // User already removed (by newer socket joining)
    if (!currentRoom.participants.has(socket.id)) {
      console.log(`Socket ${socket.id} already removed from participants`);
      return;
    }
    
    // Actually remove the user
    currentRoom.participants.delete(socket.id);
    userSockets.delete(visitorKey);
    currentRoom.mutedUsers.delete(leavingUserId);
    
    // Notify others
    io.to(roomId).emit('user-left', {
      visitorId: socket.visitorId,
      socketId: socket.id,
    });
    console.log(`User ${socket.userName} left room ${roomId}`);

    // Clean up empty room
    if (currentRoom.participants.size === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
      return;
    }
    
    // If host left, assign new host
    if (currentRoom.hostSocketId === socket.id) {
      const newHostSocketId = currentRoom.participants.keys().next().value;
      const newHostData = currentRoom.participants.get(newHostSocketId);
      
      currentRoom.hostSocketId = newHostSocketId;
      currentRoom.hostUserId = newHostData.visitorId;
      
      io.to(roomId).emit('new-host', { hostSocketId: newHostSocketId });
      console.log(`New host assigned: ${newHostData.userName} (${newHostData.visitorId})`);
    }
  }, delay);
  
  socket.leave(roomId);
}

// ============================================
// DATABASE CONNECTION
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meetup';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    console.log('Running without database...');
  });

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO enabled`);
});

module.exports = { app, server, io };
