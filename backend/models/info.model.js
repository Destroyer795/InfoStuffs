import mongoose from 'mongoose';

const infoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  content: {
    type: String,
  },
  category: {
    type: String,
    required: true,
  },
  importance: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
  file: {
    type: String, // for file URLs
  },
  imageURL: {
    type: String, // for image URLs
  }
}, {
  timestamps: true,
});

const Info = mongoose.model('Info', infoSchema);
export default Info;
