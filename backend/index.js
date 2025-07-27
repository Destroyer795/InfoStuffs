import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';
import path from 'path';
import infoRoutes from './routes/info.route.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
const PORTT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use('/api/info', infoRoutes);

if (process.env.NODE_ENV == "production") {
    app.use(express.static(path.join(__dirname, "frontend", "dist")));
    app.get("/*", (req, res) => {
        res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
    });
}

app.listen(PORTT, () => {
    connectDB();
});