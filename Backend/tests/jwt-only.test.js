// jwt-only.test.js - Test JWT without server or database
require('dotenv').config();
const jwt = require('jsonwebtoken');

describe('JWT Only Tests', () => {
  it('should generate and verify user JWT', () => {
    const payload = { id: '12345', email: 'test@example.com', username: 'testuser' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('12345');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.username).toBe('testuser');
  });

  it('should generate and verify room JWT', () => {
    const payload = { roomId: 'room123', code: 'ABC123', host: '12345' };
    const token = jwt.sign(payload, process.env.ROOM_JWT_SECRET, { expiresIn: '1d' });
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const decoded = jwt.verify(token, process.env.ROOM_JWT_SECRET);
    expect(decoded.roomId).toBe('room123');
    expect(decoded.code).toBe('ABC123');
    expect(decoded.host).toBe('12345');
  });

  it('should reject invalid tokens', () => {
    expect(() => {
      jwt.verify('invalid.token.here', process.env.JWT_SECRET);
    }).toThrow('jwt malformed');
    
    expect(() => {
      jwt.verify('valid.token.format', 'wrong_secret');
    }).toThrow();
  });
});
