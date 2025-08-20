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
  const [buzzersLocked, setBuzzersLocked] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setServerConnected(true));
    socket.on("disconnect", () => setServerConnected(false));
    socket.on("room_update", (data) => setRoom({ ...data }));
    socket.on("room_closed", () => { 
      alert("Host ended the game"); 
      setRoom(null); 
      setIsHost(false); 
    });
    socket.on("queue_update", (q) => setQueue(q));
    socket.on("show_score_popup", ({ teamScores }) => setPopup(teamScores));
    socket.on("close_score_popup", () => setPopup(null));
    socket.on("lock_all", () => setBuzzersLocked(true));
    socket.on("unlock_all", () => setBuzzersLocked(false));
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
    socket.emit("join_room", { roomCode, name: playerName }, ({ ok, error }) => { 
      if (!ok) return alert(error); 
      setIsHost(false); 
    });
  };

  const setTeams = () => socket.emit("set_teams", { roomCode, teamA, teamB });
  const assignTeam = (pid, teamKey) => socket.emit("assign_team", { roomCode, playerId: pid, teamKey });
  const startGame = () => socket.emit("start_game", { roomCode });
  const buzz = () => socket.emit("buzz", { roomCode });
  const awardPoints = (id, pts) => socket.emit("award_points", { roomCode, playerId: id, points: pts });
  const nextRound = () => socket.emit("start_next_round", { roomCode });
  const lockBuzzers = () => socket.emit("lock_buzzers", { roomCode });
  const unlockBuzzers = () => socket.emit("unlock_buzzers", { roomCode });

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <h1 className="text-4xl font-bold mb-4">Buzz-In</h1>
        <div className={`px-3 py-1 rounded-full mb-4 ${serverConnected ? "bg-green-500" : "bg-red-500"}`}>
          {serverConnected ? "🟢 Server Connected" : "🔴 Server Offline"}
        </div>
        <input 
          value={playerName} 
          onChange={(e)=>setPlayerName(e.target.value)} 
          placeholder="Your Name"
          className="p-2 rounded text-black mb-2"
        />
        <div className="mb-2">
          <label className="mr-4">
            <input type="radio" checked={mode==="freeplay"} onChange={()=>setMode("freeplay")}/> Free Play
          </label>
          <label>
            <input type="radio" checked={mode==="teams"} onChange={()=>setMode("teams")}/> Teams
          </label>
        </div>
        <button 
          onClick={createRoom} 
          className="px-4 py-2 rounded-lg bg-blue-400 hover:bg-blue-500 font-bold shadow mb-2"
        >
          Host
        </button>
        <input 
          value={roomCode} 
          onChange={(e)=>setRoomCode(e.target.value.toUpperCase())} 
          placeholder="Room Code"
          className="p-2 rounded text-black mb-2"
        />
        <button 
          onClick={joinRoom} 
          className="px-4 py-2 rounded-lg bg-green-400 hover:bg-green-500 font-bold shadow"
        >
          Join
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 text-white">
      <div className={`fixed top-2 right-2 px-3 py-1 rounded-full shadow-lg text-white ${serverConnected ? 'bg-green-500' : 'bg-red-500'}`}>
        {serverConnected ? "🟢 Server Connected" : "🔴 Server Offline"}
      </div>
      <h2 className="text-2xl font-bold mb-2">Room: {roomCode} ({room.mode})</h2>
      {isHost && room.mode==="teams" && !room.teams.A.name && (
        <div className="mb-4">
          <input 
            value={teamA} 
            onChange={(e)=>setTeamA(e.target.value)} 
            placeholder="Team A" 
            className="p-2 rounded text-black mr-2"
          />
          <input 
            value={teamB} 
            onChange={(e)=>setTeamB(e.target.value)} 
            placeholder="Team B" 
            className="p-2 rounded text-black mr-2"
          />
          <button 
            onClick={setTeams} 
            className="px-4 py-2 rounded-lg bg-blue-400 hover:bg-blue-500 font-bold shadow"
          >
            Set Teams
          </button>
        </div>
      )}
      {/* Player List as dark cards */}
      <ul className="players-list mb-4">
        {room.players.map((p) => (
          <li key={p.id} className="player-card">
            <span>
              {p.name} ({p.score}) {p.team && `[${room.teams[p.team].name}]`}
            </span>
            <span>
              {isHost && room.mode === "teams" && !p.team && (
                <>
                  <button onClick={() => assignTeam(p.id,"A")} className="ml-2 px-2 py-1 bg-blue-400 rounded">Team A</button>
                  <button onClick={() => assignTeam(p.id,"B")} className="ml-2 px-2 py-1 bg-blue-600 rounded">Team B</button>
                </>
              )}
              {isHost && room.mode === "freeplay" && (
                <>
                  <button onClick={() => awardPoints(p.id,1)} className="ml-2 px-2 py-1 bg-green-400 rounded">+1</button>
                  <button onClick={() => awardPoints(p.id,-1)} className="ml-2 px-2 py-1 bg-red-400 rounded">-1</button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {isHost && (
        <div className="space-x-2 mb-4">
          <button onClick={startGame} className="px-4 py-2 bg-blue-500 rounded-lg shadow">Start Game</button>
          <button onClick={nextRound} className="px-4 py-2 bg-purple-500 rounded-lg shadow">Next Round</button>
          <button onClick={lockBuzzers} className="px-4 py-2 bg-red-500 rounded-lg shadow">Lock Buzzers</button>
          <button onClick={unlockBuzzers} className="px-4 py-2 bg-green-500 rounded-lg shadow">Unlock Buzzers</button>
        </div>
      )}
      {!isHost && (
        <button 
          onClick={buzz} 
          disabled={buzzersLocked} 
          className="px-6 py-3 bg-yellow-400 text-black rounded-full text-lg font-bold shadow"
        >
          Buzz!
        </button>
      )}
      {queue.length>0 && (
        <div>
          <h3 className="font-bold">Queue:</h3>
          <ol>
            {queue.map(id=>(
              <li key={id}>{room.players.find(p=>p.id===id)?.name}</li>
            ))}
          </ol>
        </div>
      )}
      {popup && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-blue-700 p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Score Update</h2>
            <p>{room.teams.A.name||"Team A"}: {popup.A}</p>
            <p>{room.teams.B.name||"Team B"}: {popup.B}</p>
            {isHost && (
              <button 
                onClick={nextRound} 
                className="mt-4 px-4 py-2 bg-green-500 rounded-lg shadow"
              >
                Next Round
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
