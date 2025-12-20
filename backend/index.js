import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import infoRoutes from "./routes/info.route.js";

dotenv.config();

const app = express();

// Define Allowed Origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "https://info-stuffs.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

// CORS Policy
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Handle Preflight Requests Explicitly (Good move for Vercel!)
app.options("*", cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

// Database Middleware
// We trust connectDB() to handle caching internally (as per db.js)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection failed:", err);
    res.status(500).json({ message: "Database connection error" });
  }
});

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/info", infoRoutes);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
  });
}

export default app;