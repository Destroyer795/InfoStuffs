import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import infoRoutes from "../routes/info.route.js";
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// Trust proxy for Vercel deployments
app.set('trust proxy', 1);

// CORS - allows production, localhost, and Vercel previews
const whitelist = [
  "https://info-stuffs.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.includes(origin) || origin.endsWith(".vercel.app")) {
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
app.use(express.json());

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

// Routes - mounted at both paths for Vercel compatibility
app.use("/api/info", infoRoutes);
app.use("/", infoRoutes);

// Local server
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    connectDB();
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;