// simple-jwt-test.js - Test JWT functionality in isolation
require('dotenv').config();
const request = require('supertest');

// Mock express app for testing
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Simple auth routes for testing
app.post('/test-register', (req, res) => {
  const { username, email } = req.body;
  const token = jwt.sign(
    { id: '12345', email, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: '12345', email, username } });
});

app.post('/test-room', (req, res) => {
  const roomToken = jwt.sign(
    { roomId: 'room123', code: 'ABC123', host: '12345' },
    process.env.ROOM_JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({ roomToken, _id: 'room123' });
});

// Middleware for room auth
const isRoomAuthenticated = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing" });
    }
    const token = authHeader.split(" ")[1];
    console.log('Middleware received token:', token);
    
    const decoded = jwt.verify(token, process.env.ROOM_JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    
    req.room = {
      roomId: decoded.roomId,
      code: decoded.code,
      host: decoded.host,
    };
    next();
  } catch (err) {
    console.error("Room Auth middleware error:", err);
    return res.status(401).json({ message: "Invalid or expired room token" });
  }
};

app.get('/test-room-protected/:id', isRoomAuthenticated, (req, res) => {
  res.json({ 
    room: req.room,
    message: 'Room access granted' 
  });
});

// Run tests
const runTests = async () => {
  console.log('Starting simple JWT tests...');
  console.log('JWT_SECRET:', process.env.JWT_SECRET);
  console.log('ROOM_JWT_SECRET:', process.env.ROOM_JWT_SECRET);
  
  try {
    // Test 1: Register and get user token
    console.log('\n=== Test 1: User Registration ===');
    const registerRes = await request(app)
      .post('/test-register')
      .send({ username: 'testuser', email: 'test@example.com' });
    
    console.log('Register status:', registerRes.status);
    console.log('Register body:', registerRes.body);
    
    // Test 2: Create room token
    console.log('\n=== Test 2: Room Token Creation ===');
    const roomRes = await request(app)
      .post('/test-room')
      .send({});
    
    console.log('Room status:', roomRes.status);
    console.log('Room body:', roomRes.body);
    
    const roomToken = roomRes.body.roomToken;
    
    // Test 3: Use room token
    console.log('\n=== Test 3: Room Token Verification ===');
    const protectedRes = await request(app)
      .get('/test-room-protected/room123')
      .set('Authorization', `Bearer ${roomToken}`);
    
    console.log('Protected status:', protectedRes.status);
    console.log('Protected body:', protectedRes.body);
    
    console.log('\n=== All tests completed ===');
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

runTests();
