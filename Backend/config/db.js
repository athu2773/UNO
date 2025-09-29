const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log(" MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // Try to reconnect after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
