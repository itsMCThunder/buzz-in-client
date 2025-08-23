import React, { useEffect, useMemo, useState } from 'react'

function secondsLeft(ts) {
  if (!ts) return 0
  const diff = Math.max(0, Math.floor((ts - Date.now())/1000))
  return diff
}

export default function PlayerView({ socket, me, room, resetToHome }) {
  const [buzzing, setBuzzing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      if (room) {
        socket.emit('ping:activity', { code: room.code })
      }
    }, 15000)
    return () => clearInterval(t)
  }, [socket, room])

  if (!room) return <div className="card">Joining room...</div>
  const players = room.players || []
  const meFull = players.find(p => p.id === me.id)
  const myTeam = meFull?.team || null

  const unlockIn = secondsLeft(room.buzzLockedUntil)
  const locked = unlockIn > 0
  const isHot = room.hotSeats.A === me.id || room.hotSeats.B === me.id

  const queuedIdx = room.queue.indexOf(me.id)

  const tryBuzz = () => {
    if (!room) return
    setBuzzing(true)
    socket.emit('player:buzz', { code: room.code, playerId: me.id })
    setTimeout(() => setBuzzing(false), 500)
  }

  return (
    <div className="card">
      <div className="player">
        <div>Room: <strong>{room.code}</strong></div>
        <button onClick={resetToHome}>Leave</button>
      </div>

      <h2>Hello, {me.name}</h2>
      <div className="player">
        <div>Your Team</div>
        <div><strong>{myTeam || 'Unassigned'}</strong></div>
      </div>

      <div className="player">
        <div>Game State</div>
        <div><strong>{room.state}</strong></div>
      </div>

      {room.state === 'lobby' && (
        <p>Waiting for the host to start the game...</p>
      )}

      {room.state === 'inRound' && (
        <div className="center" style={{marginTop:16}}>
          {locked && !isHot && <p>Buzzers unlock in <strong>{unlockIn}</strong>s</p>}
          <button
            style={{ fontSize: 24, padding: '20px 24px' }}
            disabled={locked && !isHot}
            onClick={tryBuzz}
          >
            {queuedIdx !== -1 ? `Buzzed! In queue #${queuedIdx+1}` : 'Buzz'}
          </button>
        </div>
      )}

      {room.state === 'summary' && (
        <div className="center" style={{marginTop:16}}>
          <h3>Round Summary</h3>
          <p>Scores</p>
          <p>Team A: <strong>{room.teams.A.score}</strong> — Team B: <strong>{room.teams.B.score}</strong></p>
          <p>Waiting for next round...</p>
        </div>
      )}
    </div>
  )
}
