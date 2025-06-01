import mongoose from "mongoose"

export const connectDB = async () => { //exporting that function as well and this is an async function
    try {
        //we will use mongoose package to be able to connect our database using the URI
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
    catch(error) {
        console.log(`Error: ${error.message}`); //printing the error with the error message
        process.exit(1); //exiting with process status code of 1 (that means any failure and 0 means success))
    }
}