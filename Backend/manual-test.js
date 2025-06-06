// manual-test.js - Manual test without dependencies that might be causing issues
require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('=== Manual JWT Test ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('ROOM_JWT_SECRET:', process.env.ROOM_JWT_SECRET);

// Test JWT generation and verification manually
try {
  // 1. Generate user token
  const userPayload = { id: '12345', email: 'test@example.com', username: 'testuser' };
  const userToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log('\nUser token generated:', userToken);
  
  // 2. Verify user token
  const userDecoded = jwt.verify(userToken, process.env.JWT_SECRET);
  console.log('User token verified:', userDecoded);
  
  // 3. Generate room token
  const roomPayload = { roomId: 'room123', code: 'ABC123', host: '12345' };
  const roomToken = jwt.sign(roomPayload, process.env.ROOM_JWT_SECRET, { expiresIn: '1d' });
  console.log('\nRoom token generated:', roomToken);
  
  // 4. Verify room token
  const roomDecoded = jwt.verify(roomToken, process.env.ROOM_JWT_SECRET);
  console.log('Room token verified:', roomDecoded);
  
  // 5. Test token malformation (what happens if we pass wrong secret)
  console.log('\n=== Testing Error Cases ===');
  try {
    jwt.verify(roomToken, 'wrong_secret');
  } catch (err) {
    console.log('Expected error with wrong secret:', err.message);
  }
  
  try {
    jwt.verify('malformed.token', process.env.ROOM_JWT_SECRET);
  } catch (err) {
    console.log('Expected error with malformed token:', err.message);
  }
  
  console.log('\n=== Manual Test Completed Successfully ===');
  
} catch (error) {
  console.error('Manual test error:', error);
}
