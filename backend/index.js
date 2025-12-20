import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';
import infoRoutes from './routes/info.route.js';

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  process.env.FRONTEND_URL 
].filter(Boolean);

// Array method (It's robust & handles credentials automatically)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use(express.json());

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    // Return a JSON error so the frontend knows what happened
    res.status(500).json({ message: 'Database connection error' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send("API is running...");
});

// API Routes
app.use('/api/info', infoRoutes);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
      console.log(`Server started at http://localhost:${PORT}`);
  });
}

export default app;