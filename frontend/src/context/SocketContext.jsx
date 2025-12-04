import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { token, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(window.location.origin, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
      })

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id)
        setConnected(true)
      })

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected')
        setConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setConnected(false)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [isAuthenticated, token])

  const value = {
    socket,
    connected,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
