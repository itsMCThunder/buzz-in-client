import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import io from "socket.io-client";
import "./App.css";

const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:3001");

function App() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);

  // Check server connection
  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("room_update", (room) => {
      setPlayers(room.players || []);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
    };
  }, []);import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import io from "socket.io-client";

const socket = io(import.meta.env.VITE_SERVER_URL || "https://your-server-url.com");

function App() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    socket.on("room_update", ({ roomCode, players }) => {
      setRoomCode(roomCode);
      setPlayers(players);
    });

    return () => {
      socket.off("room_update");
    };
  }, []);

  // ------------------------
  // Host Game
  // ------------------------
  const handleHostGame = () => {
    if (!name.trim()) return setError("Enter a name to host");
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setJoined(true);
        setIsHost(true);
        setError("");
      } else {
        setError(res.error || "Failed to create room");
      }
    });
  };

  // ------------------------
  // Join Game
  // ------------------------
  const handleJoinGame = () => {
    if (!name.trim() || !roomCode.trim()) return setError("Enter name & room code");
    socket.emit("join_room", { roomCode, name }, (res) => {
      if (res.ok) {
        setJoined(true);
        setIsHost(false);
        setError("");
      } else {
        setError(res.error || "Failed to join room");
      }
    });
  };

  // ------------------------
  // Award Points (Host only)
  // ------------------------
  const awardPoints = (playerId, points) => {
    socket.emit("award_points", { roomCode, playerId, points });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-6">Buzz In!</h1>

      {!joined ? (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-96">
          <input
            type="text"
            className="w-full p-3 mb-4 rounded-lg text-black"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button
            className="w-full bg-green-500 hover:bg-green-600 p-3 rounded-lg font-semibold mb-4"
            onClick={handleHostGame}
          >
            Host Game
          </button>

          <input
            type="text"
            className="w-full p-3 mb-4 rounded-lg text-black"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />

          <button
            className="w-full bg-blue-500 hover:bg-blue-600 p-3 rounded-lg font-semibold"
            onClick={handleJoinGame}
          >
            Join Game
          </button>

          {error && <p className="text-red-400 mt-3">{error}</p>}
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Room Code: {roomCode}</h2>
          <ul className="mb-6">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex justify-between items-center bg-gray-700 p-3 mb-2 rounded-lg"
              >
                <span>
                  {p.name} {p.team ? `(${p.team})` : ""}
                </span>
                <span className="font-bold">{p.score}</span>
                {isHost && p.id !== socket.id && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => awardPoints(p.id, +1)}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-lg text-sm font-bold"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => awardPoints(p.id, -1)}
                      className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm font-bold"
                    >
                      -1
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {isHost && (
            <p className="text-yellow-400">You are the host. Use buttons to adjust scores.</p>
          )}
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);


  // Host a game
  const handleHostGame = () => {
    if (!name.trim()) return setError("Enter a name to host");
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setIsHost(true);
        setError("");
      } else {
        setError(res.error || "Failed to create room");
      }
    });
  };

  // Join a game
  const handleJoinGame = () => {
    if (!name.trim() || !roomCode.trim())
      return setError("Enter name and room code");
    socket.emit("join_room", { roomCode, name }, (res) => {
      if (res.ok) {
        setIsHost(false);
        setError("");
      } else {
        setError(res.error || "Failed to join room");
      }
    });
  };

  return (
    <div className="app-container">
      <header>
        <h1>⚡ Buzz-In Game</h1>
        <p className="status">
          {connected ? (
            <span className="online">🟢 Connected</span>
          ) : (
            <span className="offline">🔴 Disconnected</span>
          )}
        </p>
      </header>

      <main>
        {!roomCode ? (
          <div className="lobby">
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="buttons">
              <button className="btn-primary" onClick={handleHostGame}>
                Host Game
              </button>
              <button className="btn-secondary" onClick={handleJoinGame}>
                Join Game
              </button>
            </div>
            <input
              type="text"
              placeholder="Room Code (for joining)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            {error && <p className="error">{error}</p>}
          </div>
        ) : (
          <div className="game-room">
            <h2>Room Code: {roomCode}</h2>
            <div className="players-list">
              {players.map((p) => (
                <div key={p.id} className="player-card">
                  <span>{p.name}</span>
                  <span className="score">Score: {p.score}</span>
                </div>
              ))}
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="host-controls">
                <h3 className="controls-title">Host Controls</h3>
                <div className="point-buttons">
                  <button
                    className="btn btn-positive"
                    onClick={() =>
                      socket.emit("award_points", {
                        roomCode,
                        playerId: currentPlayer?.id || players[0]?.id,
                        delta: 50,
                      })
                    }
                  >
                    +50
                  </button>
                  <button
                    className="btn btn-neutral"
                    onClick={() =>
                      socket.emit("award_points", {
                        roomCode,
                        playerId: currentPlayer?.id || players[0]?.id,
                        delta: 0,
                      })
                    }
                  >
                    0
                  </button>
                  <button
                    className="btn btn-negative"
                    onClick={() =>
                      socket.emit("award_points", {
                        roomCode,
                        playerId: currentPlayer?.id || players[0]?.id,
                        delta: -50,
                      })
                    }
                  >
                    -50
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
