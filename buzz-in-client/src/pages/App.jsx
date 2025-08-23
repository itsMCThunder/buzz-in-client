import React, { useEffect, useMemo, useState } from 'react'
import Landing from './Landing.jsx'
import HostView from './HostView.jsx'
import PlayerView from './PlayerView.jsx'
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

function useSocket() {
  const socket = useMemo(
    () =>
      io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        path: '/socket.io',
        withCredentials: false,
        autoConnect: true
      }),
    []
  )
  useEffect(() => () => socket.disconnect(), [socket])
  return socket
}

export default function App() {
  const socket = useSocket()
  const [me, setMe] = useState({ role: null, name: '', code: '', id: '' })
  const [room, setRoom] = useState(null)
  const [error, setError] = useState(null)

  // Global ticking clock: drives live countdowns
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onUpdate = (state) => setRoom(state)
    const onEnded = ({ reason }) => {
      alert('Room ended: ' + reason)
      setMe({ role: null, name: '', code: '', id: '' })
      setRoom(null)
    }
    const onCreated = ({ code }) => setMe(m => ({ ...m, code }))
    const onErr = ({ message }) => setError(message)
    const onKicked = () => {
      alert('You were removed by the host.')
      setMe({ role: null, name: '', code: '', id: '' })
      setRoom(null)
    }

    socket.on('room:update', onUpdate)
    socket.on('room:ended', onEnded)
    socket.on('host:roomCreated', onCreated)
    socket.on('error:message', onErr)
    socket.on('player:kicked', onKicked)

    return () => {
      socket.off('room:update', onUpdate)
      socket.off('room:ended', onEnded)
      socket.off('host:roomCreated', onCreated)
      socket.off('error:message', onErr)
      socket.off('player:kicked', onKicked)
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
        <HostView socket={socket} me={me} room={room} now={now} resetToHome={resetToHome} />
      )}
      {me.role === 'player' && (
        <PlayerView socket={socket} me={me} room={room} now={now} resetToHome={resetToHome} />
      )}
    </div>
  )
}
