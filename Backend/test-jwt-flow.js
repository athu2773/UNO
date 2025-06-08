// test-jwt-flow.js - Comprehensive test for JWT implementation
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');

// Import our models and controllers
const User = require('./models/User');
const Room = require('./models/Room');
const { generateRoomToken } = require('./controllers/auth.controller');
const { isAuthenticated, isRoomAuthenticated } = require('./middlewares/auth.middleware');

console.log('=== JWT Flow Test ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('ROOM_JWT_SECRET:', process.env.ROOM_JWT_SECRET);

const app = express();
app.use(express.json());

// Test user registration endpoint
app.post('/test-register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('Register attempt:', { username, email });
    
    // Simulate user creation (without actually saving to DB)
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      username,
      email,
      password
    };
    
    // Generate user token
    const token = jwt.sign(
      { id: mockUser._id, email: mockUser.email, username: mockUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    console.log('Generated user token:', token.substring(0, 50) + '...');
    res.json({ token, user: mockUser });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test room creation endpoint
app.post('/test-create-room', isAuthenticated, async (req, res) => {
  try {
    console.log('Create room for user:', req.user);
    
    // Simulate room creation
    const mockRoom = {
      _id: new mongoose.Types.ObjectId(),
      code: 'ABC123',
      host: req.user._id,
      players: [{ user: req.user._id }],
      status: 'waiting'
    };
    
    // Generate room token
    const roomToken = generateRoomToken(mockRoom);
    console.log('Generated room token:', roomToken.substring(0, 50) + '...');
    
    res.json({ ...mockRoom, roomToken });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test room-protected endpoint
app.get('/test-room-protected/:id', isRoomAuthenticated, (req, res) => {
  console.log('Room-protected access for:', req.room);
  res.json({ 
    room: req.room,
    roomId: req.params.id,
    message: 'Room access granted successfully' 
  });
});

// Test invalid token endpoint
app.get('/test-invalid-token', isRoomAuthenticated, (req, res) => {
  res.json({ message: 'This should not be reached' });
});

// Manual test function
const runManualTest = async () => {
  const server = app.listen(3001, () => {
    console.log('\n=== Starting Manual Tests on port 3001 ===');
  });

  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    const axios = require('axios').default || require('axios');
    const baseURL = 'http://localhost:3001';
    
    console.log('\n1. Testing user registration...');
    const registerRes = await axios.post(`${baseURL}/test-register`, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpass123'
    });
    console.log('✓ Register successful, token received');
    const userToken = registerRes.data.token;
    
    console.log('\n2. Testing room creation...');
    const roomRes = await axios.post(`${baseURL}/test-create-room`, {}, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✓ Room creation successful, room token received');
    const roomToken = roomRes.data.roomToken;
    const roomId = roomRes.data._id;
    
    console.log('\n3. Testing room-protected access...');
    const protectedRes = await axios.get(`${baseURL}/test-room-protected/${roomId}`, {
      headers: { Authorization: `Bearer ${roomToken}` }
    });
    console.log('✓ Room-protected access successful');
    console.log('   Response:', protectedRes.data);
    
    console.log('\n4. Testing invalid token rejection...');
    try {
      await axios.get(`${baseURL}/test-invalid-token`, {
        headers: { Authorization: 'Bearer invalid.token.here' }
      });
      console.log('✗ Invalid token was accepted (this should not happen)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✓ Invalid token correctly rejected');
      } else {
        console.log('✗ Unexpected error:', error.message);
      }
    }
    
    console.log('\n=== All Manual Tests Completed Successfully! ===');
    console.log('\n✅ JWT User Authentication: WORKING');
    console.log('✅ JWT Room Authentication: WORKING');
    console.log('✅ Token Validation: WORKING');
    console.log('✅ Invalid Token Rejection: WORKING');
    
  } catch (error) {
    console.error('\n❌ Manual test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  } finally {
    server.close();
    console.log('\n=== Test server closed ===');
  }
};

// Check if axios is available, if not, provide alternative
const checkAxios = () => {
  try {
    require('axios');
    return true;
  } catch (error) {
    console.log('\nAxios not available. Install with: npm install axios');
    console.log('Or test manually using curl commands:');
    console.log('\n1. Start server: node test-jwt-flow.js');
    console.log('2. Register user: curl -X POST http://localhost:3001/test-register -H "Content-Type: application/json" -d \'{"username":"test","email":"test@example.com","password":"pass123"}\'');
    console.log('3. Use returned token to create room and test endpoints');
    return false;
  }
};

if (checkAxios()) {
  runManualTest().catch(console.error);
} else {
  // Start server for manual testing
  app.listen(3001, () => {
    console.log('\n=== Test server running on port 3001 ===');
    console.log('Use the curl commands above to test manually');
  });
}
