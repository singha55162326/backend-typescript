import express, { Express, Request, Response } from 'express';

const app: Express = express();

// Simple test route
app.get('/api/test', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Test route working'
  });
});

// 404 handler - Express 5 compatible
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

export default app;