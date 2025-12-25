import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import infoRoutes from "../routes/info.route.js";

dotenv.config();

const app = express();

// CORS CONFIGURATION
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? "*" : "https://info-stuffs.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true
}));

// PREFLIGHT HANDLER (Crucial for CORS fix)
app.options("*", cors());

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