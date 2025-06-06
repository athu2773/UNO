// src/components/Auth/GoogleLoginButton.jsx
import React from "react";
import { FcGoogle } from "react-icons/fc";
import { googleLogin } from "../../api/api";

const GoogleLoginButton = () => {
  const handleLogin = () => {
    googleLogin(); // Redirects to Google OAuth via backend
  };

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg shadow hover:bg-gray-100 transition-all duration-200"
    >
      <FcGoogle className="text-xl" />
      <span>Continue with Google</span>
    </button>
  );
};

export default GoogleLoginButton;
