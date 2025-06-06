// src/components/Lobby.jsx
import React, { useEffect, useState } from "react";
import api from "../api/api";

const Lobby = ({ onJoinRoom }) => {
  const [rooms, setRooms] = useState([]);

  const fetchRooms = async () => {
    try {
      const res = await api.get("/game/list");
      setRooms(res.data.rooms);
    } catch (err) {
      console.error("Failed to load rooms", err);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleJoin = (code) => {
    onJoinRoom(code);
  };

  return (
    <div className="p-4 bg-white shadow rounded-xl">
      <h2 className="text-xl font-bold mb-4">🎮 Join an Available Room</h2>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <div key={room.code} className="flex justify-between items-center border p-3 rounded-lg">
              <div>
                <p className="font-semibold">Room Code: {room.code}</p>
                <p className="text-sm text-gray-600">Players: {room.players.length}/4</p>
              </div>
              <button
                onClick={() => handleJoin(room.code)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Join
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No available rooms. Create one!</p>
        )}
      </div>
    </div>
  );
};

export default Lobby;
