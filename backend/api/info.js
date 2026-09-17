import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { connectDB } from "../config/db.js";
import infoRoutes from "../routes/info.route.js";
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// Trust proxy for Vercel deployments and reverse proxies
app.set('trust proxy', 1);

// Rate Limiter: General API endpoints (300 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// CORS - allows production, localhost, and legitimate InfoStuffs Vercel previews
const whitelist = [
  "https://info-stuffs.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173"
];

const isAllowedVercelOrigin = (origin) => {
  // Matches https://info-stuffs.vercel.app and preview deployments like https://info-stuffs-xyz.vercel.app
  return /^https:\/\/info-stuffs(-[a-zA-Z0-9_-]+)?\.vercel\.app$/.test(origin);
};

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      whitelist.includes(origin) || 
      isAllowedVercelOrigin(origin) || 
      origin.startsWith("http://localhost:") || 
      origin.startsWith("http://127.0.0.1:")
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Health Check Route (Must be above DB connection)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connection (cached for serverless)
let isConnected = false;
app.use(async (req, res, next) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Routes - mounted at both paths for Vercel compatibility with rate limiting
app.use("/api/info", apiLimiter, infoRoutes);
app.use("/", apiLimiter, infoRoutes);

// Local / Docker server
if (!process.env.VERCEL || process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    connectDB().catch(err => console.error("Initial DB Connection Warning:", err.message));
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;