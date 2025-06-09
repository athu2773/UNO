// Simple test to verify bot functionality works
// Run this in your browser console when in a game room

console.log("=== UNO Bot Functionality Test ===");

// Check if we're in a game room
const currentUrl = window.location.href;
console.log("Current URL:", currentUrl);

if (!currentUrl.includes("/room/")) {
  console.log("❌ Not in a game room. Navigate to a room first.");
} else {
  console.log("✅ In a game room");

  // Try to find the Room Management section
  const roomManagement = document
    .querySelector("h3")
    ?.textContent?.includes("Room Management");
  if (roomManagement) {
    console.log("✅ Room Management section found");
  } else {
    console.log("❌ Room Management section not found");
    console.log("This could mean:");
    console.log("- You are not the host");
    console.log("- The game has already started");
    console.log("- There is a rendering issue");
  }

  // Try to find the Add Bot button
  const addBotButton = Array.from(document.querySelectorAll("button")).find(
    (btn) => btn.textContent?.includes("Add Bot")
  );

  if (addBotButton) {
    console.log("✅ Add Bot button found");
    console.log("Button disabled:", addBotButton.disabled);
  } else {
    console.log("❌ Add Bot button not found");
  }

  // Check for debug info
  const debugInfo = document
    .querySelector("p")
    ?.textContent?.includes("Debug - Host:");
  if (debugInfo) {
    console.log("✅ Debug info found");
    const debugText = Array.from(document.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("Debug - Host:")
    )?.textContent;
    console.log("Debug text:", debugText);
  }
}

console.log("\n=== Next Steps ===");
console.log("1. Create a new room (you must be the host)");
console.log('2. Look for "Room Management" section');
console.log('3. Click "Add Bot Player" button');
console.log("4. Check console for success/error messages");
