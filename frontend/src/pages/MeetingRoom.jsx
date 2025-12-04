import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import EmojiPicker from 'emoji-picker-react'
import {
  HiMicrophone,
  HiVideoCamera,
  HiDesktopComputer,
  HiChatAlt2,
  HiUsers,
  HiPhone,
  HiDotsVertical,
  HiX,
  HiPaperAirplane,
  HiHand,
  HiVolumeOff,
  HiUserRemove,
  HiClipboardCopy,
  HiCheck,
  HiEmojiHappy,
  HiCog,
  HiLockClosed,
  HiLockOpen,
  HiStar,
  HiBan,
  HiVolumeUp,
} from 'react-icons/hi'
import { HiVideoCameraSlash } from 'react-icons/hi2'
import { FaRecordVinyl, FaStop } from 'react-icons/fa'
import { format } from 'date-fns'

// ============================================
// REMOTE VIDEO COMPONENT
// Handles binding MediaStream to video element properly
// ============================================
const RemoteVideo = ({ stream, isVideoOff, className }) => {
  const videoRef = useRef(null)
  
  useEffect(() => {
    const videoElement = videoRef.current
    if (videoElement && stream) {
      videoElement.srcObject = stream
      videoElement.play().catch(err => {
        console.log('Autoplay prevented:', err)
      })
    }
    
    return () => {
      if (videoElement) {
        videoElement.srcObject = null
      }
    }
  }, [stream])
  
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className={`${className} ${isVideoOff ? 'hidden' : ''}`}
    />
  )
}

