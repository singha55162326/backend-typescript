import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    // Temporary hard-coded connection string for testing
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:qOlwN2GymBU9IiMk@db-stadium-football.dxmtpd9.mongodb.net/stadium-booking?retryWrites=true&w=majority&appName=db-stadium-football';
    
    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    console.log('Connection string starts with:', mongoUri.substring(0, 30));
    
    const options = {
      maxPoolSize: 50, // Increased from 10 to 50
      minPoolSize: 10, // Minimum connections to maintain
      serverSelectionTimeoutMS: 5000, // Reduced timeout for faster failure detection
      socketTimeoutMS: 45000,
      bufferCommands: false,
      retryWrites: true,
      retryReads: true,
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      waitQueueTimeoutMS: 5000, // Timeout for waiting for a connection
    };

    const conn = await mongoose.connect(mongoUri, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);

    // Set up indexes after connection is established
    await createIndexes();
    
    // Update monitoring service with connection info
  
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
    
    // Retry connection with exponential backoff
    setTimeout(() => {
      console.log('🔄 Retrying database connection...');
      connectDB();
    }, 5000);
  }
};

const createIndexes = async (): Promise<void> => {
  try {
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }

    console.log('🔧 Creating database indexes...');

    // Drop existing text index if it exists and create new one
    try {
      await mongoose.connection.db.collection('stadiums').dropIndex('name_text_description_text_address.city_text');
      console.log('🗑️ Dropped existing text index');
    } catch (err) {
      // Index might not exist, that's okay
      console.log('ℹ️ No existing text index to drop');
    }

    // Create indexes with performance optimizations
    try {
      await mongoose.connection.db.collection('stadiums').createIndex({
        name: 'text',
        description: 'text',
        'address.city': 'text'
      }, { name: 'stadiums_text_index' });
    } catch (err) {
      console.log('ℹ️ Stadiums text index already exists');
    }

    // Drop existing booking datetime index if it exists
    try {
      await mongoose.connection.db.collection('bookings').dropIndex('bookingDate_1_startTime_1_endTime_1');
      console.log('🗑️ Dropped existing booking datetime index');
    } catch (err) {
      // Index might not exist, that's okay
      console.log('ℹ️ No existing booking datetime index to drop');
    }

    // Optimized booking date index
    try {
      await mongoose.connection.db.collection('bookings').createIndex({
        bookingDate: 1,
        startTime: 1,
        endTime: 1
      }, { name: 'bookings_datetime_index' });
    } catch (err) {
      console.log('ℹ️ Bookings datetime index already exists');
    }

    // Drop existing availability index if it exists
    try {
      await mongoose.connection.db.collection('bookings').dropIndex('bookings_availability_index');
      console.log('🗑️ Dropped existing bookings availability index');
    } catch (err) {
      // Index might not exist, that's okay
      console.log('ℹ️ No existing bookings availability index to drop');
    }

    // Compound index for field availability checking
    try {
      await mongoose.connection.db.collection('bookings').createIndex({
        stadiumId: 1,
        fieldId: 1,
        bookingDate: 1,
        startTime: 1,
        endTime: 1,
        status: 1
      }, { 
        name: 'bookings_availability_index',
        partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } }
      });
    } catch (err) {
      console.log('ℹ️ Bookings availability index already exists');
    }

    // Drop existing user bookings index if it exists
    try {
      await mongoose.connection.db.collection('bookings').dropIndex('userId_1_bookingDate_-1');
      console.log('🗑️ Dropped existing user bookings index');
    } catch (err) {
      // Index might not exist, that's okay
      console.log('ℹ️ No existing user bookings index to drop');
    }

    // Index for user bookings
    try {
      await mongoose.connection.db.collection('bookings').createIndex({
        userId: 1,
        bookingDate: -1
      }, { name: 'bookings_user_index' });
    } catch (err) {
      // Index might already exist with a different name
      console.log('ℹ️ User bookings index already exists');
    }

    // Drop existing geo index if it exists
    try {
      await mongoose.connection.db.collection('stadiums').dropIndex('stadiums_geo_index');
      console.log('🗑️ Dropped existing stadiums geo index');
    } catch (err) {
      // Index might not exist, that's okay
      console.log('ℹ️ No existing stadiums geo index to drop');
    }

    // Geospatial index for location-based queries
    try {
      await mongoose.connection.db.collection('stadiums').createIndex({
        'address.coordinates': '2dsphere'
      }, { name: 'stadiums_geo_index' });
    } catch (err) {
      console.log('ℹ️ Stadiums geo index already exists');
    }

    // Drop existing analytics index if it exists
    try {
      await mongoose.connection.db.collection('bookings').dropIndex('bookings_analytics_index');
      console.log('🗑️ Dropped existing bookings analytics index');
    } catch (err) {
      // Index might not exist, that's okay
      console.log('ℹ️ No existing bookings analytics index to drop');
    }

    // Index for analytics queries
    try {
      await mongoose.connection.db.collection('bookings').createIndex({
        stadiumId: 1,
        status: 1,
        bookingDate: 1
      }, { name: 'bookings_analytics_index' });
    } catch (err) {
      console.log('ℹ️ Bookings analytics index already exists');
    }

    console.log('✅ Database indexes processed');
  } catch (error: any) {
    console.error('❌ Failed to process indexes:', error.message);
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