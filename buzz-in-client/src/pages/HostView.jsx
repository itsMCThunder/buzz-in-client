import React, { useEffect, useMemo, useState } from 'react'

function secondsLeft(ts) {
  if (!ts) return 0
  const diff = Math.max(0, Math.floor((ts - Date.now())/1000))
  return diff
}

export default function HostView({ socket, me, room, resetToHome }) {
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

  const assign = (pid, t) => {
    socket.emit('host:assignPlayerToTeam', { code: room.code, playerId: pid, team: t })
  }
  const startGame = () => socket.emit('host:startGame', { code: room.code })
  const award = () => socket.emit('host:awardPoint', { code: room.code })
  const wrong = () => socket.emit('host:markWrongOrSkip', { code: room.code })
  const nextRound = () => socket.emit('host:nextRound', { code: room.code })
  const saveTeamNames = () => {
    socket.emit('host:setTeamNames', { code: room.code, teamAName, teamBName })
  }
  const clearScores = () => socket.emit('host:clearScores', { code: room.code })

  const unlockIn = secondsLeft(room.buzzLockedUntil)
  const decideIn = secondsLeft(room.currentBuzzDeadline)

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
            <button onClick={saveTeamNames}>Save Team Names</button>
            <button onClick={clearScores}>Clear All Points</button>
          </div>

          <h3 style={{marginTop:16}}>Unassigned Players</h3>
          <div className="list">
            {unassigned.map(p => (
              <div className="player" key={p.id}>
                <div>{p.name} {!p.connected && <span className="badge">disconnected</span>}</div>
                <div>
                  <button onClick={()=>assign(p.id,'A')}>Team A</button>{' '}
                  <button onClick={()=>assign(p.id,'B')}>Team B</button>{' '}
                  <button onClick={()=>assign(p.id,null)}>Clear</button>
                </div>
              </div>
            ))}
            {!unassigned.length && <small>No unassigned players yet...</small>}
          </div>
        </div>

        <div className="col">
          <h2>Team A</h2>
          <div className="list">
            {teamAIds.map(id => {
              const p = players.find(x => x.id === id)
              if (!p) return null
              const isHot = room.hotSeats.A === p.id
              return (
                <div className="player" key={id}>
                  <div>{p.name} {!p.connected && <span className="badge">disconnected</span>}</div>
                  <div>{isHot && <span className="badge">HOT SEAT</span>}</div>
                </div>
              )
            })}
            {!teamAIds.length && <small>No players on Team A</small>}
          </div>

          <h2 style={{marginTop:16}}>Team B</h2>
          <div className="list">
            {teamBIds.map(id => {
              const p = players.find(x => x.id === id)
              if (!p) return null
              const isHot = room.hotSeats.B === p.id
              return (
                <div className="player" key={id}>
                  <div>{p.name} {!p.connected && <span className="badge">disconnected</span>}</div>
                  <div>{isHot && <span className="badge">HOT SEAT</span>}</div>
                </div>
              )
            })}
            {!teamBIds.length && <small>No players on Team B</small>}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
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
                <div className="player"><div>Buzz unlocks in</div><div>{unlockIn}s</div></div>
                <div className="player"><div>Current to decide</div><div>{currentFrontPlayer ? currentFrontPlayer.name : '-'}</div></div>
                <div className="player"><div>Time to decide</div><div>{decideIn}s</div></div>
                <div style={{display:'flex', gap:8}}>
                  <button onClick={award}>✅ Award Point</button>
                  <button onClick={wrong}>❌ Wrong / Skip</button>
                </div>

                <h3 style={{marginTop:8}}>Queue</h3>
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
