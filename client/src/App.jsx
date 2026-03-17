import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./store";
import { authAPI } from "./api";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import Notifications from "./components/ui/Notifications";

// Redirect to last room if sessionStorage has one (handles page reload mid-game)
function RoomRedirect() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    const lastRoom = sessionStorage.getItem("arena_room");
    if (lastRoom && user) {
      navigate(`/game/${lastRoom}`, { replace: true });
    }
  }, [user]);

  return null;
}

function App() {
  const { token, setAuth, clearAuth, user } = useAuthStore();

  // Validate stored token on mount
  useEffect(() => {
    if (token) {
      authAPI
        .me()
        .then(({ user }) => setAuth(user, token))
        .catch(() => clearAuth());
    }

    // Check server health on app load
    healthAPI.check().catch(() => console.warn("Server health check failed"));
  }, []);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <RoomRedirect />
              <HomePage />
            </>
          }
        />
        <Route path="/game/:roomCode" element={<GamePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Notifications />
    </>
  );
}

export default App;
