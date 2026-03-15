import { useGameStore } from "../store";

/**
 * Reactive selectors for game state.
 * All return values update when the relevant store slice changes.
 */

export const useIsDrawer = () => {
  const currentDrawerId = useGameStore((s) => s.currentDrawerId);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  return currentDrawerId === myPlayerId;
};

export const useIsHost = () => {
  const hostId = useGameStore((s) => s.hostId);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  return hostId === myPlayerId;
};

export const useMyPlayer = () => {
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  return players.find((p) => p.userId === myPlayerId) || null;
};

export const useOnlinePlayers = () => {
  const players = useGameStore((s) => s.players);
  return players.filter((p) => p.isOnline);
};

export const useSortedPlayers = () => {
  const players = useGameStore((s) => s.players);
  return [...players].sort((a, b) => b.score - a.score);
};

export const useTimerColor = () => {
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  if (timeRemaining <= 10) return "#FF4444";
  if (timeRemaining <= 20) return "#F59E0B";
  return "#06B6D4";
};

export const useTimerClass = () => {
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  if (timeRemaining <= 10) return "timer-critical";
  if (timeRemaining <= 20) return "timer-warning";
  return "timer-normal";
};
