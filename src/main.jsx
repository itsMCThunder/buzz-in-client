import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import io from "socket.io-client";

const socket = io("https://buzz-in-server-1.onrender.com");

function App() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);
  const [serverConnected, setServerConnected] = useState(false);

  // Socket listeners
  useEffect(() => {
    socket.on("connect", () => setServerConnected(true));
    socket.on("disconnect", () => setServerConnected(false));

    socket.on("room_update", (data) => setRoom({ ...data }));
    socket.on("room_closed", () => {
      alert("Host ended the game");
      setRoom(null);
      setIsHost(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
      socket.off("room_closed");
    };
  }, []);

  // Actions
  const createRoom = () => {
    if (!playerName.trim()) return alert("Enter your name first!");
    socket.emit("create_room", { hostName: playerName }, ({ ok, roomCode }) => {
      if (ok) {
        setRoomCode(roomCode);
        setIsHost(true);
        setRoom({ hostId: socket.id, players: [{ id: socket.id, name: playerName, score: 0 }], buzzed: null });
      }
    });
  };

  const joinRoom = () => {
    if (!playerName.trim()) return alert("Enter your name first!");
    socket.emit("join_room", { roomCode, name: playerName }, ({ ok, error }) => {
      if (!ok) return alert(error);
      setIsHost(false);
    });
  };

  const buzz = () => socket.emit("buzz", { roomCode });
  const awardPoints = (id, pts) => socket.emit("award_points", { roomCode, playerId: id, points: pts });
  const resetBuzz = () => socket.emit("reset_buzz", { roomCode });

  // Pre-game lobby
  if (!room) {
    return (
      <div className="p-6 min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500">
        <h1 className="text-4xl font-extrabold text-white drop-shadow-lg mb-4">
          Buzz-In Game
        </h1>
        <div
          className={`fixed top-2 right-2 px-3 py-1 rounded-full shadow-lg ${
            serverConnected ? "bg-green-500" : "bg-red-500"
          } text-white`}
        >
          {serverConnected ? "🟢 Server Connected" : "🔴 Server Offline"}
        </div>
        <input
          type="text"
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="p-2 border rounded mb-2"
        />
        <button
          onClick={createRoom}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-2"
        >
          Host Game
        </button>
        <input
          type="text"
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          className="p-2 border rounded mb-2"
        />
        <button
          onClick={joinRoom}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Join Game
        </button>
      </div>
    );
  }

  // In-game screen
  return (
    <div className="p-6 min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-200">
      <h2 className="text-2xl font-bold mb-2">Room: {roomCode}</h2>
      <ul className="mb-4">
        {room.players.map((p) => {
          const isBuzzed = room.buzzed === p.id;
          return (
            <li key={p.id} className={`mb-1 font-semibold ${isBuzzed ? 'bg-yellow-200 rounded px-2' : ''}`}>
              {p.name} — {p.score} pts{" "}
              {isHost && (
                <span>
                  <button
                    onClick={() => awardPoints(p.id, 1)}
                    className="ml-2 px-2 py-1 bg-green-400 rounded"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => awardPoints(p.id, -1)}
                    className="ml-2 px-2 py-1 bg-red-400 rounded"
                  >
                    -1
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {!isHost && (
        <button
          onClick={buzz}
          disabled={room.buzzed !== null}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-full text-lg font-bold"
        >
          Buzz!
        </button>
      )}

      {isHost && (
        <button
          onClick={resetBuzz}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Reset Buzz
        </button>
      )}

      {room.buzzed && (
        <div className="mt-4 text-lg font-bold text-purple-800">
          Buzzed: {room.players.find((p) => p.id === room.buzzed)?.name}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
