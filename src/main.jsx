import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import io from "socket.io-client";
import "./index.css";

const socket = io(import.meta.env.VITE_SERVER_URL || "https://buzz-in-server.onrender.com");

function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [inGame, setInGame] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState([]);
  const [team, setTeam] = useState(null);
  const [score, setScore] = useState(0);

  // --- Connection status ---
  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room_update", (updatedRoom) => setPlayers(updatedRoom.players));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
    };
  }, []);

  // --- Host game ---
  const handleHostGame = () => {
    if (!name.trim()) return setError("Enter a name to host");
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setIsHost(true);
        setInGame(true);
        setError("");
      } else setError(res.error || "Failed to create room");
    });
  };

  // --- Join game ---
  const handleJoinGame = () => {
    if (!name.trim()) return setError("Enter your name");
    if (!roomCode.trim()) return setError("Enter a room code");
    socket.emit("join_room", { roomCode, name }, (res) => {
      if (res.ok) {
        setInGame(true);
        setIsHost(false);
        setError("");
      } else setError(res.error || "Failed to join room");
    });
  };

  // --- Assign team (host only) ---
  const assignTeam = (playerId, team) => {
    socket.emit("assign_team", { roomCode, playerId, team });
  };

  // --- Adjust score (host only) ---
  const adjustScore = (playerId, delta) => {
    socket.emit("update_score", { roomCode, playerId, delta });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-extrabold mb-6">Buzz-In Game</h1>
      <p className={`mb-4 ${connected ? "text-green-400" : "text-red-400"}`}>
        {connected ? "Connected to server" : "Not connected"}
      </p>

      {!inGame ? (
        <div className="w-full max-w-md bg-gray-700 p-6 rounded-lg shadow-lg">
          <input
            type="text"
            className="w-full p-3 mb-3 rounded bg-gray-800 border border-gray-600"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleHostGame}
              className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Host Game
            </button>
            <input
              type="text"
              className="w-24 p-2 rounded bg-gray-800 border border-gray-600 text-center"
              placeholder="Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button
              onClick={handleJoinGame}
              className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
            >
              Join Game
            </button>
          </div>
          {error && <p className="text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="w-full max-w-md bg-gray-700 p-6 rounded-lg shadow-lg">
          {isHost ? (
            <>
              <h2 className="text-xl font-bold mb-4">Host Controls</h2>
              <p className="mb-2">Room Code: <span className="font-mono">{roomCode}</span></p>
              <h3 className="font-semibold mb-2">Players:</h3>
              <ul>
                {players.map((p) => (
                  <li key={p.id} className="flex justify-between mb-2">
                    <span>
                      {p.name} — Team: {p.team || "Unassigned"} — Score: {p.score}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => assignTeam(p.id, "A")} className="bg-blue-500 px-2 rounded">A</button>
                      <button onClick={() => assignTeam(p.id, "B")} className="bg-red-500 px-2 rounded">B</button>
                      <button onClick={() => adjustScore(p.id, 1)} className="bg-green-500 px-2 rounded">+1</button>
                      <button onClick={() => adjustScore(p.id, -1)} className="bg-yellow-600 px-2 rounded">-1</button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="mt-4 bg-yellow-600 px-4 py-2 rounded hover:bg-yellow-700">Start Game</button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">Player View</h2>
              <ul>
                {players.map((p) => (
                  <li key={p.id}>
                    {p.name} — Team: {p.team || "Unassigned"} — Score: {p.score}
                  </li>
                ))}
              </ul>
              <button className="mt-4 bg-purple-600 px-4 py-2 rounded hover:bg-purple-700">Buzz!</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
