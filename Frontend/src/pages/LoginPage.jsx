// src/pages/LoginPage.jsx
import React from "react";
import GoogleLoginButton from "../components/Auth/GoogleLoginButton";

const LoginPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4">
      <h1 className="text-4xl font-bold mb-8">Welcome to UNO Online</h1>
      <GoogleLoginButton />
      <p className="mt-6 text-sm opacity-80">
        Sign in with Google to start playing and join rooms with friends.
      </p>
    </div>
  );
};

export default LoginPage;
