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
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1 && process.env.FRONTEND_URL !== '*') {
       return callback(null, true); 
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use('/api/info', infoRoutes);

app.get('/', (req, res) => {
    res.send("API is running...");
});

if (process.env.NODE_ENV !== 'production') {
  const PORTT = process.env.PORT || 5000;
  app.listen(PORTT, () => {
      console.log(`Server started at http://localhost:${PORTT}`);
  });
}

export default app;