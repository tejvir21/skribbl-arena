import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./store";
import { authAPI } from "./api";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import Notifications from "./components/ui/Notifications";

function App() {
  const { token, setAuth, clearAuth } = useAuthStore();

  // Validate stored token on mount
  useEffect(() => {
    if (token) {
      authAPI.me()
        .then(({ user }) => setAuth(user, token))
        .catch(() => clearAuth());
    }
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/:roomCode" element={<GamePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Notifications />
    </>
  );
}

export default App;
