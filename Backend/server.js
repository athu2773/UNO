// server.js
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const passport = require("passport");
const cors = require("cors");

const connectDB = require("./config/db");
const { setupGameSockets } = require("./sockets/gameSocket");
const { setupChatSockets } = require("./sockets/chatSocket");
const { setupNotificationSockets } = require("./sockets/notificationSocket");
const { setupTournamentSockets } = require("./sockets/tournamentSocket");

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
app.use("/api/stats", require("./routes/stats.routes"));
app.use("/api/friends", require("./routes/friends.routes"));
app.use("/api/tournaments", require("./routes/tournaments.routes"));
app.use("/api/notifications", require("./routes/notifications.routes").router);

// Socket.io event handlers
setupGameSockets(io);
setupChatSockets(io);
setupTournamentSockets(io);
setupNotificationSockets(io);

const PORT = process.env.PORT || 8080;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
