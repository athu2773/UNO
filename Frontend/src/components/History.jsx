// src/components/History.jsx
import React, { useEffect, useState } from "react";
import api from "../api/api";

const History = () => {
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/user/me/history");
      setHistory(res.data.history);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="p-4 bg-white shadow rounded-xl">
      <h2 className="text-xl font-bold mb-4">🏆 Game History</h2>
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Date</th>
            <th className="p-2">Result</th>
            <th className="p-2">Room</th>
          </tr>
        </thead>
        <tbody>
          {history.length ? (
            history.map((entry, index) => (
              <tr key={index} className="border-t">
                <td className="p-2">{new Date(entry.date).toLocaleString()}</td>
                <td className={`p-2 font-semibold ${entry.result === "win" ? "text-green-600" : "text-red-600"}`}>
                  {entry.result.toUpperCase()}
                </td>
                <td className="p-2">{entry.roomCode}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="p-4 text-center text-gray-500">No game history found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default History;
