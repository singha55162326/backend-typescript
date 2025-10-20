import ClusterService from './cluster';
import createApp from './server';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Start server with clustering in production
if (process.env.NODE_ENV === 'production') {
  ClusterService.run(() => {
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`Server worker ${process.pid} running on port ${PORT}`);
    });
  });
} else {
  // Development mode - single process
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}