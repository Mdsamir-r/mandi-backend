const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Agar .env load nahi ho raha toh direct url de dete hain fallback ke liye
    const connUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mandi-db';
    await mongoose.connect(connUri);
    console.log("MongoDB Connected Successfully...");
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
};

// Ekdum dhyan se check kijiye exports me 's' laga hona chahiye
module.exports = connectDB;