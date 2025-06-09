// Browser console test script for bot functionality
// Copy and paste this into the browser console when you're in a game room

console.log("Testing bot functionality...");

// Check if socket is available
if (window.socket) {
  console.log("Socket found:", window.socket.connected);

  // Try to add a bot
  window.socket.emit("addBot", "YOUR_ROOM_CODE", (response) => {
    console.log("Add bot response:", response);
  });
} else {
  console.log("No socket found on window object");

  // Try to find socket in React DevTools context
  // This might work if React DevTools is available
  try {
    const reactRoot =
      document.querySelector("#root")._reactInternalFiber ||
      document.querySelector("#root")._reactInternals;
    console.log(
      "React root found, you may need to access socket through component context"
    );
  } catch (e) {
    console.log("Could not access React internals");
  }
}

// Instructions for manual testing
console.log(`
Manual test instructions:
1. Make sure you are the host of a room
2. Make sure the game hasn't started yet
3. Look for the "Add Bot Player" button in the Room Management section
4. If you don't see it, check:
   - Are you the host? (only host can see bot management)
   - Has the game started? (bots can only be added before game starts)
   - Check browser console for errors
`);
