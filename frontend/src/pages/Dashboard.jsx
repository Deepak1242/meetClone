import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { v4 as uuidv4 } from 'uuid'
import {
  HiVideoCamera,
  HiPlus,
  HiCalendar,
  HiUsers,
  HiClock,
  HiPlay,
  HiOutlineLogout,
  HiOutlineCog,
  HiSearch,
  HiX,
  HiClipboardCopy,
  HiCheck,
  HiTrash,
  HiDownload,
  HiMenu,
} from 'react-icons/hi'
import { format, isAfter, isBefore, parseISO } from 'date-fns'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const navigate = useNavigate()
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [meetingIdInput, setMeetingIdInput] = useState('')
  const [activeTab, setActiveTab] = useState('upcoming')

  // New meeting form state
  const [newMeeting, setNewMeeting] = useState({
    name: '',
    scheduledTime: new Date(),
    invitees: [''],
  })

  useEffect(() => {
    fetchMeetings()
  }, [])

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/meetings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setMeetings(data)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const createMeeting = async () => {
    try {
      const token = localStorage.getItem('token')
      const meetingId = uuidv4().split('-')[0]
      const meetingData = {
        meetingId,
        name: newMeeting.name || `Meeting ${meetingId}`,
        scheduledTime: newMeeting.scheduledTime,
        invitees: newMeeting.invitees.filter((email) => email.trim()),
        host: user._id,
      }

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(meetingData),
      })

      if (response.ok) {
        const data = await response.json()
        setMeetings([...meetings, data])
        setShowNewMeetingModal(false)
        setNewMeeting({ name: '', scheduledTime: new Date(), invitees: [''] })
        navigate(`/meeting/${meetingId}`)
      }
    } catch (error) {
      console.error('Error creating meeting:', error)
    }
  }

  const startInstantMeeting = () => {
    const meetingId = uuidv4().split('-')[0]
    navigate(`/meeting/${meetingId}`)
  }

  const joinMeeting = () => {
    if (meetingIdInput.trim()) {
      navigate(`/meeting/${meetingIdInput.trim()}`)
    }
  }

  const deleteMeeting = async (meetingId) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setMeetings(meetings.filter((m) => m.meetingId !== meetingId))
    } catch (error) {
      console.error('Error deleting meeting:', error)
    }
  }

  const copyMeetingLink = (meetingId) => {
    navigator.clipboard.writeText(`${window.location.origin}/meeting/${meetingId}`)
    setCopied(meetingId)
    setTimeout(() => setCopied(false), 2000)
  }

  const addInvitee = () => {
    setNewMeeting({ ...newMeeting, invitees: [...newMeeting.invitees, ''] })
  }

  const updateInvitee = (index, value) => {
    const updated = [...newMeeting.invitees]
    updated[index] = value
    setNewMeeting({ ...newMeeting, invitees: updated })
  }

  const removeInvitee = (index) => {
    const updated = newMeeting.invitees.filter((_, i) => i !== index)
    setNewMeeting({ ...newMeeting, invitees: updated })
  }

  const now = new Date()
  const upcomingMeetings = meetings.filter((m) => isAfter(new Date(m.scheduledTime), now))
  const pastMeetings = meetings.filter((m) => isBefore(new Date(m.scheduledTime), now))

  const getMeetingStatus = (scheduledTime) => {
    const meetingTime = new Date(scheduledTime)
    const diff = meetingTime - now
    if (diff < 0) return { text: 'Ended', color: 'bg-gray-100 text-gray-600' }
    if (diff < 3600000) return { text: 'Starting soon', color: 'bg-yellow-100 text-yellow-700' }
    return { text: 'Upcoming', color: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <HiVideoCamera className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-dark">MeetUp</span>
            </Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <HiX className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-4 space-y-2">
            <button
              onClick={() => setShowNewMeetingModal(true)}
              className="w-full btn-primary flex items-center justify-center"
            >
              <HiPlus className="w-5 h-5 mr-2" />
              New Meeting
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full btn-secondary flex items-center justify-center"
            >
              <HiPlay className="w-5 h-5 mr-2" />
              Join Meeting
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition ${
                activeTab === 'upcoming'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiCalendar className="w-5 h-5 mr-3" />
              Upcoming Meetings
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition ${
                activeTab === 'past'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <HiClock className="w-5 h-5 mr-3" />
              Past Meetings
            </button>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <HiOutlineCog className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <HiOutlineLogout className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button className="lg:hidden mr-4" onClick={() => setSidebarOpen(true)}>
                <HiMenu className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-bold text-dark">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}
                />
                {connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Quick Start Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div
              onClick={startInstantMeeting}
              className="card cursor-pointer hover:border-primary-300 border-2 border-transparent group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HiVideoCamera className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-dark mb-2">Instant Meeting</h3>
              <p className="text-gray-600 text-sm">Start a meeting right now with a single click</p>
            </div>

            <div
              onClick={() => setShowNewMeetingModal(true)}
              className="card cursor-pointer hover:border-primary-300 border-2 border-transparent group"
            >
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HiCalendar className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-dark mb-2">Schedule Meeting</h3>
              <p className="text-gray-600 text-sm">Plan ahead and invite participants</p>
            </div>

            <div
              onClick={() => setShowJoinModal(true)}
              className="card cursor-pointer hover:border-primary-300 border-2 border-transparent group"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <HiUsers className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-dark mb-2">Join Meeting</h3>
              <p className="text-gray-600 text-sm">Enter a meeting ID to join</p>
            </div>
          </div>

          {/* Meetings List */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-dark">
                {activeTab === 'upcoming' ? 'Upcoming Meetings' : 'Past Meetings'}
              </h2>
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search meetings..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner" />
              </div>
            ) : (activeTab === 'upcoming' ? upcomingMeetings : pastMeetings).length === 0 ? (
              <div className="text-center py-12">
                <HiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No {activeTab} meetings</p>
                <button
                  onClick={() => setShowNewMeetingModal(true)}
                  className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                  Schedule a meeting
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(activeTab === 'upcoming' ? upcomingMeetings : pastMeetings).map((meeting) => {
                  const status = getMeetingStatus(meeting.scheduledTime)
                  return (
                    <div
                      key={meeting.meetingId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                          <HiVideoCamera className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-dark">{meeting.name}</h3>
                          <p className="text-sm text-gray-500">
                            {format(new Date(meeting.scheduledTime), 'PPp')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyMeetingLink(meeting.meetingId)}
                          className="p-2 text-gray-500 hover:bg-white rounded-lg transition"
                          title="Copy link"
                        >
                          {copied === meeting.meetingId ? (
                            <HiCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <HiClipboardCopy className="w-5 h-5" />
                          )}
                        </button>
                        {activeTab === 'past' && meeting.recordingUrl && (
                          <a
                            href={meeting.recordingUrl}
                            className="p-2 text-gray-500 hover:bg-white rounded-lg transition"
                            title="Download recording"
                          >
                            <HiDownload className="w-5 h-5" />
                          </a>
                        )}
                        <button
                          onClick={() => deleteMeeting(meeting.meetingId)}
                          className="p-2 text-red-500 hover:bg-white rounded-lg transition"
                          title="Delete"
                        >
                          <HiTrash className="w-5 h-5" />
                        </button>
                        {activeTab === 'upcoming' && (
                          <Link
                            to={`/meeting/${meeting.meetingId}`}
                            className="btn-primary text-sm px-4 py-2"
                          >
                            Join
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* New Meeting Modal */}
      {showNewMeetingModal && (
        <div className="modal-overlay" onClick={() => setShowNewMeetingModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-dark">Schedule New Meeting</h2>
              <button
                onClick={() => setShowNewMeetingModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiX className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Name</label>
                <input
                  type="text"
                  value={newMeeting.name}
                  onChange={(e) => setNewMeeting({ ...newMeeting, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter meeting name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                <DatePicker
                  selected={newMeeting.scheduledTime}
                  onChange={(date) => setNewMeeting({ ...newMeeting, scheduledTime: date })}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="input-field w-full"
                  minDate={new Date()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invite Participants
                </label>
                <div className="space-y-2">
                  {newMeeting.invitees.map((email, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateInvitee(index, e.target.value)}
                        className="input-field flex-1"
                        placeholder="Enter email address"
                      />
                      {newMeeting.invitees.length > 1 && (
                        <button
                          onClick={() => removeInvitee(index)}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <HiX className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addInvitee}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center"
                  >
                    <HiPlus className="w-4 h-4 mr-1" />
                    Add another invitee
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button onClick={() => setShowNewMeetingModal(false)} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button onClick={createMeeting} className="flex-1 btn-primary">
                  Create Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Meeting Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-dark">Join Meeting</h2>
              <button onClick={() => setShowJoinModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <HiX className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting ID or Link</label>
                <input
                  type="text"
                  value={meetingIdInput}
                  onChange={(e) => setMeetingIdInput(e.target.value)}
                  className="input-field"
                  placeholder="Enter meeting ID or paste link"
                  onKeyPress={(e) => e.key === 'Enter' && joinMeeting()}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button onClick={() => setShowJoinModal(false)} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button onClick={joinMeeting} className="flex-1 btn-primary">
                  Join Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}

export default Dashboard
