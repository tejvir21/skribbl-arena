import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore, useGameStore, useChatStore, useNotifStore } from "../store";
import { initSocket, disconnectSocket, emit } from "../socket";
import { useIsDrawer, useIsHost } from "../hooks/useGame";
import DrawingCanvas from "../components/canvas/DrawingCanvas";
import ChatPanel from "../components/chat/ChatPanel";
import PlayerList from "../components/game/PlayerList";
import GameHeader from "../components/game/GameHeader";
import WordChoiceOverlay from "../components/game/WordChoiceOverlay";
import RoundEndOverlay from "../components/game/RoundEndOverlay";
import GameEndOverlay from "../components/game/GameEndOverlay";
import WaitingRoom from "../components/game/WaitingRoom";
import ChoosingWordBanner from "../components/game/ChoosingWordBanner";
import SpectatorBanner from "../components/game/SpectatorBanner";
import Confetti from "../components/ui/Confetti";
import ScorePop from "../components/ui/ScorePop";

export default function GamePage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    phase, players, settings, myPlayerId, isSpectator, currentDrawerId,
    wordChoices, choosingWord, roundResults, gameResults,
    setRoom, leaveRoom, resetGame,
  } = useGameStore();
  const { clearMessages } = useChatStore();
  const { addNotif } = useNotifStore();

  const amDrawer = useIsDrawer();
  const isHost   = useIsHost();

  const [connecting, setConnecting] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasJoined = useRef(false);

  // Persist room code in sessionStorage so page reload can rejoin
  useEffect(() => {
    if (roomCode) {
      sessionStorage.setItem("arena_room", roomCode);
    }
    return () => {
      // Only clear if truly navigating away (not a reload)
      // sessionStorage persists through reload, so don't clear on unmount
    };
  }, [roomCode]);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    // Prevent double-join in React StrictMode (double effect invoke)
    if (hasJoined.current) return;
    hasJoined.current = true;

    const socket = initSocket();
    clearMessages();

    const doJoin = () => {
      socket.emit("room:join", {
        roomCode,
        username: user.username,
        avatar: user.avatar || "",
      }, (response) => {
        setConnecting(false);
        if (response?.error) {
          addNotif({ type: "error", message: response.error });
          sessionStorage.removeItem("arena_room");
          navigate("/");
          return;
        }
        if (response?.success) {
          setRoom({ ...response.room, playerId: response.playerId });
          if (response.isReconnect) {
            addNotif({ type: "success", message: "Reconnected to game!" });
          }
        }
      });
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.once("connect", doJoin);
    }

    return () => {
      emit("room:leave");
      leaveRoom();
      clearMessages();
      disconnectSocket();
      sessionStorage.removeItem("arena_room");
      hasJoined.current = false;
    };
  }, []);

  useEffect(() => {
    if (gameResults?.winner?.userId === myPlayerId) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [gameResults, myPlayerId]);

  const handleStartGame  = () => emit("game:start");
  const handleChooseWord = (word) => {
    emit("game:wordChosen", { word });
    useGameStore.getState().clearWordChoices();
  };

  // ── Connecting / loading screen ──────────────────────────────────────
  if (connecting) {
    return (
      <div className="min-h-screen bg-arena-gradient flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-arena-purple/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-arena-purple border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <div className="absolute inset-3 border-4 border-t-arena-cyan border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "0.7s" }} />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🎨</div>
          </div>
          <p className="font-display text-2xl text-gradient mb-1">Joining Room</p>
          <p className="text-muted-foreground font-mono tracking-widest">{roomCode}</p>
        </div>
      </div>
    );
  }

  const inGame = phase === "drawing" || phase === "roundEnd" || (phase === "starting" && !!currentDrawerId);

  return (
    <div className="min-h-screen bg-arena-gradient flex flex-col">
      {showConfetti && <Confetti />}
      <ScorePop />

      <GameHeader
        roomCode={roomCode}
        onLeave={() => { emit("room:leave"); leaveRoom(); sessionStorage.removeItem("arena_room"); navigate("/"); }}
      />

      {isSpectator && <SpectatorBanner />}

      <div className="flex-1 flex flex-col lg:flex-row gap-3 max-w-[1700px] w-full mx-auto px-3 pb-3 mt-3 min-h-0">
        <aside className="lg:w-56 xl:w-64 flex-shrink-0">
          <PlayerList />
        </aside>

        <main className="flex-1 min-w-0">
          {!inGame ? (
            <WaitingRoom
              roomCode={roomCode}
              isHost={isHost}
              onStart={handleStartGame}
              settings={settings}
              players={players}
            />
          ) : phase === "starting" && !!currentDrawerId ? (
            // Someone is choosing a word — show the waiting banner
            <ChoosingWordBanner />
          ) : (
            // Drawing in progress or round just ended — show canvas
            <DrawingCanvas canDraw={amDrawer && !isSpectator} />
          )}
        </main>

        <aside className="lg:w-72 xl:w-80 flex-shrink-0">
          <ChatPanel isDrawer={amDrawer} isSpectator={isSpectator} />
        </aside>
      </div>

      {choosingWord && wordChoices.length > 0 && (
        <WordChoiceOverlay words={wordChoices} onChoose={handleChooseWord} />
      )}
      {roundResults && phase === "roundEnd" && (
        <RoundEndOverlay data={roundResults} />
      )}
      {gameResults && phase === "gameEnd" && (
        <GameEndOverlay
          data={gameResults}
          myPlayerId={myPlayerId}
          onPlayAgain={() => { resetGame(); navigate("/"); }}
        />
      )}
    </div>
  );
}
