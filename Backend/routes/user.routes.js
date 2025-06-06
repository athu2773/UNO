// routes/user.routes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");

router.get("/me", isAuthenticated, userController.getProfile);
router.get("/me/history", isAuthenticated, userController.getGameHistory);
router.post("/friends", isAuthenticated, userController.addFriend);
router.get("/friends", isAuthenticated, userController.getFriends);

module.exports = router;
