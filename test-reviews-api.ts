import express from 'express';
import mongoose from 'mongoose';
import Review from './src/models/Review';
import Stadium from './src/models/Stadium';
import User from './src/models/User';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/stadium_booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as any);

const app = express();
app.use(express.json());

// Test the getAllReviews functionality
app.get('/test-reviews', async (req, res) => {
  try {
    // Mock user data for testing
    const mockUser = {
      userId: '64f8b2c3d1e4a82f8c9d0e1f', // Replace with actual user ID from your database
      role: 'stadium_owner' // or 'superadmin'
    };

    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build query based on user role
    let query: any = {};
    
    // If status is provided, add to query
    if (status && status !== 'all') {
      query.status = status;
    }

    // If user is a stadium owner, only show reviews for their stadiums
    if (mockUser.role === 'stadium_owner') {
      const stadiums = await Stadium.find({ ownerId: mockUser.userId }, '_id');
      const stadiumIds = stadiums.map(stadium => stadium._id);
      query.stadiumId = { $in: stadiumIds };
    }
    // Superadmin can see all reviews, so no additional filtering needed

    const reviews = await Review.find(query)
      .populate('userId', 'firstName lastName')
      .populate('stadiumId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});