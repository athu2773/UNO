const express = require("express");
const router = express.Router();
const gameController = require("../controllers/game.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");

router.post("/create", isAuthenticated, gameController.createRoom);
router.post("/join", isAuthenticated, gameController.joinRoom);
router.get("/list", isAuthenticated, gameController.listRooms);

module.exports = router;
