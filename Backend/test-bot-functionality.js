// Test bot functionality
const mongoose = require('mongoose');
const Room = require('./models/Room');
const User = require('./models/User');
const botService = require('./services/bot.service');

async function testBotFunctionality() {
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/uno_game');
    console.log('Connected to database');

    // Find an existing room or create a test room
    let testRoom = await Room.findOne({ code: 'TEST01' });
    
    if (!testRoom) {
      // Create a test user
      let testUser = await User.findOne({ email: 'test@example.com' });
      if (!testUser) {
        testUser = new User({
          name: 'Test User',
          email: 'test@example.com',
          password: 'test123'
        });
        await testUser.save();
      }

      // Create a test room
      testRoom = new Room({
        code: 'TEST01',
        host: testUser._id,
        players: [{
          user: testUser._id,
          socketId: 'test_socket',
          hand: [],
          saidUno: false
        }],
        deck: [],
        discardPile: [],
        currentTurn: 0,
        direction: 'clockwise',
        drawStack: 0,
        currentColor: null,
        status: 'waiting'
      });
      await testRoom.save();
      console.log('Test room created');
    }

    console.log('Room before adding bot:', {
      players: testRoom.players.length,
      playerNames: testRoom.players.map(p => p.user.toString())
    });

    // Test adding a bot
    console.log('Adding bot to room...');
    const updatedRoom = await botService.addBotsToRoom('TEST01', 1);
    
    console.log('Room after adding bot:', {
      players: updatedRoom.players.length,
      playerDetails: updatedRoom.players.map(p => ({
        isBot: p.isBot,
        name: p.isBot ? p.user.name : 'Human',
        id: p.user._id || p.user
      }))
    });

    // Test bot creation
    console.log('\nTesting bot creation...');
    const bot = botService.createBotPlayer();
    console.log('Created bot:', {
      name: bot.user.name,
      isBot: bot.isBot,
      id: bot.user._id
    });

    console.log('\nBot functionality test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testBotFunctionality();
