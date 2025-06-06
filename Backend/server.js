// server.js
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const passport = require("passport");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { setupGameSockets } = require("./sockets/gameSocket");
const { setupChatSockets } = require("./sockets/chatSocket");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
require("./config/passport")(passport);

// API routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/game", require("./routes/game.routes"));
app.use("/api/chat", require("./routes/chat.routes"));

// Socket.io event handlers
setupGameSockets(io);
setupChatSockets(io);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
