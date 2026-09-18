import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { connectDB } from "../config/db.js";
import Info from "../models/info.model.js";
import infoRoutes from "../routes/info.route.js";
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// Disable x-powered-by header to prevent tech stack fingerprinting
app.disable('x-powered-by');

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

// Root path health check for Render, Vercel, and uptime monitors
app.get('/', (req, res, next) => {
  // If no auth header, immediately return 200 OK for platform health checks
  if (!req.headers.authorization) {
    return res.status(200).json({
      status: 'ok',
      service: 'InfoStuffs API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
  next();
});

// Database connection with automatic reconnection support
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

// Routes - mounted at both paths for Vercel compatibility with rate limiting
app.use("/api/info", apiLimiter, infoRoutes);
app.use("/", apiLimiter, infoRoutes);

// Global error handling middleware (prevents stack trace disclosure)
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Forbidden by CORS policy' });
  }
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Automated Expired Note Cleanup (scrubs user-expired and legacy 30d temporary notes)
export const runNoteCleanup = async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Info.deleteMany({
      $or: [
        { expiresAt: { $ne: null, $lte: now } },
        { isTemporary: true, expiresAt: null, createdAt: { $lt: thirtyDaysAgo } }
      ]
    });
    if (result.deletedCount > 0) {
      console.log(`[Auto-Cleanup] Scrubbed ${result.deletedCount} expired temporary notes.`);
    }
    return result.deletedCount;
  } catch (err) {
    console.error("[Auto-Cleanup] Error during note cleanup:", err.message);
    return 0;
  }
};

// Local / Docker server
if (!process.env.VERCEL || process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = Number(process.env.PORT) || 5000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    connectDB()
      .then(() => {
        runNoteCleanup();
      })
      .catch(err => console.error("Initial DB Connection Warning:", err.message));

    console.log(`Server running on port ${PORT}`);

    // Schedule background cleanup every 5 minutes (unref so process can exit cleanly)
    const cleanupInterval = setInterval(runNoteCleanup, 5 * 60 * 1000);
    if (cleanupInterval.unref) cleanupInterval.unref();
  });

  // Dual-port fallback for Render: Render routes to 10000 by default if PORT is not set.
  // Listening on both 5000 and 10000 guarantees instant health check resolution on Render.
  let auxiliaryServer = null;
  if (!process.env.PORT && !process.env.VERCEL) {
    const fallbackPort = 10000;
    try {
      auxiliaryServer = app.listen(fallbackPort, '0.0.0.0', () => {
        console.log(`Render auxiliary listener running on port ${fallbackPort}`);
      });
      auxiliaryServer.on('error', () => {
        // Fallback port unavailable or already bound, safe to ignore
      });
    } catch (e) {
      // safe to ignore
    }
  }

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      if (auxiliaryServer) {
        auxiliaryServer.close(() => {
          console.log('HTTP servers closed.');
          process.exit(0);
        });
      } else {
        console.log('HTTP server closed.');
        process.exit(0);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;