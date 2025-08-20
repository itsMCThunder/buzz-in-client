import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import io from "socket.io-client";

const socket = io("https://buzz-in-server-1.onrender.com");

function App() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);
  const [mode, setMode] = useState("freeplay");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [queue, setQueue] = useState([]);
  const [popup, setPopup] = useState(null);
  const [serverConnected, setServerConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setServerConnected(true));
    socket.on("disconnect", () => setServerConnected(false));
    socket.on("room_update", (data) => setRoom({ ...data }));
    socket.on("room_closed", () => { alert("Host ended the game"); setRoom(null); setIsHost(false); });
    socket.on("queue_update", (q) => setQueue(q));
    socket.on("show_score_popup", ({ teamScores }) => setPopup(teamScores));
    socket.on("close_score_popup", () => setPopup(null));
    return () => { socket.off(); };
  }, []);

  const createRoom = () => {
    if (!playerName.trim()) return alert("Enter your name first!");
    socket.emit("create_room", { hostName: playerName, mode }, ({ ok, roomCode }) => {
      if (ok) { setRoomCode(roomCode); setIsHost(true); }
    });
  };

  const joinRoom = () => {
    if (!playerName.trim()) return alert("Enter your name first!");
    socket.emit("join_room", { roomCode, name: playerName }, ({ ok, error }) => { if (!ok) return alert(error); setIsHost(false); });
  };

  const setTeams = () => socket.emit("set_teams", { roomCode, teamA, teamB });
  const assignTeam = (pid, teamKey) => socket.emit("assign_team", { roomCode, playerId: pid, teamKey });
  const startGame = () => socket.emit("start_game", { roomCode });
  const buzz = () => socket.emit("buzz", { roomCode });
  const awardPoints = (id, pts) => socket.emit("award_points", { roomCode, playerId: id, points: pts });
  const nextRound = () => socket.emit("start_next_round", { roomCode });

  if (!room) {
    return (<div><h1>Buzz-In</h1><div>{serverConnected?"🟢 Connected":"🔴 Offline"}</div>
      <input value={playerName} onChange={(e)=>setPlayerName(e.target.value)} placeholder="Your Name"/>
      <div><label><input type="radio" checked={mode==="freeplay"} onChange={()=>setMode("freeplay")}/> Free Play</label>
      <label><input type="radio" checked={mode==="teams"} onChange={()=>setMode("teams")}/> Teams</label></div>
      <button onClick={createRoom}>Host</button>
      <input value={roomCode} onChange={(e)=>setRoomCode(e.target.value.toUpperCase())} placeholder="Room Code"/>
      <button onClick={joinRoom}>Join</button></div>);
  }

  return (<div>
    <h2>Room: {roomCode} ({room.mode})</h2>
    {isHost && room.mode==="teams" && !room.teams.A.name && (<div>
      <input value={teamA} onChange={(e)=>setTeamA(e.target.value)} placeholder="Team A"/>
      <input value={teamB} onChange={(e)=>setTeamB(e.target.value)} placeholder="Team B"/>
      <button onClick={setTeams}>Set Teams</button></div>)}
    <ul>{room.players.map(p=>(<li key={p.id}>{p.name} ({p.score}) {p.team && `[${room.teams[p.team].name}]`}
      {isHost && room.mode==="teams" && !p.team && (<><button onClick={()=>assignTeam(p.id,"A")}>Team A</button>
      <button onClick={()=>assignTeam(p.id,"B")}>Team B</button></>)}
      {isHost && room.mode==="freeplay" && (<><button onClick={()=>awardPoints(p.id,1)}>+1</button>
      <button onClick={()=>awardPoints(p.id,-1)}>-1</button></>)}</li>))}</ul>
    {isHost && <button onClick={startGame}>Start Game</button>}
    {!isHost && <button onClick={buzz}>Buzz!</button>}
    {isHost && room.mode==="teams" && (<div>
      <button onClick={()=>awardPoints(room.buzzed,10)}>+10</button>
      <button onClick={()=>awardPoints(room.buzzed,0)}>0</button>
      <button onClick={()=>awardPoints(room.buzzed,-10)}>-10</button>
      <button onClick={nextRound}>Next Round</button></div>)}
    {queue.length>0 && (<div><h3>Queue:</h3><ol>{queue.map(id=>(<li key={id}>{room.players.find(p=>p.id===id)?.name}</li>))}</ol></div>)}
    {popup && (<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"white",padding:"20px",borderRadius:"10px"}}>
        <h2>Score Update</h2>
        <p>{room.teams.A.name||"Team A"}: {popup.A}</p>
        <p>{room.teams.B.name||"Team B"}: {popup.B}</p>
        {isHost && <button onClick={nextRound}>Next Round</button>}
      </div></div>)}
  </div>);
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
