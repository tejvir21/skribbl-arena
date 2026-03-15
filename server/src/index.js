require("dotenv").config();
const http = require("http");
const app = require("./app");
const { initSocket } = require("./socket");
const connectDB = require("./utils/db");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Skribbl Arena server running on port ${PORT}`);
    console.log(`🔌 WebSocket server ready`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  });
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  server.close(() => process.exit(1));
});
