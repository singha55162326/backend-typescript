import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.json({ message: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});