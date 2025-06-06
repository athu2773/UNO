// axios-jwt-test.js - Simple axios-based JWT test
require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test configuration
const testUser = {
  username: 'axiostest',
  email: 'axiostest@example.com',
  password: 'testpass123'
};

// Helper to make requests
const makeRequest = async (method, url, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {}
    };
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
    
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status || 0, 
      data: error.response?.data || { message: error.message }
    };
  }
};

const testJWTFlow = async () => {
  console.log('🚀 Testing JWT Implementation...\n');
  
  // Step 1: Register/Login
  console.log('Step 1: User Authentication');
  let userToken = null;
  
  const registerResult = await makeRequest('POST', '/api/auth/register', testUser);
  if (registerResult.success) {
    console.log('✅ Registration successful');
    userToken = registerResult.data.token;
  } else {
    const loginResult = await makeRequest('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    if (loginResult.success) {
      console.log('✅ Login successful');
      userToken = loginResult.data.token;
    } else {
      console.log('❌ Authentication failed');
      return;
    }
  }
  
  console.log('🔑 User Token:', userToken ? 'Received' : 'Missing');
  
  // Step 2: Create Room
  console.log('\nStep 2: Room Creation');
  const roomResult = await makeRequest('POST', '/api/game/create-room', {}, userToken);
  
  if (roomResult.success) {
    console.log('✅ Room created successfully');
    console.log('🏠 Room ID:', roomResult.data._id);
    console.log('🔑 Room Token:', roomResult.data.roomToken ? 'Received' : 'Missing');
    
    const roomToken = roomResult.data.roomToken;
    const roomId = roomResult.data._id;
    
    // Step 3: Test Room Access
    console.log('\nStep 3: Room-Protected Access');
    const accessResult = await makeRequest('GET', `/api/game/room-protected/${roomId}`, null, roomToken);
    
    if (accessResult.success) {
      console.log('✅ Room access successful');
      console.log('📋 Response:', accessResult.data);
    } else {
      console.log('❌ Room access failed:', accessResult.data);
    }
    
    // Step 4: Test Invalid Token
    console.log('\nStep 4: Invalid Token Test');
    const invalidResult = await makeRequest('GET', `/api/game/room-protected/${roomId}`, null, 'invalid.token');
    
    if (!invalidResult.success && invalidResult.status === 401) {
      console.log('✅ Invalid token correctly rejected');
    } else {
      console.log('❌ Invalid token should have been rejected');
    }
    
  } else {
    console.log('❌ Room creation failed:', roomResult.data);
  }
  
  console.log('\n🎉 JWT Test Completed!');
};

// Check server connectivity first
const checkServer = async () => {
  try {
    await makeRequest('GET', '/api/auth/login');
    return true;
  } catch (error) {
    console.log('❌ Server not accessible. Please start the server first.');
    console.log('   Run: npm start');
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🔧 Environment Variables:');
  console.log('   JWT_SECRET:', process.env.JWT_SECRET || 'Not set');
  console.log('   ROOM_JWT_SECRET:', process.env.ROOM_JWT_SECRET || 'Not set');
  console.log('   Server URL:', BASE_URL);
  console.log();
  
  if (await checkServer()) {
    await testJWTFlow();
  }
};

main().catch(console.error);
