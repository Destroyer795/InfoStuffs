import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import infoRoutes from "./routes/info.route.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://info-stuffs.vercel.app",
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server & same-origin
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("CORS not allowed"), false);
  },
  credentials: true,
}));

app.options("*", cors());

app.use(express.json());

let isConnected = false;

app.use(async (req, res, next) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    next();
  } catch (err) {
    console.error("DB connection error:", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});


app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/info", infoRoutes);

if (process.env.NODE_ENV !== "production") {
  app.listen(5000, () => {
    console.log("Server running locally");
  });
}
export default app;
