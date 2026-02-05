import mongoose from 'mongoose';
import Info from '../models/info.model.js';

export const getInfos = async (req, res) => {
  try {
    const infos = await Info.find({userId: req.auth.userId}).sort({ createdAt: -1 }); //sorting by newest first
    res.status(200).json({ success: true, data: infos });
  } catch (error) {
    console.error('Error fetching infos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createInfo = async (req, res) => {
  const info = { ...req.body, userId: req.auth.userId };

  // Basic required fields
  if (!info.name || !info.category || !info.importance || !info.type) {
    return res.status(400).json({ success: false, message: 'Missing base fields' });
  }

  // Type-specific required fields
  if (info.type === 'text' && !info.content) {
    return res.status(400).json({ success: false, message: 'Text content is required' });
  }

  if (info.type === 'image' && !info.imageURL) {
    return res.status(400).json({ success: false, message: 'Image URL is required' });
  }

  if (info.type === 'file' && !info.file) {
    return res.status(400).json({ success: false, message: 'File URL is required' });
  }

  try {
    const newInfo = new Info(info);
    await newInfo.save();
    res.status(201).json({ success: true, data: newInfo });
  } catch (error) {
    console.error('Error creating info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateInfo = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.auth.userId;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  try {
    const updatedInfo = await Info.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedInfo) {
      return res.status(404).json({ success: false, message: 'Info not found or you do not have permission to update it' });
    }

    res.status(200).json({ success: true, data: updatedInfo });
  } catch (error) {
    console.error('Error updating info:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const deleteInfo = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth.userId;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  try {
    const deletedInfo = await Info.findOneAndDelete({ _id: id, userId });

    if (!deletedInfo) {
      return res.status(404).json({ success: false, message: 'Info not found or you do not have permission to delete it' });
    }

    res.status(200).json({ success: true, message: 'Info deleted successfully' });
  } catch (error) {
    console.error('Error deleting info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// The "Nuclear Option"
export const deleteAllInfos = async (req, res) => {
  const userId = req.auth.userId;

  try {
    // Delete ALL entries belonging to this specific user
    await Info.deleteMany({ userId: userId });
    
    res.status(200).json({ success: true, message: "Vault reset successfully." });
  } catch (error) {
    console.error("Error resetting vault:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};