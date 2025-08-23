import React, { useEffect, useState } from 'react'

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

export default function HostView({ socket, me, room, now, resetToHome }) {
  const [teamAName, setTeamAName] = useState('')
  const [teamBName, setTeamBName] = useState('')

  useEffect(() => {
    if (room) {
      setTeamAName(room.teams.A.name || 'Team A')
      setTeamBName(room.teams.B.name || 'Team B')
    }
  }, [room])

  if (!room) return <div className="card">Loading room...</div>

  const players = room.players || []
  const teamAIds = room.teams.A.players || []
  const teamBIds = room.teams.B.players || []

  const unassigned = players.filter(p => p.team !== 'A' && p.team !== 'B')

  const assign = (pid, t) =>
    socket.emit('host:assignPlayerToTeam', { code: room.code, playerId: pid, team: t })
  const startGame = () => socket.emit('host:startGame', { code: room.code })
  const award = () => socket.emit('host:awardPoint', { code: room.code })
  const wrong = () => socket.emit('host:markWrongOrSkip', { code: room.code })
  const nextRound = () => socket.emit('host:nextRound', { code: room.code })
  const saveTeamNames = () =>
    socket.emit('host:setTeamNames', { code: room.code, teamAName, teamBName })
  const clearScores = () => socket.emit('host:clearScores', { code: room.code })

  // Live countdowns
  const UNLOCK_MS = 20000
  const DECISION_MS = 15000
  const unlockIn = secondsLeft(room.buzzLockedUntil, now)
  const decideIn = secondsLeft(room.currentBuzzDeadline, now)
  const unlockPct = pctRemaining(room.buzzLockedUntil, now, UNLOCK_MS)
  const decidePct = pctRemaining(room.currentBuzzDeadline, now, DECISION_MS)

  const currentFront = room.queue?.[0] || null
  const currentFrontPlayer = players.find(p => p.id === currentFront)

  const hotA = players.find(p => p.id === room.hotSeats.A)
  const hotB = players.find(p => p.id === room.hotSeats.B)

  return (
    <div className="card">
      <div className="row">
        <div className="col">
          <h2>Host Panel</h2>
          <div className="player">
            <div>Room Code: <strong>{room.code}</strong></div>
            <button onClick={resetToHome}>Leave</button>
          </div>

          <h3>Teams</h3>
          <div className="team-header">
            <input value={teamAName} onChange={e=>setTeamAName(e.target.value)} />
            <span className="score">{room.teams.A.score}</span>
          </div>
          <div className="team-header" style={{marginTop:8}}>
            <input value={teamBName} onChange={e=>setTeamBName(e.target.value)} />
            <span className="score">{room.teams.B.score}</span>
          </div>
          <div style={{display:'flex', gap:8, marginTop:8}}>
