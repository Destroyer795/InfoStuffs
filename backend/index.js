import express, { response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // ✅ import CORS
import { connectDB } from './config/db.js';
import path from 'path'; // ✅ import path for serving static files
import infoRoutes from './routes/info.route.js'; // Import the info routes

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies
const PORTT = process.env.PORT || 5000;
const __dirname = path.resolve();


app.use('/api/info', infoRoutes); // Use the info routes for handling info-related operations

//here we are going to check our environment (production or development)
if (process.env.NODE_ENV == "production") { //that means we deploy the application
    //so we will have some kind of different configuration
    app.use(express.static(path.join(__dirname, "frontend", "dist")));
    //just like that we made our dist folder to be our static asset
    //the above thing basically says that go to root then go to frontend then go inside dist folder

    app.get("/*", (req, res) => {//if we send any request (*) (other than /api/products) then we should render our react application
        res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
    });
}

app.listen(PORTT, () => {
    connectDB();
    console.log("Server started at our http://localhost:" + PORTT);
}); //listening for a port then running a callback