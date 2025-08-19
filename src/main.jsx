import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import io from "socket.io-client";

const socket = io("https://buzz-in-server.onrender.com"); // update with your deployed server URL

const App = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    socket.on("connect", () => setPlayerId(socket.id));
    socket.on("room_update", (roomData) => setRoom(roomData));
    socket.on("player_buzzed", ({ playerId }) => {
      alert(`Player ${playerId} buzzed in!`);
    });
    return () => {
      socket.off("room_update");
      socket.off("player_buzzed");
    };
  }, []);

  // Host a game
  const handleHostGame = () => {
    if (!name.trim()) return setError("Enter a name to host");
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setError("");
      } else {
        setError(res.error || "Failed to create room");
      }
    });
  };

  // Join a game
  const handleJoinGame = () => {
    if (!roomCode.trim() || !name.trim()) return setError("Enter name & code");
    socket.emit("join_room", { roomCode, name }, (res) => {
      if (res.ok) {
        setError("");
      } else {
        setError(res.error || "Failed to join");
      }
    });
  };

  const isHost = room && room.hostId === playerId;

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Buzz-In Game</h1>

      {!room && (
        <div className="space-y-4">
          <input
            className="p-2 rounded text-black"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <button
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded mr-2"
              onClick={handleHostGame}
            >
              Host Game
            </button>
            <input
              className="p-2 rounded text-black"
              placeholder="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button
              className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded ml-2"
              onClick={handleJoinGame}
            >
              Join Game
            </button>
          </div>
          {error && <p className="text-red-400">{error}</p>}
        </div>
      )}

      {room && (
        <div>
          <h2 className="text-2xl font-semibold mb-2">Room {room.code}</h2>
          <ul className="mb-4">
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center space-x-2">
                <span>{p.name} ({p.team || "No team"}) - {p.score} pts</span>
                {isHost && p.id !== playerId && (
                  <div className="space-x-1">
                    <button
                      className="bg-purple-500 hover:bg-purple-600 px-2 py-1 rounded"
                      onClick={() =>
                        socket.emit("assign_team", { roomCode, playerId: p.id, team: "A" })
                      }
                    >
                      Team A
                    </button>
                    <button
                      className="bg-pink-500 hover:bg-pink-600 px-2 py-1 rounded"
                      onClick={() =>
                        socket.emit("assign_team", { roomCode, playerId: p.id, team: "B" })
                      }
                    >
                      Team B
                    </button>
                    <button
                      className="bg-yellow-500 hover:bg-yellow-600 px-2 py-1 rounded"
                      onClick={() =>
                        socket.emit("award_points", { roomCode, playerId: p.id, delta: 1 })
                      }
                    >
                      +1
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded"
                      onClick={() =>
                        socket.emit("award_points", { roomCode, playerId: p.id, delta: -1 })
                      }
                    >
                      -1
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <button
            className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded"
            onClick={() => socket.emit("buzz", { roomCode })}
          >
            Buzz
          </button>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById("root")).render(<App />);
