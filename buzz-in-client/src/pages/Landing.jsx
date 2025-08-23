import React, { useState } from 'react'

export default function Landing({ socket, me, setMe, error }) {
  const [hostName, setHostName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  const createRoom = () => {
    if (!hostName.trim()) { alert('Enter your host name'); return }
    setMe({ role: 'host', name: hostName.trim(), code: '', id: '' })
    socket.emit('host:createRoom', { hostName: hostName.trim() })
  }

  const joinRoom = () => {
    if (!joinName.trim()) { alert('Enter your name'); return }
    if (!/^[0-9]{4}$/.test(joinCode.trim())) { alert('Enter the 4-digit code'); return }
    const playerId = Math.random().toString(36).slice(2)
    setMe({ role: 'player', name: joinName.trim(), code: joinCode.trim(), id: playerId })
    socket.emit('player:joinRoom', { code: joinCode.trim(), playerId, playerName: joinName.trim() })
  }

  return (
    <div className="card">
      <h1>Buzz In</h1>
      <p>Simple game helper. One host, everyone else joins with a 4‑digit code.</p>

      <div className="row">
        <div className="col">
          <h3>Host Game</h3>
          <input placeholder="Your name (host)"
                 value={hostName} onChange={(e)=>setHostName(e.target.value)} />
          <div style={{height:8}} />
          <button onClick={createRoom}>Host Game</button>
        </div>
        <div className="col">
          <h3>Join Game</h3>
          <input placeholder="Your name"
                 value={joinName} onChange={(e)=>setJoinName(e.target.value)} />
          <div style={{height:8}} />
          <input placeholder="4-digit code"
                 value={joinCode} onChange={(e)=>setJoinCode(e.target.value)} />
          <div style={{height:8}} />
          <button onClick={joinRoom}>Join Game</button>
        </div>
      </div>

      {error && <p style={{color:'#f87171'}}>Error: {error}</p>}
      <div style={{marginTop:16}}>
        <small>Works on mobile and desktop.</small>
      </div>
    </div>
  )
}
