import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  HiVideoCamera,
  HiMicrophone,
  HiVolumeOff,
  HiCog,
  HiArrowRight,
} from 'react-icons/hi'
import { HiVideoCameraSlash } from 'react-icons/hi2'

const JoinMeeting = () => {
  const { meetingId } = useParams()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)

  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [audioDevices, setAudioDevices] = useState([])
  const [videoDevices, setVideoDevices] = useState([])
  const [selectedAudio, setSelectedAudio] = useState('')
  const [selectedVideo, setSelectedVideo] = useState('')

  useEffect(() => {
    initializeMedia()
    getDevices()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const initializeMedia = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setLoading(false)
    } catch (err) {
      setError('Unable to access camera or microphone. Please check permissions.')
      setLoading(false)
    }
  }

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'))
      setVideoDevices(devices.filter(d => d.kind === 'videoinput'))
    } catch (err) {
      console.error('Error getting devices:', err)
    }
  }

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }

  const changeAudioDevice = async (deviceId) => {
    try {
      setSelectedAudio(deviceId)
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: stream?.getVideoTracks()[0]?.getSettings(),
      })
      
      const oldAudioTrack = stream?.getAudioTracks()[0]
      if (oldAudioTrack) {
        oldAudioTrack.stop()
        stream.removeTrack(oldAudioTrack)
      }
      
      stream?.addTrack(newStream.getAudioTracks()[0])
    } catch (err) {
      console.error('Error changing audio device:', err)
    }
  }

  const changeVideoDevice = async (deviceId) => {
    try {
      setSelectedVideo(deviceId)
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
        audio: stream?.getAudioTracks()[0]?.getSettings(),
      })
      
      const oldVideoTrack = stream?.getVideoTracks()[0]
      if (oldVideoTrack) {
        oldVideoTrack.stop()
        stream.removeTrack(oldVideoTrack)
      }
      
      const newVideoTrack = newStream.getVideoTracks()[0]
      stream?.addTrack(newVideoTrack)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Error changing video device:', err)
    }
  }

  const joinMeeting = () => {
    if (!isAuthenticated && !guestName.trim()) {
      setError('Please enter your name to join')
      return
    }
    
    // Stop the preview stream before navigating
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    navigate(`/meeting/${meetingId}`, {
      state: { 
        guestName: guestName.trim(),
        audioEnabled: !isMuted,
        videoEnabled: !isVideoOff,
      }
    })
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
            <HiVideoCamera className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">MeetUp</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Video Preview */}
            <div className="bg-gray-900 p-6">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="spinner" />
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-center p-4">
                    <div>
                      <HiVideoCameraSlash className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                      <p className="text-sm text-gray-400">{error}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                    />
                    {isVideoOff && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="w-24 h-24 rounded-full gradient-bg flex items-center justify-center text-white text-3xl font-bold">
                          {isAuthenticated
                            ? user?.name?.charAt(0)?.toUpperCase()
                            : guestName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Controls overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
                  <button
                    onClick={toggleMute}
                    className={`p-3 rounded-full transition ${
                      isMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {isMuted ? (
                      <HiVolumeOff className="w-6 h-6 text-white" />
                    ) : (
                      <HiMicrophone className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition ${
                      isVideoOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {isVideoOff ? (
                      <HiVideoCameraSlash className="w-6 h-6 text-white" />
                    ) : (
                      <HiVideoCamera className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition"
                  >
                    <HiCog className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Device Settings */}
              {showSettings && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Microphone</label>
                    <select
                      value={selectedAudio}
                      onChange={(e) => changeAudioDevice(e.target.value)}
                      className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Camera</label>
                    <select
                      value={selectedVideo}
                      onChange={(e) => changeVideoDevice(e.target.value)}
                      className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Join Form */}
            <div className="p-8 flex flex-col justify-center">
              <h1 className="text-2xl font-bold text-dark mb-2">Ready to join?</h1>
              <p className="text-gray-600 mb-6">
                Meeting ID: <span className="font-mono font-semibold">{meetingId}</span>
              </p>

              {!isAuthenticated && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="input-field"
                    placeholder="Enter your name"
                  />
                </div>
              )}

              {isAuthenticated && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Joining as</p>
                  <p className="font-semibold text-dark">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={joinMeeting}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  Join Meeting
                  <HiArrowRight className="w-5 h-5 ml-2" />
                </button>

                {!isAuthenticated && (
                  <p className="text-center text-sm text-gray-600">
                    Have an account?{' '}
                    <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                      Sign in
                    </Link>
                  </p>
                )}
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Before you join:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Make sure your camera and microphone are working</li>
                  <li>• Find a quiet, well-lit space</li>
                  <li>• Close other apps that might use your camera</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JoinMeeting
