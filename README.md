# 🎨 Skribbl Arena

> A real-time multiplayer drawing and guessing game — Skribbl on steroids.

![Tech Stack](https://img.shields.io/badge/Stack-MERN-7C3AED?style=flat-square)
![WebSockets](https://img.shields.io/badge/WebSockets-Socket.io-06B6D4?style=flat-square)
![Docker](https://img.shields.io/badge/Deploy-Docker-0099FF?style=flat-square)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎨 **Real-time Canvas** | Synchronized pixel-perfect drawing with pen, eraser, fill, shapes & undo |
| 💬 **Live Chat + Guessing** | Real-time chat with emoji picker, guess detection, close-guess alerts |
| 🏆 **Ranked Leaderboard** | 5-tier rank system (Novice → Legend), paginated global board with podium |
| 🏠 **Room System** | Public/private rooms, room browser, quick-join, invite by code |
| ⚙️ **Rich Settings** | Rounds, draw time, player cap, word category, custom word lists |
| 💡 **Smart Hints** | Progressive letter reveals at 50% and 75% of round time |
| 👁️ **Spectator Mode** | Late-joiners watch without disrupting ongoing games |
| 😄 **Emoji Reactions** | Quick-fire emoji bar + full emoji picker |
| 👑 **Host Controls** | Settings locked to host, auto host-transfer on disconnect |
| 🎉 **Confetti** | Winner celebration with particle animation |
| 🔐 **Auth** | Register/Login/Guest with JWT, persistent sessions via Zustand |
| 📱 **Responsive** | Mobile-first layout, touch canvas support |

---

## 🏗️ Architecture

```
skribbl-arena/
├── server/                     # Express + Socket.io backend
│   └── src/
│       ├── index.js            # Entry + HTTP server
│       ├── app.js              # Express middleware, routes
│       ├── models/
│       │   ├── User.js         # Auth, stats, rank calculation
│       │   └── Room.js         # Game state, players, chat log
│       ├── routes/
│       │   ├── auth.js         # Register, login, guest, /me
│       │   ├── room.js         # List, create, get rooms
│       │   ├── leaderboard.js  # Global + personal rank
│       │   └── user.js         # Profile update
│       ├── socket/
│       │   └── index.js        # ← THE GAME ENGINE (all WS logic)
│       ├── middleware/
│       │   └── auth.js         # JWT middleware
│       └── utils/
│           ├── db.js           # MongoDB connection
│           └── words.js        # Word bank, hints, guess checking
│
└── client/                     # Vite + React frontend
    └── src/
        ├── App.jsx             # Router
        ├── store.js            # Zustand stores (auth, game, chat, notifs)
        ├── socket.js           # Socket.io client + all event bindings
        ├── api.js              # Axios client
        ├── pages/
        │   ├── HomePage.jsx    # Lobby, room browser, auth
        │   ├── GamePage.jsx    # Main game layout orchestrator
        │   └── LeaderboardPage.jsx
        └── components/
            ├── canvas/
            │   └── DrawingCanvas.jsx   # Canvas tools, flood fill, sync
            ├── chat/
            │   └── ChatPanel.jsx       # Chat, emoji picker, guess UI
            ├── game/
            │   ├── GameHeader.jsx      # Timer ring, round info
            │   ├── PlayerList.jsx      # Live scores, drawer indicator
            │   ├── WaitingRoom.jsx     # Pre-game lobby + settings
            │   ├── WordChoiceOverlay.jsx
            │   ├── RoundEndOverlay.jsx
            │   ├── GameEndOverlay.jsx  # Podium + confetti
            │   └── SpectatorBanner.jsx
            ├── lobby/
            │   ├── AuthModal.jsx
            │   └── CreateRoomModal.jsx
            └── ui/
                ├── Confetti.jsx
                └── Notifications.jsx
```

---

## 🚀 Quick Start

### Option A — Docker (one command)

```bash
git clone <repo>
cd skribbl-arena
cp server/.env.example server/.env   # Edit JWT_SECRET
docker-compose up --build
```

- Frontend → http://localhost:3000
- Backend  → http://localhost:5000
- MongoDB  → localhost:27017

---

### Option B — Local Development

**Prerequisites:** Node 18+, MongoDB running locally

```bash
# 1. Clone & install
git clone <repo>
cd skribbl-arena
npm run install:all        # installs both server + client deps

# 2. Configure server
cp server/.env.example server/.env
# Edit server/.env:
#   MONGODB_URI=mongodb://localhost:27017/skribbl-arena
#   JWT_SECRET=your_secret_here

# 3. Configure client
cp client/.env.example client/.env

# 4. Run both (in one terminal)
npm run dev
```

Runs:
- Client → http://localhost:3000
- Server → http://localhost:5000

---

## 🌐 Cloud Deployment (Env Vars)

### Server (Railway / Render / Fly.io)
```
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/skribbl-arena
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### Client (Vercel / Netlify)
```
VITE_API_URL=https://your-backend.railway.app/api
VITE_SERVER_URL=https://your-backend.railway.app
```

---

## 🎮 Game Flow

```
Players Join Room
       │
       ▼
   Waiting Room (Host configures settings)
       │
       Host clicks "Start Game"
       │
       ▼
  ┌─ Round Loop ─────────────────────────────────────┐
  │                                                   │
  │  1. New Round — pick next drawer (rotation)       │
  │  2. Drawer gets 3 word choices (15s to pick)      │
  │  3. Drawing phase starts (timer counts down)      │
  │     • Drawer sees actual word                     │
  │     • Guessers see blanks                         │
  │     • Hints reveal at 50% and 75% time           │
  │  4. Correct guesses → score based on time+order  │
  │     • All guessed OR timer expires → round ends  │
  │  5. Round end overlay (5s), word revealed         │
  │                                                   │
  └───────────── Repeat for N rounds ────────────────┘
       │
       ▼
  Game End → Final scoreboard → DB stats updated
```

---

## ⚡ Scoring System

| Event | Points |
|---|---|
| First correct guess | ~500 pts |
| Later correct guesses | Decreasing (time ratio) |
| Drawer per correct guess | 30% of guesser's points |
| Position bonus | 50 pts × (remaining guessers) |

Formula: `floor(200 + timeRatio × 300 + positionBonus)`

---

## 🎖️ Rank Tiers

| Rank | Score Required |
|---|---|
| 🩶 Novice | 0+ |
| 💙 Skilled | 500+ |
| 💜 Expert | 2,000+ |
| 💗 Master | 5,000+ |
| 💛 Legend | 10,000+ |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Zustand |
| UI Components | Radix UI primitives, shadcn patterns |
| Emoji Picker | emoji-picker-react |
| Real-time | Socket.io (WebSocket + polling fallback) |
| Backend | Express.js, Node.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Deployment | Docker + Docker Compose, nginx |

---

## 🔌 WebSocket Events Reference

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `room:join` | `{ roomCode, username }` | Join/create a room |
| `room:leave` | — | Leave current room |
| `room:updateSettings` | `{ settings }` | Host updates settings |
| `game:start` | — | Host starts game |
| `game:wordChosen` | `{ word }` | Drawer picks word |
| `canvas:draw` | `{ type, x, y, color, size }` | Draw event |
| `canvas:clear` | — | Clear canvas |
| `canvas:fill` | `{ x, y, color }` | Flood fill |
| `chat:message` | `{ message }` | Send chat / guess |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `room:playerJoined` | `{ player, players }` | New player joined |
| `room:playerLeft` | `{ userId, players }` | Player disconnected |
| `room:hostChanged` | `{ newHostId }` | Host transferred |
| `game:starting` | `{ countdown }` | Game countdown |
| `game:newRound` | `{ round, drawer, ... }` | Round begins |
| `game:chooseWord` | `{ words }` | Drawer's word choices |
| `game:roundStarted` | `{ word, drawTime, ... }` | Drawing phase starts |
| `game:timer` | `{ remaining }` | Tick every second |
| `game:hint` | `{ hint }` | Letter hint revealed |
| `game:correctGuess` | `{ username, points }` | Player guessed |
| `game:roundEnd` | `{ word, players }` | Round over |
| `game:end` | `{ players, winner }` | Game over |
| `chat:message` | `{ type, message, ... }` | Chat / system message |

---

## 📝 License

MIT — free to use, modify, and deploy.
