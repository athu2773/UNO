// Test socket bot functionality
const io = require("socket.io-client");
const jwt = require("jsonwebtoken");

async function testSocketBotFunctionality() {
  try {
    // Create a test JWT token (you'll need to use a valid user from your database)
    const testPayload = {
      id: "684738722f5b71c08a38d3bc", // Use the test user ID from the previous test
      email: "test@example.com",
    };

    const token = jwt.sign(
      testPayload,
      process.env.JWT_SECRET || "your-secret-key"
    );
    console.log("Generated test token");

    // Connect to socket server
    const socket = io("http://localhost:8080", {
      auth: {
        token: token,
      },
    });

    socket.on("connect", () => {
      console.log("Connected to socket server");

      // Test adding a bot to the test room
      console.log("Testing addBot socket event...");
      socket.emit("addBot", "TEST01", (response) => {
        console.log("addBot response:", response);

        if (response.error) {
          console.error("Error adding bot:", response.error);
        } else {
          console.log("Bot added successfully!");
          console.log(
            "Updated room players:",
            response.room.players.map((p) => ({
              name: p.name,
              isBot: p.isBot,
            }))
          );
        }

        socket.disconnect();
      });
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testSocketBotFunctionality();
