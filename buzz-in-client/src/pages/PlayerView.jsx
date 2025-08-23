import React from 'react'

function secondsLeft(deadlineMs, nowMs) {
  if (!deadlineMs) return 0
  const diffMs = deadlineMs - nowMs
  return Math.max(0, Math.ceil(diffMs / 1000))
}

function pctRemaining(deadlineMs, nowMs, totalMs) {
  if (!deadlineMs) return 0
  const remain = Math.max(0, deadlineMs - nowMs)
  return Math.max(0, Math.min(1, remain / totalMs))
}

export default function PlayerView({ socket, me, room, now, resetToHome }) {
  if (!room) return <div className="card">Joining room...</div>

  const players = room.players || []
  const meFull = players.find(p => p.id === me.id)
  const myTeam = meFull?.team || null

  const UNLOCK_MS = 20000
  const unlockIn = secondsLeft(room.buzzLockedUntil, now)
  const locked = unlockIn > 0
  const unlockPct = pctRemaining(room.buzzLockedUntil, now, UNLOCK_MS)

  const isHot = room.hotSeats.A === me.id || room.hotSeats.B === me.id
  const queuedIdx = room.queue.indexOf(me.id)

  const tryBuzz = () => {
    if (!room) return
    socket.emit('player:buzz', { code: room.code, playerId: me.id })
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
          {locked && !isHot && (
            <>
              <p>Buzzers unlock in <strong>{unlockIn}</strong>s</p>
              <div style={{height:8, background:'#20242b', borderRadius:6, overflow:'hidden', margin:'8px auto', maxWidth:360}}>
                <div style={{height:'100%', width:`${unlockPct*100}%`, background:'var(--warn)'}} />
              </div>
            </>
          )}
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
