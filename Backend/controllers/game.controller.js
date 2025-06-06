console.log("[game.controller.js] File loaded");
const Room = require("../models/Room");
console.log("[game.controller.js] Room model imported");
const User = require("../models/User");
const { generateDeck, shuffle } = require("../utils/unoLogic");
const { nanoid } = require("nanoid/non-secure");
const mongoose = require("mongoose");
const { generateRoomToken } = require("./auth.controller");

const MAX_PLAYERS = 4;
const HAND_SIZE = 7;

// Create a new game room
const createRoom = async (req, res) => {
  try {
    const userId = req.user._id;

    // Generate unique room code
    const code = nanoid(6).toUpperCase();

    // Generate and shuffle deck
    const deck = generateDeck();

    // Deal 7 cards to the host
    const hand = deck.splice(0, HAND_SIZE);

    // Initialize room with host player
    const room = new Room({
      code,
      host: userId,
      players: [{ user: userId, hand, saidUno: false }],
      deck,
      discardPile: [],
      currentTurn: 0,
      direction: "clockwise",
      drawStack: 0,
      currentColor: null,
      status: "waiting",
    });

    await room.save();
    // Generate a room-specific JWT
    const roomToken = generateRoomToken(room);
    // Return all fields at the top level for test compatibility
    const roomObj = room.toObject();
    res
      .status(201)
      .json({ ...roomObj, code: room.code, _id: room._id, host: room.host, roomToken });
  } catch (err) {
    console.error("Create room error:", err);
    res.status(500).json({ message: "Server error creating room" });
  }
};

// Join an existing room by code
const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({ message: "Room code is required" });
    }

    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.status !== "waiting") {
      return res
        .status(400)
        .json({ message: "Game already started or finished" });
    }

    if (room.players.length >= MAX_PLAYERS) {
      return res.status(400).json({ message: "Room is full" });
    }

    // Check if user already joined
    const alreadyJoined = room.players.some((p) => p.user.equals(userId));
    if (alreadyJoined) {
      return res.status(400).json({ message: "You already joined this room" });
    }

    // Deal 7 cards to the joining player
    if (room.deck.length < HAND_SIZE) {
      return res
        .status(400)
        .json({ message: "Not enough cards in deck to join" });
    }

    const hand = room.deck.splice(0, HAND_SIZE);

    room.players.push({ user: userId, hand, saidUno: false });
    await room.save();

    res.status(200).json({ room });
  } catch (err) {
    console.error("Join room error:", err);
    res.status(500).json({ message: "Server error joining room" });
  }
};

// Get list of rooms with status "waiting" (for lobby)
const listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: "waiting" }).select(
      "code players status createdAt"
    );
    res.json({ rooms });
  } catch (err) {
    console.error("List rooms error:", err);
    res.status(500).json({ message: "Server error listing rooms" });
  }
};

// Get room details by ID
const getRoomDetails = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    // Return all fields at the top level for test compatibility
    const roomObj = room.toObject();
    res
      .status(200)
      .json({ ...roomObj, code: room.code, _id: room._id, host: room.host });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching room details" });
  }
};

// List rooms for the current user
const listUserRooms = async (req, res) => {
  try {
    console.log("listUserRooms: called");
    console.log("listUserRooms: req.user=", req.user);
    console.log("listUserRooms: req.headers=", req.headers);
    if (!req.user || !req.user._id) {
      console.error(
        "listUserRooms: req.user or req.user._id is missing",
        req.user
      );
      return res.status(400).json({ message: "User not authenticated" });
    }
    let userObjectId;
    try {
      userObjectId = mongoose.Types.ObjectId(req.user._id);
    } catch (e) {
      console.error("Invalid user ObjectId:", req.user._id, e);
      return res.status(400).json({ message: "Invalid user ID" });
    }
    console.log("listUserRooms: userId=", userObjectId);
    const rooms = await Room.find({ host: userObjectId });
    console.log("listUserRooms: rooms=", rooms);
    // Return array at the top level for test compatibility
    res.json(Array.isArray(rooms) ? rooms : []);
  } catch (err) {
    console.error("List user rooms error:", err);
    res
      .status(500)
      .json({
        message: "Server error listing user rooms",
        error: err.message,
        stack: err.stack,
      });
  }
};

module.exports = {
  createRoom,
  joinRoom,
  listRooms,
  getRoomDetails,
  listUserRooms,
};
