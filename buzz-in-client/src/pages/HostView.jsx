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

export default function HostView({ socket, me, room, now: nowFromParent, resetToHome }) {
  const [teamAName, setTeamAName] = useState('')
  const [teamBName, setTeamBName] = useState('')

  // Fallback local ticker so numbers always update
  const [localNow, setLocalNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setLocalNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const now = nowFromParent || localNow

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
  const skipRound = () => socket.emit('host:skipRound', { code: room.code }) // NEW
  const kick = (pid, name) => {
    if (confirm(`Kick ${name || 'this player'} from the game?`)) {
      socket.emit('host:kickPlayer', { code: room.code, playerId: pid })
    }
  }
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
            <input value={teamAName} onChange={e => setTeamAName(e.target.value)} />
            <span className="score">{room.teams.A.score}</span>
          </div>
          <div className="team-header" style={{ marginTop: 8 }}>
            <input value={teamBName} onChange={e => setTeamBName(e.target.value)} />
            <span className="score">{room.teams.B.score}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap:'wrap' }}>
            <button onClick={saveTeamNames}>Save Team Names</button>
            <button onClick={clearScores}>Clear All Points</button>
          </div>

          <h3 style={{ marginTop: 16 }}>Unassigned Players</h3>
          <div className="list">
            {unassigned.map(p => (
              <div className="player" key={p.id}>
                <div>{p.name} {!p.connected && <span className="badge">disconnected</span>}</div>
                <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  <button onClick={() => assign(p.id, 'A')}>Team A</button>
                  <button onClick={() => assign(p.id, 'B')}>Team B</button>
                  <button onClick={() => assign(p.id, null)}>Clear</button>
                  <button onClick={() => kick(p.id, p.name)}>Kick</button> {/* NEW */}
                </div>
              </div>
            ))}
            {!unassigned.length && <small>No unassigned players yet...</small>}
          </div>
        </div>

        <div className="col">
          <h2>{room.teams.A.name}</h2>
          <div className="list">
            {teamAIds.map(id => {
              const p = players.find(x => x.id === id)
              if (!p) return null
              const isHot = room.hotSeats.A === p.id
              return (
                <div className="player" key={id}>
                  <div>{p.name} {!p.connected && <span className="badge">disconnected</span>}</div>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    {isHot && <span className="badge">HOT SEAT</span>}
                    <button onClick={() => kick(p.id, p.name)}>Kick</button> {/* NEW */}
                  </div>
                </div>
              )
            })}
            {!teamAIds.length && <small>No players on {room.teams.A.name}</small>}
          </div>

          <h2 style={{ marginTop: 16 }}>{room.teams.B.name}</h2>
          <div className="list">
            {teamBIds.map(id => {
              const p = players.find(x => x.id === id)
              if (!p) return null
              const isHot = room.hotSeats.B === p.id
              return (
                <div className="player" key={id}>
                  <div>{p.name} {!p.connected && <span className="badge">disconnected</span>}</div>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    {isHot && <span className="badge">HOT SEAT</span>}
                    <button onClick={() => kick(p.id, p.name)}>Kick</button> {/* NEW */}
                  </div>
                </div>
              )
            })}
            {!teamBIds.length && <small>No players on {room.teams.B.name}</small>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Round Controls</h2>
        <div className="row">
          <div className="col">
            <div className="player"><div>Game State</div><div><strong>{room.state}</strong></div></div>

            {room.state === 'lobby' && (
              <button onClick={startGame}>Start Game</button>
            )}

            {room.state === 'inRound' && (
              <div className="list">
                <div className="player"><div>Hot Seat A</div><div>{hotA ? hotA.name : '-'}</div></div>
                <div className="player"><div>Hot Seat B</div><div>{hotB ? hotB.name : '-'}</div></div>

                <div className="player" style={{ alignItems: 'stretch' }}>
                  <div>Buzz unlocks in</div>
                  <div style={{ minWidth: 120, textAlign: 'right' }}>
                    <strong>{`${unlockIn}s`}</strong>
                  </div>
                </div>
                <div style={{ height: 8, background: '#20242b', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${unlockPct * 100}%`, background: 'var(--warn)' }} />
                </div>

                <div className="player" style={{ alignItems: 'stretch', marginTop: 8 }}>
                  <div>Current to decide</div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{currentFrontPlayer ? currentFrontPlayer.name : '-'}</strong>
                  </div>
                </div>
                <div className="player" style={{ alignItems: 'stretch' }}>
                  <div>Time to decide</div>
                  <div style={{ minWidth: 120, textAlign: 'right' }}>
                    <strong>{`${decideIn}s`}</strong>
                  </div>
                </div>
                <div style={{ height: 8, background: '#20242b', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${decidePct * 100}%`, background: 'var(--danger)' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap:'wrap' }}>
                  <button onClick={award}>✅ Award Point</button>
                  <button onClick={wrong}>❌ Wrong / Skip Player</button>
                  <button onClick={skipRound}>⏭️ Skip Round</button>
                </div>

                <h3 style={{ marginTop: 8 }}>Queue</h3>
                <div className="list">
                  {room.queue.map((id, idx) => {
                    const p = players.find(x => x.id === id)
                    return <div className="player" key={id}><div>{idx+1}. {p ? p.name : id}</div><div /></div>
                  })}
                  {!room.queue.length && <small>No one has buzzed in yet.</small>}
                </div>
              </div>
            )}

            {room.state === 'summary' && (
              <div>
                <div className="player"><div>Round ended</div><div /></div>
                <button onClick={nextRound}>Next Round</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
