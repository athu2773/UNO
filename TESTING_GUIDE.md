# UNO Bot Functionality Testing Guide

## Prerequisites
1. ✅ Backend running on port 8080 with nodemon
2. ✅ Frontend running on port 5173
3. ✅ MongoDB connected
4. ✅ User logged in

## Step-by-Step Testing

### Step 1: Create a New Room
1. Navigate to the UNO app in your browser
2. Make sure you're logged in
3. Go to Dashboard
4. Click "Create Room" or equivalent button
5. **Important**: You must be the room creator to see bot management

### Step 2: Verify Host Status
1. Once in the room, check the browser console (F12)
2. Look for log messages showing room data
3. Verify you see debug info like: `Debug - Host: [your-user-id], You: [your-user-id], Match: YES`

### Step 3: Look for Bot Management UI
**Expected Location**: Between the room code display and the game board
**What to Look For**:
```
Room Management
┌─────────────────────────────────┐
│ [Add Bot Player] [Send Invitation] │
│                                 │
│ Room: 1 / 4 players             │
│ Bots: 0                         │
│ Human players: 1                │
│ Debug - Host: [id], You: [id], Match: YES │
└─────────────────────────────────┘
```

### Step 4: Add a Bot
1. Click the "Add Bot Player" button
2. Check browser console for messages:
   - `Adding bot to room: [ROOM_CODE]`
   - `Bot add response: {success: true, room: {...}}`
   - `Room updated: [Player List with Bot]`
3. The UI should update to show:
   - Room: 2 / 4 players
   - Bots: 1
   - A "Remove Bot Alice" button (or similar)

### Step 5: Verify Backend Logs
In your backend console, you should see:
```
User [user-id] attempting to add bot to room [ROOM_CODE]
Adding bot to room [ROOM_CODE]...
Bot added successfully! Room now has 2 players
Players: YourName, Bot Alice (Bot)
```

## Troubleshooting

### If Bot Management UI is Not Visible:

1. **Check Host Status**:
   ```javascript
   // Run in browser console
   console.log('Room data:', window.location.href);
   // Should show you're in /room/[CODE]
   ```

2. **Check Game Status**:
   - Make sure game hasn't started yet
   - Bot management only shows before game starts

3. **Check User Authentication**:
   ```javascript
   // Run in browser console
   localStorage.getItem('token') // Should return a JWT token
   ```

4. **Force Refresh**:
   - Refresh the page (Ctrl+F5)
   - Clear browser cache if needed

### If Add Bot Button Doesn't Work:

1. **Check Console Errors**:
   - Open browser DevTools (F12)
   - Look for JavaScript errors
   - Look for network errors

2. **Check Socket Connection**:
   ```javascript
   // Run in browser console - this checks if socket exists
   typeof io !== 'undefined' ? 'Socket.io loaded' : 'Socket.io not loaded'
   ```

3. **Manual Test**:
   ```javascript
   // Run in browser console (replace YOUR_ROOM_CODE)
   if (window.socket) {
     window.socket.emit('addBot', 'YOUR_ROOM_CODE', (response) => {
       console.log('Manual bot add result:', response);
     });
   }
   ```

## Expected Final Result

After successfully adding a bot, you should see:
1. ✅ Room has 2 players (you + bot)
2. ✅ Bot shows with "(Bot)" indicator
3. ✅ Remove bot button appears
4. ✅ Can start game with bot
5. ✅ Bot will automatically play when it's their turn

## Test Script

Copy and paste this into your browser console when in a room:
```javascript
// Quick bot test
console.log('=== Bot Test ===');
console.log('URL:', window.location.href);
console.log('Room Management visible:', !!document.querySelector('h3')?.textContent?.includes('Room Management'));
console.log('Add Bot button visible:', !!Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Add Bot')));
```
