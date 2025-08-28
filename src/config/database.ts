import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    // Temporary hard-coded connection string for testing
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:qOlwN2GymBU9IiMk@db-stadium-football.dxmtpd9.mongodb.net/stadium-booking?retryWrites=true&w=majority&appName=db-stadium-football';
    
    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    console.log('Connection string starts with:', mongoUri.substring(0, 30));
    
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    const conn = await mongoose.connect(mongoUri, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);

    // Set up indexes after connection is established
    await createIndexes();
    
  } catch (error: any) {
    console.error('❌ Database connection error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.error('🔌 Connection refused - check if MongoDB Atlas IP whitelist includes your IP');
    } else if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication failed - check username and password');
    } else if (error.message.includes('MongoNetworkError')) {
      console.error('🌐 Network error - check internet connection and Atlas status');
    }
    
    throw error; // Re-throw to be handled by server startup
  }
};

const createIndexes = async (): Promise<void> => {
  try {
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    console.log('🔧 Creating database indexes...');

    // Create indexes (existing code remains the same)
    await mongoose.connection.db.collection('stadiums').createIndex({
      name: 'text',
      description: 'text',
      'address.city': 'text'
    });

    await mongoose.connection.db.collection('bookings').createIndex({
      bookingDate: 1,
      startTime: 1,
      endTime: 1
    });

    await mongoose.connection.db.collection('bookings').createIndex({
      stadiumId: 1,
      fieldId: 1,
      bookingDate: 1
    });

    await mongoose.connection.db.collection('bookings').createIndex({
      stadiumId: 1,
      fieldId: 1,
      bookingDate: 1,
      startTime: 1,
      endTime: 1,
      status: 1
    });

    await mongoose.connection.db.collection('bookings').createIndex({
      userId: 1,
      bookingDate: -1
    });

    await mongoose.connection.db.collection('stadiums').createIndex({
      'address.coordinates': '2dsphere'
    });

    console.log('✅ Database indexes created successfully');
  } catch (error: any) {
    console.error('❌ Failed to create indexes:', error.message);
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error closing MongoDB connection:', error.message);
    process.exit(1);
  }
});

export default connectDB;