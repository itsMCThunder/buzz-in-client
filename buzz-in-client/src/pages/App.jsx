import React, { useEffect, useMemo, useState } from 'react'
import Landing from './Landing.jsx'
import HostView from './HostView.jsx'
import PlayerView from './PlayerView.jsx'
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

function useSocket() {
  const socket = useMemo(() => io(SERVER_URL, {
    transports: ['websocket'],
    autoConnect: true
  }), [])
  useEffect(() => {
    return () => { socket.disconnect() }
  }, [socket])
  return socket
}

export default function App() {
  const socket = useSocket()
  const [me, setMe] = useState({ role: null, name: '', code: '', id: '' })
  const [room, setRoom] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    socket.on('room:update', (state) => setRoom(state))
    socket.on('room:ended', ({ reason }) => {
      alert('Room ended: ' + reason)
      setMe({ role: null, name: '', code: '', id: '' })
      setRoom(null)
    })
    socket.on('host:roomCreated', ({ code }) => {
      setMe(m => ({ ...m, code }))
    })
    socket.on('error:message', ({ message }) => setError(message))
    return () => {
      socket.off('room:update')
      socket.off('room:ended')
      socket.off('host:roomCreated')
      socket.off('error:message')
    }
  }, [socket])

  const resetToHome = () => {
    setMe({ role: null, name: '', code: '', id: '' })
    setRoom(null)
  }

  return (
    <div className="container">
      {!me.role && (
        <Landing
          socket={socket}
          me={me}
          setMe={setMe}
          room={room}
          error={error}
        />
      )}
      {me.role === 'host' && (
        <HostView socket={socket} me={me} room={room} resetToHome={resetToHome} />
      )}
      {me.role === 'player' && (
        <PlayerView socket={socket} me={me} room={room} resetToHome={resetToHome} />
      )}
    </div>
  )
}
