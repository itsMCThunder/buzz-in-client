// main.jsx — Buzz-In Frontend with Hot Seat + Team Assignments + Enhanced Visuals

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import io from "socket.io-client";
import "./index.css"; // Make sure you have Tailwind or your CSS

const socket = io("/", { path: "/socket.io" });

function App() {
  const [step, setStep] = useState("menu"); // menu | lobby | game
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // --- Socket listeners
  useEffect(() => {
    socket.on("room_state", (data) => setRoom(data));
    return () => socket.off("room_state");
  }, []);

  // --- Room actions
  function createRoom() {
    if (!name) return;
    socket.emit("create_room", { hostName: name }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setIsHost(true);
        setStep("lobby");
      } else alert(res.error);
    });
  }

  function joinRoom() {
    if (!roomCode || !name) return;
    socket.emit("join_room", { roomCode, name }, (res) => {
      if (res.ok) {
        setIsHost(false);
        setStep("lobby");
      } else alert(res.error);
    });
  }

  // --- Host actions
  function assignTeam(playerId, team) {
    socket.emit("assign_team", { roomCode, playerId, team });
  }

  function startGame() {
    socket.emit("start_game", { roomCode });
  }

  function nextRound() {
    socket.emit("next_round", { roomCode });
  }

  function clearBuzzers() {
    socket.emit("clear_buzzers", { roomCode });
  }

  function adjustScore(playerId, delta) {
    socket.emit("adjust_score", { roomCode, playerId, delta });
  }

  // --- Player actions
  function buzz() {
    socket.emit("buzz", { roomCode });
  }

  // -------------------- UI --------------------
  if (step === "menu") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
        <h1 className="text-5xl font-bold mb-8 drop-shadow-lg">Buzz-In</h1>
        <input
          className="p-2 mb-4 rounded text-black w-64"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-4 mb-4">
          <button
            onClick={createRoom}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg text-lg font-semibold"
          >
            Host Game
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className="p-2 rounded text-black w-32"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <button
            onClick={joinRoom}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-lg font-semibold"
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (!room) return <div className="text-center p-10">Loading room...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Room Header */}
        <div className="bg-white shadow-lg rounded-xl p-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Room {room.roomCode}</h1>
          <h2 className="text-xl font-semibold">
            Tipsy:{" "}
            <span className="text-red-600">{room.teamScores?.tipsy ?? 0}</span>{" "}
            | Wobbly:{" "}
            <span className="text-blue-600">{room.teamScores?.wobbly ?? 0}</span>
          </h2>
          {room.countdownActive && (
            <div className="mt-4 text-lg font-bold text-yellow-600 animate-pulse">
              ⏳ 15-Second Countdown Active!
            </div>
          )}
        </div>

        {/* Players */}
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Players</h2>
          <ul className="space-y-2">
            {room.players.map((p) => {
              const isHotSeat =
                p.id === room.currentHotSeats?.tipsy ||
                p.id === room.currentHotSeats?.wobbly;
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    p.team === "tipsy"
                      ? "border-red-400 bg-red-50"
                      : p.team === "wobbly"
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-300"
                  }`}
                >
                  <div>
                    <span className="font-semibold">{p.name}</span>{" "}
                    <span className="text-sm text-gray-500">
                      ({p.team || "Unassigned"}) - {p.score} pts
                    </span>
                    {isHotSeat && (
                      <span className="ml-2 px-2 py-1 bg-yellow-300 rounded-full text-xs font-bold">
                        HOT SEAT
                      </span>
                    )}
                  </div>
                  {isHost && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => adjustScore(p.id, 50)}
                        className="px-2 py-1 bg-green-500 text-white rounded"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => adjustScore(p.id, 0)}
                        className="px-2 py-1 bg-gray-500 text-white rounded"
                      >
                        0
                      </button>
                      <button
                        onClick={() => adjustScore(p.id, -50)}
                        className="px-2 py-1 bg-red-500 text-white rounded"
                      >
                        -50
                      </button>
                      {!p.team && (
                        <>
                          <button
                            onClick={() => assignTeam(p.id, "tipsy")}
                            className="px-2 py-1 bg-red-500 text-white rounded"
                          >
                            Tipsy
                          </button>
                          <button
                            onClick={() => assignTeam(p.id, "wobbly")}
                            className="px-2 py-1 bg-blue-500 text-white rounded"
                          >
                            Wobbly
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Host or Player Controls */}
        {isHost ? (
          <div className="bg-white shadow rounded-xl p-6 flex flex-col gap-4">
            <button
              onClick={startGame}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
            >
              Start Game
            </button>
            <button
              onClick={nextRound}
              className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600"
            >
              Next Round
            </button>
            <button
              onClick={clearBuzzers}
              className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700"
            >
              Clear Buzzers
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={buzz}
              disabled={room.locked}
              className={`px-10 py-10 rounded-full text-3xl font-bold shadow-lg transition ${
                room.locked
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white animate-pulse"
              }`}
            >
              BUZZ!
            </button>
          </div>
        )}

        {/* Buzz Queue */}
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-2">Buzz Queue</h2>
          <ol className="list-decimal pl-6">
            {room.buzzQueue.map((id) => {
              const p = room.players.find((x) => x.id === id);
              return <li key={id}>{p ? p.name : id}</li>;
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
