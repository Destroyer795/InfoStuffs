import mongoose from 'mongoose';
const infoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    importance: {
        type: String,
        required: true,
    },
    }, {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
});

const Info = mongoose.model('Info', infoSchema);
export default Info; // Exporting the Product model to use it in other files

// This model defines the structure of the product documents in the MongoDB database
// and includes fields for name, image, content, category, and importance.
// The timestamps option automatically adds createdAt and updatedAt fields to the documents.
// The Product model can be used to create, read, update, and delete product documents in the database.
// At the end Product model is exported so that it can be used in other parts of the application.
// This is a Mongoose model for a product in an e-commerce application.