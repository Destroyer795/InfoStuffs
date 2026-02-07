import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { connectDB } from "../config/db.js";
import infoRoutes from "../routes/info.route.js";

dotenv.config();

const app = express();

// TRUST PROXY (Required for Vercel/Render/Heroku/Docker)
// Tells Express to trust the "X-Forwarded-For" header from the load balancer
// so we can identify the real user IP address.
app.set('trust proxy', 1);

// CORS CONFIGURATION
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? "*" : "https://info-stuffs.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true
}));

// PREFLIGHT HANDLER
app.options("*", cors());

// RATE LIMITER
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." }
});

// Apply the limiter
app.use(limiter);

// MIDDLEWARE
app.use(express.json());

// DATABASE CONNECTION (Cached for Serverless)
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

import { fileURLToPath } from 'url';

app.use("/api/info", infoRoutes);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    connectDB();
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;