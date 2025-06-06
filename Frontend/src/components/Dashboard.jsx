// src/components/Dashboard.jsx
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-2xl p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome, {user?.name || "Player"} 🎉</h1>
        <p className="text-gray-600 mb-6">Get started by joining or creating a game room!</p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/game/create")}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition"
          >
            Create Room
          </button>
          <button
            onClick={() => navigate("/game/join")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition"
          >
            Join Room
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigate("/friends")}
            className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-3 rounded-lg font-medium"
          >
            👥 Friends
          </button>
          <button
            onClick={() => navigate("/history")}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium"
          >
            📊 Match History
          </button>
        </div>

        <button
          onClick={logout}
          className="text-red-600 hover:underline mt-4"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
