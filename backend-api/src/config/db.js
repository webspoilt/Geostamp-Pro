const mongoose = require('mongoose');

const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

  if (!mongoUri) {
    console.error('❌ No MongoDB URI found! Check env vars: MONGO_URI, MONGODB_URI, or DATABASE_URL');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
