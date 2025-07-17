import mongoose from 'mongoose';
import Info from '../models/info.model.js';

// @desc Get all info items
export const getInfos = async (req, res) => {
  try {
    const infos = await Info.find({}).sort({ createdAt: -1 }); // Optional: sort by newest first
    res.status(200).json({ success: true, data: infos });
  } catch (error) {
    console.error('Error fetching infos:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Create a new info item
export const createInfo = async (req, res) => {
  const info = req.body;

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
    res.status(201).json({ success: true, data: newInfo }); // ✅ Consistent response
  } catch (error) {
    console.error('Error creating info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc Update an existing info item
export const updateInfo = async (req, res) => {
  const { id } = req.params;
  const info = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  try {
    const updatedInfo = await Info.findByIdAndUpdate(id, info, {
      new: true,
      runValidators: true,
    });

    if (!updatedInfo) {
      return res.status(404).json({ success: false, message: 'Info not found' });
    }

    res.status(200).json({ success: true, data: updatedInfo });
  } catch (error) {
    console.error('Error updating info:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc Delete an info item
export const deleteInfo = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  try {
    const deletedInfo = await Info.findByIdAndDelete(id);

    if (!deletedInfo) {
      return res.status(404).json({ success: false, message: 'Info not found' });
    }

    res.status(200).json({ success: true, message: 'Info deleted successfully' });
  } catch (error) {
    console.error('Error deleting info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
