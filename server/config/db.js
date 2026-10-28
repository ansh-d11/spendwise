const mongoose = require('mongoose');

let isMongoConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('<username>') || uri.includes('xxxxx')) {
    console.warn('\n⚠️ [MongoDB] MONGODB_URI contains placeholder credentials or is not set.');
    console.warn('👉 Update spendwise/.env with your MongoDB Atlas or local MongoDB URI.');
    console.warn('💡 The server will start in live demo fallback mode until MongoDB is configured.\n');
    isMongoConnected = false;
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    isMongoConnected = true;
    console.log(`\n🌿 [MongoDB] Connected successfully!`);
    console.log(`📦 [MongoDB] Host: ${conn.connection.host}`);
    console.log(`📂 [MongoDB] Database: ${conn.connection.name}\n`);
    return true;
  } catch (error) {
    isMongoConnected = false;
    console.error(`\n❌ [MongoDB Connection Error]: ${error.message}`);
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('👉 Check your MongoDB Atlas username and password in .env');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('buffering timed out')) {
      console.error('👉 Check your cluster domain and ensure IP Access (0.0.0.0/0) is enabled in MongoDB Atlas.');
    }
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  console.warn('⚠️ [MongoDB] Disconnected from database.');
});

mongoose.connection.on('reconnected', () => {
  isMongoConnected = true;
  console.log('🔄 [MongoDB] Reconnected.');
});

const getDBStatus = () => {
  const readyState = mongoose.connection.readyState;
  const isConnected = readyState === 1 && isMongoConnected;
  return {
    mode: isConnected ? 'mongodb' : 'demo',
    isConnected,
    host: isConnected ? mongoose.connection.host : null,
    name: isConnected ? mongoose.connection.name : 'SpendWise In-Memory',
  };
};

module.exports = { connectDB, getDBStatus };
