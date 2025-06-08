const express = require("express");
const router = express.Router();
const gameController = require("../controllers/game.controller");
const {
  isAuthenticated,
  isRoomAuthenticated,
} = require("../middlewares/auth.middleware");

router.post("/create", isAuthenticated, gameController.createRoom);
router.post("/join", isAuthenticated, gameController.joinRoom);
router.get("/list", isAuthenticated, gameController.listRooms);
router.get("/my", isAuthenticated, gameController.listUserRooms);

router.post("/create-room", isAuthenticated, gameController.createRoom); // Test compatibility alias
router.get("/rooms", isAuthenticated, gameController.listUserRooms); // Test compatibility alias
console.log("[game.routes.js] Registering /rooms route");

router.get("/room-protected/:id", isRoomAuthenticated, (req, res) => {
  res.json({ message: "Room JWT valid", room: req.room });
});

router.get("/:id", isAuthenticated, gameController.getRoomDetails);
router.get("/room/:id", isAuthenticated, gameController.getRoomDetails);

module.exports = router;
