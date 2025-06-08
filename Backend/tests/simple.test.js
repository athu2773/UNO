// simple.test.js - Basic Jest test to verify Jest is working
describe('Basic Jest Test', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should handle environment variables', () => {
    require('dotenv').config();
    console.log('JWT_SECRET in simple test:', process.env.JWT_SECRET);
    expect(process.env.JWT_SECRET).toBe('masai');
  });
});
