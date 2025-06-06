// src/components/Friends.jsx
import React, { useEffect, useState } from "react";
import api from "../api/api";

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [friendId, setFriendId] = useState("");

  const fetchFriends = async () => {
    try {
      const res = await api.get("/user/friends");
      setFriends(res.data.friends);
    } catch (err) {
      console.error("Error fetching friends", err);
    }
  };

  const handleAddFriend = async () => {
    try {
      await api.post("/user/friends", { friendId });
      setFriendId("");
      fetchFriends();
    } catch (err) {
      alert("Failed to add friend",err);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  return (
    <div className="p-4 bg-white shadow rounded-xl">
      <h2 className="text-xl font-bold mb-4">👥 Your Friends</h2>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={friendId}
          onChange={(e) => setFriendId(e.target.value)}
          placeholder="Enter Friend ID"
          className="p-2 border rounded w-full"
        />
        <button
          onClick={handleAddFriend}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Add
        </button>
      </div>
      <ul className="list-disc list-inside text-gray-800">
        {friends.length ? (
          friends.map((f, idx) => <li key={idx}>{f.username || f.email}</li>)
        ) : (
          <li className="text-gray-500">No friends added.</li>
        )}
      </ul>
    </div>
  );
};

export default Friends;
