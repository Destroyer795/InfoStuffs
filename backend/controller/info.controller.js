import mongoose from 'mongoose';
import Info from '../models/info.model.js'; // Import the Info model
// This file defines the routes for handling information-related operations in the application.
export const getInfos = async (req, res) => {
    try {
        const infos = await Info.find({}); // Fetch all info documents from the database
        res.status(200).json({success: true, data: infos}); // Respond with the fetched info documents
    }
    catch (error) {
        console.error('Error fetching infos:', error);
        res.status(500).json({success: false, message: 'Server error' }); // Respond with an error message if something goes wrong
    }
}

export const createInfo = async (req, res) => {
    const info = req.body; // Assuming the product data is sent in the request body
    if (!info.name || !info.image || !info.content || !info.category || !info.importance) {
        return res.status(400).json({success: false, message: 'All fields are required' });
    }
    const newInfo = new Info(info); // Create a new instance of the Info model
    try {
        await newInfo.save(); // Save the new product to the database
        res.status(201).json(newInfo); // Respond with the created product
    }
    catch (error) {
        console.error('Error creating info:', error);
        res.status(500).json({success: false, message: 'Server error' });
    }
}

export const updateInfo = async (req, res) => {
    const { id } = req.params;
    const info = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    try {
        const updatedInfo = await Info.findByIdAndUpdate(id, info, { new: true, runValidators: true });

        if (!updatedInfo) {
            return res.status(404).json({ success: false, message: 'Info not found' });
        }

        res.status(200).json({ success: true, data: updatedInfo });
    } catch (error) {
        console.error('Error updating info:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};


export const deleteInfo = async (req, res) => {
    const { id } = req.params; // Get the product ID from the request parameters
    try {
        const deletedInfo = await Info.findByIdAndDelete(id); // Find and delete the product by ID
        if (!deletedInfo) {
            return res.status(404).json({success: false, message: 'Info not found' });
        }
        res.status(200).json({success: true, message: 'Info deleted successfully' }); // Respond with success message
    }
    catch (error) {
        console.error('Error deleting info:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

