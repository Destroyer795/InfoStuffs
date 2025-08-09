import {
  Box,
  TextField,
  Typography,
  Button,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadToSupabase } from "../utils/supabaseUpload";
import { useUser } from "@clerk/clerk-react";

export default function Create({ handleCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    importance: '',
    type: 'text',
    content: '',
    imageFile: null,
    docFile: null,
  });

  const [success, setSuccess] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();

  const { user } = useUser();
  const userId = user?.id;

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setFormData({
      ...formData,
      type,
      content: '',
      imageFile: null,
      docFile: null,
    });
  };

  const handleFileChange = (e) => {
    if (!e.target.files.length) return;
    const file = e.target.files[0];
    if (formData.type === 'image') {
      setFormData({ ...formData, imageFile: file });
    } else if (formData.type === 'file') {
      setFormData({ ...formData, docFile: file });
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      alert("You must be signed in to upload.");
      return;
    }

    const submission = {
      name: formData.name,
      category: formData.category,
      importance: formData.importance,
      type: formData.type,
    };

    try {
      if (!formData.name.trim() || !formData.category.trim() || !formData.importance.trim()) {
        alert("Please fill in all required fields.");
        return;
      }
      if (formData.type === 'text') {
        if (!formData.content.trim()) {
          alert("Please provide text content.");
          return;
        }
        submission.content = formData.content.trim();
      }
      if (formData.type === 'image') {
        if (!formData.imageFile) {
          alert("Please upload an image.");
          return;
        }
        const url = await uploadToSupabase(formData.imageFile, userId, "images");
        if (!url) {
          alert("Image upload failed.");
          return;
        }
        submission.imageURL = url;
      }

      if (formData.type === 'file') {
        if (!formData.docFile) {
          alert("Please upload a file.");
          return;
        }
        const url = await uploadToSupabase(formData.docFile, userId, "documents");
        if (!url) {
          alert("File upload failed.");
          return;
        }
        submission.file = url;
      }



      handleCreate(submission)
        .then(() => {
          setSuccess(true);
          setHasSubmitted(true);
          setTimeout(() => navigate("/"), 2000);
        })
        .catch((err) => {
          console.error("Creation failed in handleCreate:", err);
          setSuccess(false);
          setHasSubmitted(true); 
        });

    } catch (err) {
      console.error("An unexpected error occurred:", err);
      setSuccess(false);
      setHasSubmitted(true);
    }
  };

  return (
    <Box
      component="section"
      sx={{
        p: 8,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Information
      </Typography>

      <TextField
        margin="dense"
        label="Name"
        fullWidth
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <TextField
        margin="dense"
        label="Category"
        fullWidth
        required
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      />
      <TextField
        margin="dense"
        label="Importance"
        fullWidth
        required
        value={formData.importance}
        onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
      />

      <FormControl fullWidth margin="dense">
        <InputLabel id="select-label">Content Type</InputLabel>
        <Select
          labelId="select-label"
          id="content-type"
          value={formData.type}
          label="Content Type"
          onChange={handleTypeChange}
        >
          <MenuItem value="text">Text</MenuItem>
          <MenuItem value="image">Image</MenuItem>
          <MenuItem value="file">File</MenuItem>
        </Select>
      </FormControl>

      {formData.type === 'text' && (
        <TextField
          margin="dense"
          label="Content"
          multiline
          rows={4}
          fullWidth
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
        />
      )}

      {(formData.type === 'image' || formData.type === 'file') && (
        <TextField
          margin="dense"
          type="file"
          fullWidth
          inputProps={{
            accept: formData.type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xlsx',
          }}
          onChange={handleFileChange}
        />
      )}

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSubmit}>
          Create
        </Button>
      </Box>
      
      {success && hasSubmitted && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Created Successfully! Redirecting...
        </Alert>
      )}
      {!success && hasSubmitted && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Creation Failed! Please try again.
        </Alert>
      )}
    </Box>
  );
}