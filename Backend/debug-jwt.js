// debug-jwt.js - Simple JWT debug script
console.log('Starting JWT debug...');

// Load environment variables
const result = require('dotenv').config();
console.log('Dotenv config result:', result);

const jwt = require('jsonwebtoken');

console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET:', JSON.stringify(process.env.JWT_SECRET));
console.log('ROOM_JWT_SECRET:', JSON.stringify(process.env.ROOM_JWT_SECRET));
console.log('JWT_SECRET type:', typeof process.env.JWT_SECRET);
console.log('ROOM_JWT_SECRET type:', typeof process.env.ROOM_JWT_SECRET);

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined!');
  process.exit(1);
}

if (!process.env.ROOM_JWT_SECRET) {
  console.error('ROOM_JWT_SECRET is not defined!');
  process.exit(1);
}

// Test basic JWT functionality
try {
  console.log('\n=== Testing User JWT ===');
  const userPayload = { id: '12345', email: 'test@example.com', username: 'testuser' };
  const userToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log('Generated user token:', userToken);
  console.log('Token type:', typeof userToken);
  console.log('Token length:', userToken.length);
  
  // Check if token looks like a JWT (three parts separated by dots)
  const parts = userToken.split('.');
  console.log('Token parts count:', parts.length);
  console.log('Header:', parts[0]);
  console.log('Payload:', parts[1]);
  console.log('Signature:', parts[2]);
  
  // Verify the token
  const userDecoded = jwt.verify(userToken, process.env.JWT_SECRET);
  console.log('Decoded user payload:', userDecoded);
  
  console.log('\n=== Testing Room JWT ===');
  const roomPayload = { roomId: 'room123', code: 'ABC123', host: '12345' };
  const roomToken = jwt.sign(roomPayload, process.env.ROOM_JWT_SECRET, { expiresIn: '1d' });
  console.log('Generated room token:', roomToken);
  console.log('Token type:', typeof roomToken);
  console.log('Token length:', roomToken.length);
  
  // Check if token looks like a JWT
  const roomParts = roomToken.split('.');
  console.log('Room token parts count:', roomParts.length);
  console.log('Room Header:', roomParts[0]);
  console.log('Room Payload:', roomParts[1]);
  console.log('Room Signature:', roomParts[2]);
  
  // Verify the room token
  const roomDecoded = jwt.verify(roomToken, process.env.ROOM_JWT_SECRET);
  console.log('Decoded room payload:', roomDecoded);
  
  console.log('\n=== JWT Test Success! ===');
} catch (error) {
  console.error('JWT Test Error:', error);
}
