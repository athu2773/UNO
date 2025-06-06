// src/pages/DashboardPage.jsx
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Lobby from "../components/Lobby";
import Friends from "../components/Friends";
import History from "../components/History";

const DashboardPage = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold">Hello, {user?.name}</h2>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <section className="col-span-2">
          <Lobby />
        </section>

        <aside className="space-y-8">
          <Friends />
          <History />
        </aside>
      </main>
    </div>
  );
};

export default DashboardPage;