// ============================================
// MAIN MEETING ROOM COMPONENT
// ============================================
const MeetingRoom = () => {
  const { meetingId } = useParams()
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  const navigate = useNavigate()

  // ============================================
  // REFS
  // ============================================
  const localVideoRef = useRef(null)
  const peerConnections = useRef({})
  const localStream = useRef(null)
  const screenStream = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const socketRef = useRef(null)

  // ============================================
  // STATE
  // ============================================
  const [isMuted, setIsMuted] = useState(false)
  const [forceMutedByHost, setForceMutedByHost] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [hostSocketId, setHostSocketId] = useState(null)
  const [meetingLocked, setMeetingLocked] = useState(false)
  const [spotlightedUser, setSpotlightedUser] = useState(null)
  const [allMuted, setAllMuted] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)

  // Participants state
  const [participants, setParticipants] = useState([
    { id: 'local', name: user?.name || 'You', isHost: false, isMuted: false, isVideoOff: false, handRaised: false }
  ])
  const [remoteStreams, setRemoteStreams] = useState({})

  // Chat state
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [pinnedMessages, setPinnedMessages] = useState([])
  const chatContainerRef = useRef(null)

  // Reactions
  const [reactions, setReactions] = useState([])
  const reactionEmojis = ['👍', '👏', '❤️', '😂', '😮', '🎉']

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  }

  // ============================================
  // SOCKET REF SYNC
  // ============================================
  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  // ============================================
  // INITIALIZE MEDIA (runs once on mount)
  // ============================================
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        })
        localStream.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
        setMediaReady(true)
      } catch (error) {
        console.error('Error accessing media devices:', error)
        // Still set media ready so socket events can be set up
        setMediaReady(true)
      }
    }
    
    init()
    
    return () => {
      cleanup()
    }
  }, [])

  // ============================================
  // CREATE PEER CONNECTION
  // ============================================
  const createPeerConnection = useCallback((peerId, isInitiator) => {
    console.log(`Creating peer connection for: ${peerId}, isInitiator: ${isInitiator}`)
    
    const pc = new RTCPeerConnection(iceServers)

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { to: peerId, candidate: event.candidate })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state for ${peerId}:`, pc.iceConnectionState)
      
      // Clean up failed/disconnected connections
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.log(`Connection ${peerId} failed/disconnected, cleaning up`)
      }
    }

    pc.ontrack = (event) => {
      console.log(`Got track from ${peerId}:`, event.track.kind)
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => ({ ...prev, [peerId]: event.streams[0] }))
      }
    }

    // Add local tracks to the connection
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current)
      })
    }

    peerConnections.current[peerId] = pc

    // If initiator, create and send offer
    if (isInitiator && socketRef.current) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit('offer', { to: peerId, offer: pc.localDescription })
        })
        .catch(err => console.error('Offer creation error:', err))
    }

    return pc
  }, [])

  // ============================================
  // CLEANUP PEER CONNECTION
  // ============================================
  const cleanupPeerConnection = useCallback((peerId) => {
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close()
      delete peerConnections.current[peerId]
    }
    setRemoteStreams(prev => {
      const updated = { ...prev }
      delete updated[peerId]
      return updated
    })
  }, [])

  // ============================================
  // SOCKET EVENT HANDLERS
  // ============================================
  useEffect(() => {
    if (!socket || !connected || !mediaReady) return

    console.log('=== Setting up socket event handlers ===')

    // Clean up any existing peer connections (refresh case)
    Object.keys(peerConnections.current).forEach(peerId => {
      cleanupPeerConnection(peerId)
    })

    // Join the room
    socket.emit('join-room', { 
      roomId: meetingId, 
      visitorId: user?._id, 
      userName: user?.name 
    })

    // ----------------------------------------
    // Room participants (received on join)
    // ----------------------------------------
    socket.on('room-participants', (existingParticipants, hostInfo) => {
      console.log('Room participants:', existingParticipants, 'Host info:', hostInfo)
      
      if (hostInfo) {
        setIsHost(hostInfo.isHost)
        setHostSocketId(hostInfo.hostSocketId)
        setParticipants(prev => prev.map(p => 
          p.id === 'local' ? { ...p, isHost: hostInfo.isHost } : p
        ))
        
        // Re-apply mute if previously muted by host
        if (hostInfo.wasMuted && localStream.current) {
          console.log('User was previously muted by host, re-applying mute')
          localStream.current.getAudioTracks().forEach(track => {
            track.enabled = false
          })
          setIsMuted(true)
          setForceMutedByHost(true)
        }
      }
      
      // Create peer connections to existing participants
      existingParticipants.forEach(({ socketId, userName, isHost: participantIsHost }) => {
        setParticipants(prev => {
          if (prev.find(p => p.id === socketId)) return prev
          return [...prev, { 
            id: socketId, 
            name: userName, 
            isHost: participantIsHost || false, 
            isMuted: false, 
            isVideoOff: false, 
            handRaised: false 
          }]
        })
        // New joiner initiates connection
        createPeerConnection(socketId, true)
      })
    })

    // ----------------------------------------
    // User joined (existing users receive this)
    // ----------------------------------------
    socket.on('user-joined', ({ visitorId, userName, socketId, isHost: participantIsHost }) => {
      console.log(`User joined: ${userName} (${socketId}), isHost: ${participantIsHost}`)
      
      // Add new participant
      setParticipants(prev => {
        if (prev.find(p => p.id === socketId)) return prev
        return [...prev, { 
          id: socketId, 
          name: userName, 
          isHost: participantIsHost || false, 
          isMuted: false, 
          isVideoOff: false, 
          handRaised: false 
        }]
      })
      // Wait for offer from new joiner
    })

    // ----------------------------------------
    // User left
    // ----------------------------------------
    socket.on('user-left', ({ socketId }) => {
      console.log(`User left: ${socketId}`)
      setParticipants(prev => prev.filter(p => p.id !== socketId))
      cleanupPeerConnection(socketId)
    })

    // ----------------------------------------
    // WebRTC Signaling: Offer
    // ----------------------------------------
    socket.on('offer', async ({ from, offer }) => {
      console.log(`Received offer from: ${from}`)
      try {
        // Always close existing connection and create fresh one
        // This handles the case where the other user refreshed
        cleanupPeerConnection(from)
        
        const pc = createPeerConnection(from, false)
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('answer', { to: from, answer })
        console.log(`Sent answer to: ${from}`)
      } catch (error) {
        console.error('Error handling offer:', error)
      }
    })

    // ----------------------------------------
    // WebRTC Signaling: Answer
    // ----------------------------------------
    socket.on('answer', async ({ from, answer }) => {
      console.log(`Received answer from: ${from}`)
      const pc = peerConnections.current[from]
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (error) {
          console.error('Error setting remote description:', error)
        }
      }
    })

    // ----------------------------------------
    // WebRTC Signaling: ICE Candidate
    // ----------------------------------------
    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = peerConnections.current[from]
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
          console.error('Error adding ICE candidate:', error)
        }
      }
    })

    // ----------------------------------------
    // Chat message
    // ----------------------------------------
    socket.on('chat-message', (message) => {
      setMessages(prev => [...prev, message])
    })

    // ----------------------------------------
    // Reaction
    // ----------------------------------------
    socket.on('reaction', (reaction) => {
      addReaction(reaction.emoji, reaction.visitorId)
    })

    // ----------------------------------------
    // Hand raised
    // ----------------------------------------
    socket.on('hand-raised', ({ socketId, raised }) => {
      setParticipants(prev => prev.map(p => 
        p.id === socketId ? { ...p, handRaised: raised } : p
      ))
    })

    // ----------------------------------------
    // Meeting locked (when trying to join)
    // ----------------------------------------
    socket.on('meeting-is-locked', () => {
      alert('This meeting is locked. You cannot join at this time.')
      navigate('/dashboard')
    })

    // ----------------------------------------
    // New host assigned
    // ----------------------------------------
    socket.on('new-host', ({ hostSocketId: newHostSocketId }) => {
      console.log('New host assigned:', newHostSocketId)
      setHostSocketId(newHostSocketId)
      
      if (socket.id === newHostSocketId) {
        setIsHost(true)
        setParticipants(prev => prev.map(p => 
          p.id === 'local' ? { ...p, isHost: true } : { ...p, isHost: false }
        ))
      } else {
        setIsHost(false)
        setParticipants(prev => prev.map(p => 
          p.id === newHostSocketId 
            ? { ...p, isHost: true } 
            : p.id === 'local' 
              ? { ...p, isHost: false } 
              : p
        ))
      }
    })

    // ----------------------------------------
    // User audio toggle
    // ----------------------------------------
    socket.on('user-audio-toggle', ({ socketId, muted }) => {
      setParticipants(prev => prev.map(p => 
        p.id === socketId ? { ...p, isMuted: muted } : p
      ))
    })

    // ----------------------------------------
    // User video toggle
    // ----------------------------------------
    socket.on('user-video-toggle', ({ socketId, videoOff }) => {
      setParticipants(prev => prev.map(p => 
        p.id === socketId ? { ...p, isVideoOff: videoOff } : p
      ))
    })

    // ----------------------------------------
    // Force mute (from host)
    // ----------------------------------------
    socket.on('force-mute', async () => {
      console.log('=== FORCE MUTE RECEIVED ===')
      
      // Disable audio track
      if (localStream.current) {
        localStream.current.getAudioTracks().forEach(track => {
          track.enabled = false
        })
      }
      
      // Replace audio track with null in all peer connections
      // This completely stops sending audio
      for (const [peerId, pc] of Object.entries(peerConnections.current)) {
        try {
          const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio')
          if (audioSender) {
            await audioSender.replaceTrack(null)
            console.log(`Replaced audio track with null for peer: ${peerId}`)
          }
        } catch (err) {
          console.error(`Error replacing track for peer ${peerId}:`, err)
        }
      }
      
      setIsMuted(true)
      setForceMutedByHost(true)
      setParticipants(prev => prev.map(p => 
        p.id === 'local' ? { ...p, isMuted: true } : p
      ))
      
      socket.emit('toggle-audio', { roomId: meetingId, muted: true })
    })

    // ----------------------------------------
    // Force unmute (from host - allows user to unmute)
    // ----------------------------------------
    socket.on('force-unmute', () => {
      console.log('Force unmute received - you can now unmute')
      setForceMutedByHost(false)
    })

    // ----------------------------------------
    // All muted
    // ----------------------------------------
    socket.on('all-muted', () => {
      setParticipants(prev => prev.map(p => 
        p.id !== 'local' ? { ...p, isMuted: true } : p
      ))
    })

    // ----------------------------------------
    // Removed from meeting
    // ----------------------------------------
    socket.on('removed-from-meeting', () => {
      cleanup()
      navigate('/dashboard', { state: { message: 'You have been removed from the meeting' } })
    })

    // ----------------------------------------
    // Meeting ended by host
    // ----------------------------------------
    socket.on('meeting-ended', () => {
      cleanup()
      navigate('/dashboard', { state: { message: 'The meeting has been ended by the host' } })
    })

    // ----------------------------------------
    // Meeting locked status
    // ----------------------------------------
    socket.on('meeting-locked', ({ locked }) => {
      setMeetingLocked(locked)
    })

    // ----------------------------------------
    // User spotlighted
    // ----------------------------------------
    socket.on('user-spotlighted', ({ socketId }) => {
      setSpotlightedUser(socketId)
    })

    // Cleanup function
    return () => {
      socket.off('room-participants')
      socket.off('user-joined')
      socket.off('user-left')
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
      socket.off('chat-message')
      socket.off('reaction')
      socket.off('hand-raised')
      socket.off('meeting-is-locked')
      socket.off('new-host')
      socket.off('user-audio-toggle')
      socket.off('user-video-toggle')
      socket.off('force-mute')
      socket.off('force-unmute')
      socket.off('all-muted')
      socket.off('removed-from-meeting')
      socket.off('meeting-ended')
      socket.off('meeting-locked')
      socket.off('user-spotlighted')
    }
  }, [socket, connected, meetingId, mediaReady, createPeerConnection, cleanupPeerConnection, navigate, user])

  // ============================================
  // SCROLL CHAT TO BOTTOM
  // ============================================
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // ============================================
  // CLEANUP FUNCTION
  // ============================================
  const cleanup = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop())
    }
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop())
    }
    Object.values(peerConnections.current).forEach(pc => pc.close())
    peerConnections.current = {}
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId: meetingId })
    }
  }, [meetingId])

  // ============================================
  // TOGGLE MUTE
  // ============================================
  const toggleMute = async () => {
    // If force muted by host, user cannot unmute
    if (forceMutedByHost && isMuted) {
      console.log('You have been muted by the host.')
      return
    }
    
    if (!localStream.current) return
    
    const audioTrack = localStream.current.getAudioTracks()[0]
    if (!audioTrack) return
    
    const newEnabledState = !audioTrack.enabled
    audioTrack.enabled = newEnabledState
    const newMutedState = !newEnabledState
    
    // If unmuting, restore audio track to peer connections
    if (newEnabledState) {
      for (const [peerId, pc] of Object.entries(peerConnections.current)) {
        try {
          const audioSender = pc.getSenders().find(s => s.track === null || s.track?.kind === 'audio')
          if (audioSender && audioSender.track !== audioTrack) {
            await audioSender.replaceTrack(audioTrack)
            console.log(`Restored audio track for peer: ${peerId}`)
          }
        } catch (err) {
          console.error(`Error restoring track for peer ${peerId}:`, err)
        }
      }
    }
    
    setIsMuted(newMutedState)
    setParticipants(prev => prev.map(p => 
      p.id === 'local' ? { ...p, isMuted: newMutedState } : p
    ))
    socket?.emit('toggle-audio', { roomId: meetingId, muted: newMutedState })
  }

  // ============================================
  // TOGGLE VIDEO
  // ============================================
  const toggleVideo = () => {
    if (!localStream.current) return
    
    const videoTrack = localStream.current.getVideoTracks()[0]
    if (!videoTrack) return
    
    videoTrack.enabled = !videoTrack.enabled
    const newVideoOff = !videoTrack.enabled
    
    setIsVideoOff(newVideoOff)
    setParticipants(prev => prev.map(p => 
      p.id === 'local' ? { ...p, isVideoOff: newVideoOff } : p
    ))
    socket?.emit('toggle-video', { roomId: meetingId, videoOff: newVideoOff })
  }

  // ============================================
  // TOGGLE SCREEN SHARE
  // ============================================
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop())
        screenStream.current = null
      }
      
      // Replace screen track with camera video track
      if (localStream.current) {
        const videoTrack = localStream.current.getVideoTracks()[0]
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack)
          }
        })
      }
      setIsScreenSharing(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStream.current = stream
        
        const screenTrack = stream.getVideoTracks()[0]
        
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) {
            sender.replaceTrack(screenTrack)
          }
        })

        screenTrack.onended = () => {
          toggleScreenShare()
        }

        setIsScreenSharing(true)
        socket?.emit('screen-share', { roomId: meetingId, sharing: true })
      } catch (error) {
        console.error('Error sharing screen:', error)
      }
    }
  }

  // ============================================
  // TOGGLE RECORDING
  // ============================================
  const toggleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      const streams = []
      if (localStream.current) streams.push(localStream.current)
      Object.values(remoteStreams).forEach(stream => streams.push(stream))

      if (streams.length > 0) {
        const combinedStream = streams[0]
        
        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: 'video/webm;codecs=vp9',
        })

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `meeting-${meetingId}-${Date.now()}.webm`
          a.click()
          recordedChunksRef.current = []
        }

        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start(1000)
        setIsRecording(true)
      }
    }
  }

  // ============================================
  // TOGGLE HAND RAISE
  // ============================================
  const toggleHandRaise = () => {
    const newState = !handRaised
    setHandRaised(newState)
    setParticipants(prev => prev.map(p => 
      p.id === 'local' ? { ...p, handRaised: newState } : p
    ))
    socket?.emit('raise-hand', { roomId: meetingId, raised: newState })
  }

  // ============================================
  // SEND MESSAGE
  // ============================================
  const sendMessage = () => {
    if (messageInput.trim() && socket) {
      const message = {
        id: Date.now(),
        visitorId: user?._id,
        userName: user?.name,
        text: messageInput.trim(),
        timestamp: new Date().toISOString(),
      }
      socket.emit('chat-message', { roomId: meetingId, message })
      setMessages(prev => [...prev, message])
      setMessageInput('')
    }
  }

  // ============================================
  // REACTIONS
  // ============================================
  const sendReaction = (emoji) => {
    socket?.emit('reaction', { roomId: meetingId, emoji })
    addReaction(emoji, 'local')
  }

  const addReaction = (emoji, visitorId) => {
    const id = Date.now()
    setReactions(prev => [...prev, { id, emoji, visitorId }])
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id))
    }, 2000)
  }

  // ============================================
  // PIN/UNPIN MESSAGE
  // ============================================
  const pinMessage = (messageId) => {
    const message = messages.find(m => m.id === messageId)
    if (message && !pinnedMessages.find(m => m.id === messageId)) {
      setPinnedMessages(prev => [...prev, message])
    }
  }

  const unpinMessage = (messageId) => {
    setPinnedMessages(prev => prev.filter(m => m.id !== messageId))
  }

  // ============================================
  // COPY MEETING LINK
  // ============================================
  const copyMeetingLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ============================================
  // HOST CONTROLS
  // ============================================
  const removeParticipant = (socketId) => {
    socket?.emit('remove-user', { roomId: meetingId, targetSocketId: socketId })
    setParticipants(prev => prev.filter(p => p.id !== socketId))
    cleanupPeerConnection(socketId)
  }

  const muteParticipant = (socketId) => {
    const participant = participants.find(p => p.id === socketId)
    if (participant?.isMuted) {
      socket?.emit('unmute-user', { roomId: meetingId, targetSocketId: socketId })
      setParticipants(prev => prev.map(p => 
        p.id === socketId ? { ...p, isMuted: false } : p
      ))
    } else {
      socket?.emit('mute-user', { roomId: meetingId, targetSocketId: socketId })
      setParticipants(prev => prev.map(p => 
        p.id === socketId ? { ...p, isMuted: true } : p
      ))
    }
  }

  const toggleMuteAllParticipants = () => {
    if (allMuted) {
      socket?.emit('unmute-all', { roomId: meetingId })
      setParticipants(prev => prev.map(p => 
        p.id !== 'local' ? { ...p, isMuted: false } : p
      ))
      setAllMuted(false)
    } else {
      socket?.emit('mute-all', { roomId: meetingId })
      setParticipants(prev => prev.map(p => 
        p.id !== 'local' ? { ...p, isMuted: true } : p
      ))
      setAllMuted(true)
    }
  }

  const endMeetingForAll = () => {
    socket?.emit('end-meeting-for-all', { roomId: meetingId })
    cleanup()
    navigate('/dashboard')
  }

  const toggleMeetingLock = () => {
    const newState = !meetingLocked
    socket?.emit('toggle-lock', { roomId: meetingId, locked: newState })
    setMeetingLocked(newState)
  }

  const spotlightParticipant = (socketId) => {
    const newSpotlight = spotlightedUser === socketId ? null : socketId
    socket?.emit('spotlight', { roomId: meetingId, targetSocketId: newSpotlight })
    setSpotlightedUser(newSpotlight)
  }

  const endMeeting = () => {
    cleanup()
    navigate('/dashboard')
  }

  // ============================================
  // GRID CLASS HELPER
  // ============================================
  const getGridClass = () => {
    const count = participants.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-1 md:grid-cols-2'
    if (count <= 4) return 'grid-cols-2'
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3'
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className={`flex-1 p-4 relative ${showChat || showParticipants ? 'hidden md:block' : ''}`}>
          {/* Meeting Info Bar */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800/80 backdrop-blur-lg text-white px-4 py-2 rounded-lg text-sm">
                Meeting ID: {meetingId}
              </div>
              {isRecording && (
                <div className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm flex items-center recording-indicator">
                  <FaRecordVinyl className="w-4 h-4 mr-2" />
                  Recording
                </div>
              )}
            </div>
            <button
              onClick={copyMeetingLink}
              className="bg-gray-800/80 backdrop-blur-lg text-white px-4 py-2 rounded-lg text-sm flex items-center hover:bg-gray-700 transition"
            >
              {copied ? <HiCheck className="w-4 h-4 mr-2" /> : <HiClipboardCopy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Video Grid */}
          <div className={`grid ${spotlightedUser ? 'grid-cols-1 md:grid-cols-4' : getGridClass()} gap-4 h-full pt-16`}>
            {/* Spotlighted Video */}
            {spotlightedUser && spotlightedUser !== 'local' && (
              <div className="video-tile group md:col-span-3 md:row-span-2 relative">
                {remoteStreams[spotlightedUser] ? (
                  <RemoteVideo
                    stream={remoteStreams[spotlightedUser]}
                    isVideoOff={false}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="w-32 h-32 rounded-full bg-primary-600 flex items-center justify-center text-white text-4xl font-bold">
                      {participants.find(p => p.id === spotlightedUser)?.name?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <HiStar className="w-4 h-4 mr-1" />
                  Spotlight
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/60 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-white text-lg font-medium">
                        {participants.find(p => p.id === spotlightedUser)?.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Local Video */}
            <div className={`video-tile group ${spotlightedUser === 'local' ? 'md:col-span-3 md:row-span-2' : ''}`}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className={`${spotlightedUser === 'local' ? 'w-32 h-32 text-4xl' : 'w-20 h-20 text-2xl'} rounded-full gradient-bg flex items-center justify-center text-white font-bold`}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
              )}
              {spotlightedUser === 'local' && (
                <div className="absolute top-4 left-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <HiStar className="w-4 h-4 mr-1" />
                  Spotlight
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/60 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-sm font-medium">{user?.name} (You)</span>
                    {handRaised && <HiHand className="w-5 h-5 text-yellow-400" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isMuted && <HiVolumeOff className="w-5 h-5 text-red-500" />}
                    {isVideoOff && <HiVideoCameraSlash className="w-5 h-5 text-red-500" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Remote Videos */}
            {participants.filter(p => p.id !== 'local' && p.id !== spotlightedUser).map((participant) => (
              <div key={participant.id} className="video-tile group">
                {remoteStreams[participant.id] ? (
                  <RemoteVideo
                    stream={remoteStreams[participant.id]}
                    isVideoOff={participant.isVideoOff}
                    className="w-full h-full object-cover"
                  />
                ) : null}
                {(!remoteStreams[participant.id] || participant.isVideoOff) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                      {participant.name?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/60 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-white text-sm font-medium">{participant.name}</span>
                      {participant.isHost && (
                        <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded">Host</span>
                      )}
                      {participant.handRaised && <HiHand className="w-5 h-5 text-yellow-400" />}
                    </div>
                    <div className="flex items-center space-x-2">
                      {participant.isMuted && <HiVolumeOff className="w-5 h-5 text-red-500" />}
                      {participant.isVideoOff && <HiVideoCameraSlash className="w-5 h-5 text-red-500" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Floating Reactions */}
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2 pointer-events-none">
            {reactions.map((reaction) => (
              <div key={reaction.id} className="text-4xl reaction-float">
                {reaction.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-full md:w-80 bg-white flex flex-col border-l border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-dark">Chat</h3>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-gray-100 rounded-lg md:hidden">
                <HiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Pinned Messages */}
            {pinnedMessages.length > 0 && (
              <div className="p-3 bg-yellow-50 border-b border-yellow-100">
                <p className="text-xs font-medium text-yellow-800 mb-2">Pinned Messages</p>
                {pinnedMessages.map((msg) => (
                  <div key={msg.id} className="text-sm text-gray-700 flex items-start justify-between">
                    <span className="truncate flex-1">{msg.text}</span>
                    <button onClick={() => unpinMessage(msg.id)} className="text-gray-400 hover:text-gray-600 ml-2">
                      <HiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`${msg.visitorId === user?._id ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block max-w-[80%] p-3 rounded-2xl ${
                      msg.visitorId === user?._id
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {msg.visitorId !== user?._id && (
                      <p className="text-xs font-medium mb-1 opacity-70">{msg.userName}</p>
                    )}
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-50 mt-1">{format(new Date(msg.timestamp), 'HH:mm')}</p>
                  </div>
                  {msg.visitorId !== user?._id && (
                    <button
                      onClick={() => pinMessage(msg.id)}
                      className="text-xs text-gray-400 hover:text-primary-600 mt-1 ml-2"
                    >
                      Pin
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="w-full pr-12 input-field"
                />
                <button
                  onClick={sendMessage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  <HiPaperAirplane className="w-5 h-5 transform rotate-90" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Participants Sidebar */}
        {showParticipants && (
          <div className="w-full md:w-80 bg-white flex flex-col border-l border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-dark">Participants ({participants.length})</h3>
              <button onClick={() => setShowParticipants(false)} className="p-2 hover:bg-gray-100 rounded-lg md:hidden">
                <HiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Participant List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 ${spotlightedUser === participant.id ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-medium">
                        {participant.name?.charAt(0)?.toUpperCase()}
                      </div>
                      {participant.isMuted && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <HiVolumeOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark flex items-center">
                        {participant.name}
                        {participant.id === 'local' && ' (You)'}
                        {participant.isHost && (
                          <span className="ml-2 bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded">
                            Host
                          </span>
                        )}
                        {spotlightedUser === participant.id && (
                          <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded flex items-center">
                            <HiStar className="w-3 h-3 mr-1" />
                            Spotlight
                          </span>
                        )}
                      </p>
                      {participant.handRaised && (
                        <p className="text-xs text-yellow-600 flex items-center">
                          <HiHand className="w-3 h-3 mr-1" />
                          Hand raised
                        </p>
                      )}
                      {participant.isMuted && participant.id === 'local' && (
                        <p className="text-xs text-red-500 flex items-center">
                          <HiVolumeOff className="w-3 h-3 mr-1" />
                          Muted
                        </p>
                      )}
                    </div>
                  </div>
                  {isHost && participant.id !== 'local' && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => spotlightParticipant(participant.id)}
                        className={`p-2 rounded-lg ${spotlightedUser === participant.id ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'}`}
                        title={spotlightedUser === participant.id ? 'Remove spotlight' : 'Spotlight'}
                      >
                        <HiStar className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => muteParticipant(participant.id)}
                        className={`p-2 rounded-lg ${participant.isMuted ? 'text-green-500 bg-green-50 hover:bg-green-100' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                        title={participant.isMuted ? 'Allow to unmute' : 'Mute'}
                      >
                        {participant.isMuted ? <HiVolumeUp className="w-4 h-4" /> : <HiVolumeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => removeParticipant(participant.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Remove"
                      >
                        <HiUserRemove className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="p-4 border-t border-gray-200 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Host Controls</h4>
                
                <button
                  onClick={toggleMuteAllParticipants}
                  className={`w-full flex items-center p-3 rounded-lg hover:bg-gray-50 ${allMuted ? 'text-green-600' : 'text-gray-700'}`}
                >
                  {allMuted ? (
                    <>
                      <HiVolumeUp className="w-4 h-4 mr-3 text-green-500" />
                      <span className="text-sm">Unmute All Participants</span>
                    </>
                  ) : (
                    <>
                      <HiVolumeOff className="w-4 h-4 mr-3 text-gray-500" />
                      <span className="text-sm">Mute All Participants</span>
                    </>
                  )}
                </button>

                <button
                  onClick={toggleMeetingLock}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-700 flex items-center">
                    {meetingLocked ? <HiLockClosed className="w-4 h-4 mr-3 text-red-500" /> : <HiLockOpen className="w-4 h-4 mr-3 text-gray-500" />}
                    {meetingLocked ? 'Unlock Meeting' : 'Lock Meeting'}
                  </span>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors ${
                      meetingLocked ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        meetingLocked ? 'translate-x-4' : 'translate-x-0.5'
                      } translate-y-0.5`}
                    />
                  </div>
                </button>

                {spotlightedUser && (
                  <button
                    onClick={() => spotlightParticipant(spotlightedUser)}
                    className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    <HiStar className="w-4 h-4 mr-3 text-yellow-500" />
                    <span className="text-sm">Clear Spotlight</span>
                  </button>
                )}

                <button
                  onClick={endMeetingForAll}
                  className="w-full flex items-center p-3 rounded-lg hover:bg-red-50 text-red-600 mt-4"
                >
                  <HiBan className="w-4 h-4 mr-3" />
                  <span className="text-sm font-medium">End Meeting for All</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-gray-800 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={toggleMute}
                className={`control-button ${isMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} ${forceMutedByHost ? 'cursor-not-allowed opacity-75' : ''}`}
                title={forceMutedByHost ? 'Muted by host - ask host to unmute' : (isMuted ? 'Unmute' : 'Mute')}
              >
                {isMuted ? <HiVolumeOff className="w-6 h-6" /> : <HiMicrophone className="w-6 h-6" />}
              </button>
              {forceMutedByHost && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <HiLockClosed className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <button
              onClick={toggleVideo}
              className={`control-button ${isVideoOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={isVideoOff ? 'Turn on video' : 'Turn off video'}
            >
              {isVideoOff ? <HiVideoCameraSlash className="w-6 h-6" /> : <HiVideoCamera className="w-6 h-6" />}
            </button>
          </div>

          {/* Center Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleScreenShare}
              className={`control-button ${isScreenSharing ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <HiDesktopComputer className="w-6 h-6" />
            </button>
            <button
              onClick={toggleRecording}
              className={`control-button ${isRecording ? 'bg-red-600 recording-indicator' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? <FaStop className="w-5 h-5" /> : <FaRecordVinyl className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleHandRaise}
              className={`control-button ${handRaised ? 'bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={handRaised ? 'Lower hand' : 'Raise hand'}
            >
              <HiHand className="w-6 h-6" />
            </button>
            
            {/* Reactions */}
            <div className="relative">
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="control-button bg-gray-700 hover:bg-gray-600"
                title="Reactions"
              >
                <HiEmojiHappy className="w-6 h-6" />
              </button>
              {showEmoji && (
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 flex space-x-2">
                  {reactionEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        sendReaction(emoji)
                        setShowEmoji(false)
                      }}
                      className="text-2xl hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowChat(!showChat)
                setShowParticipants(false)
              }}
              className={`control-button ${showChat ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title="Chat"
            >
              <HiChatAlt2 className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                setShowParticipants(!showParticipants)
                setShowChat(false)
              }}
              className={`control-button ${showParticipants ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title="Participants"
            >
              <HiUsers className="w-6 h-6" />
            </button>
            <button
              onClick={endMeeting}
              className="control-button bg-red-600 hover:bg-red-700"
              title="Leave meeting"
            >
              <HiPhone className="w-6 h-6 transform rotate-135" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MeetingRoom
