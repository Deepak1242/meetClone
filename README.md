# MeetUp - Video Conferencing Application

A fully functional, production-ready Google Meet/Zoom clone built with React, Node.js, WebRTC, and Socket.IO.

![MeetUp](https://images.unsplash.com/photo-1609619385002-f40f1df9b7eb?w=800&h=400&fit=crop)

## 🚀 Features

### Core Features
- **High-Quality Video & Audio** - Crystal clear HD video with adaptive quality
- **Screen Sharing** - Share your entire screen or specific windows
- **Real-Time Chat** - Send messages during meetings with pinning support
- **Cloud Recording** - Record meetings and download later
- **Reactions** - Send emoji reactions during meetings (👍, 👏, ❤️, 😂, 😮, 🎉)

### Meeting Controls
- Mute/Unmute microphone
- Turn video on/off
- Raise hand feature
- Screen sharing
- Meeting recording
- Participant management

### Advanced Features
- **Waiting Room** - Host can admit participants
- **Host Controls** - Mute participants, remove from meeting
- **Scheduled Meetings** - Create and schedule meetings in advance
- **Email Invitations** - Send invites to participants
- **Meeting History** - View past meetings and recordings

### Security
- JWT-based authentication
- Encrypted communications
- Waiting room support

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for styling
- **React Router v6** for navigation
- **React Hook Form** for form handling
- **Socket.IO Client** for real-time communication
- **WebRTC** for video/audio streaming

### Backend
- **Node.js** with Express.js
- **Socket.IO** for real-time signaling
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Nodemailer** for email invitations

### DevOps
- **Docker** & Docker Compose for containerization
- **Nginx** for production frontend serving

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/meetup.git
cd meetup
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
npm install
```

4. **Configure Environment Variables**

Create `.env` file in the backend folder:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/meetup
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=http://localhost:3000

# Optional: Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

5. **Start MongoDB** (if running locally)
```bash
mongod
```

6. **Start Backend Server**
```bash
cd backend
npm run dev
```

7. **Start Frontend Development Server**
```bash
cd frontend
npm run dev
```

8. **Open the application**
Visit `http://localhost:3000`

### Using Docker

1. **Development with Docker Compose**
```bash
docker-compose -f docker-compose.dev.yml up --build
```

2. **Production with Docker Compose**
```bash
docker-compose up --build
```

## 📁 Project Structure

```
meetup/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React contexts
│   │   ├── pages/           # Page components
│   │   ├── App.jsx          # Main app component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── public/              # Static assets
│   ├── Dockerfile           # Production dockerfile
│   ├── Dockerfile.dev       # Development dockerfile
│   └── package.json
│
├── backend/                  # Node.js backend
│   ├── models/              # Mongoose models
│   ├── routes/              # API routes
│   ├── middleware/          # Express middleware
│   ├── server.js            # Main server file
│   ├── Dockerfile           # Production dockerfile
│   ├── Dockerfile.dev       # Development dockerfile
│   └── package.json
│
├── docker-compose.yml        # Production compose
├── docker-compose.dev.yml    # Development compose
└── README.md
```

## 🎨 Design System

### Colors
- **Primary**: `#2563eb` (Blue)
- **Secondary**: `#f3f4f6` (Light Grey)
- **Accent**: `#dc2626` (Red - for recording)
- **Text**: `#1f2937` (Dark Grey)

### Typography
- Font Family: Inter (Google Fonts)
- Headings: `text-2xl` to `text-6xl`
- Body: `text-base`

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Meetings
- `GET /api/meetings` - Get user's meetings
- `POST /api/meetings` - Create new meeting
- `GET /api/meetings/:id` - Get meeting details
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `POST /api/meetings/:id/join` - Join meeting
- `POST /api/meetings/:id/leave` - Leave meeting
- `POST /api/meetings/:id/end` - End meeting

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile

## 🔌 WebSocket Events

### Client → Server
- `join-room` - Join a meeting room
- `leave-room` - Leave a meeting room
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `ice-candidate` - Send ICE candidate
- `chat-message` - Send chat message
- `reaction` - Send reaction
- `raise-hand` - Toggle hand raise
- `toggle-audio` - Toggle microphone
- `toggle-video` - Toggle camera

### Server → Client
- `user-joined` - New user joined
- `user-left` - User left
- `offer` - Receive WebRTC offer
- `answer` - Receive WebRTC answer
- `ice-candidate` - Receive ICE candidate
- `chat-message` - Receive chat message
- `reaction` - Receive reaction
- `hand-raised` - Hand raise update

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder

### Backend (Render/Railway/Heroku)
1. Set environment variables
2. Deploy from GitHub repository

### Database (MongoDB Atlas)
1. Create a cluster
2. Get connection string
3. Update `MONGODB_URI` in environment

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using React, Node.js, and WebRTC
