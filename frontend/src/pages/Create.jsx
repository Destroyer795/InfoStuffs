import { 
  Box,
  TextField,
  Typography,
  Button,
  useTheme
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Create({ handleCreate }) {
  const [formData, setFormData] = useState({ name: '', category: '', importance: '', content: '', image: '' });
  const navigate = useNavigate();
  const theme = useTheme(); //Access the current theme

  return (
    <Box
      component="section"
      sx={{
        p: 8,
        minHeight: '100vh', // so it fills the screen
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
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <TextField
        margin="dense"
        label="Image URL"
        fullWidth
        value={formData.image}
        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
      />
      <TextField
        margin="dense"
        label="Category"
        fullWidth
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      />
      <TextField
        margin="dense"
        label="Importance"
        fullWidth
        value={formData.importance}
        onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
      />
      <TextField
        margin="dense"
        label="Content"
        multiline
        rows={4}
        fullWidth
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
      />
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          onClick={async () => {
            try {
              await handleCreate(formData);
              setFormData({ name: '', image: '', category: '', importance: '', content: '' });
              navigate("/");
            } catch (err) {
              console.error("Error while creating:", err);
            }
          }}
        >
          Create
        </Button>
      </Box>
    </Box>
  );
}
