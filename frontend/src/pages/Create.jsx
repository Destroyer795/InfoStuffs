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
  Alert,
  Paper,
  Stack,
  Snackbar,
  FormControlLabel,
  Switch,
  Tooltip
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadToSupabase, createOpaqueStoragePath } from "../utils/supabaseUpload";
import { useUser } from "@clerk/clerk-react";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MarkdownInput from "../components/MarkdownInput"; // Import added

export default function Create({ handleCreate, userKey }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    importance: '',
    type: 'text',
    content: '',
    imageFile: null,
    docFile: null,
    isTemporary: false,
    retentionDays: 30,
  });

  const [snack, setSnack] = useState({
    open: false,
    type: 'info',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useUser();
  const userId = user?.id;

  const showSnack = (type, message) => {
    setSnack({ open: true, type, message });
  };

  const handleTypeChange = (e) => {
    setFormData({
      ...formData,
      type: e.target.value,
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
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!userId || !userKey) {
      showSnack("error", "Encryption key or user session missing. Unlock vault first.");
      setIsSubmitting(false);
      return;
    }

    const submission = {
      name: formData.name,
      category: formData.category,
      importance: formData.importance,
      type: formData.type,
      isTemporary: formData.isTemporary,
      expiresAt: formData.isTemporary 
        ? new Date(Date.now() + Number(formData.retentionDays || 30) * 24 * 60 * 60 * 1000).toISOString()
        : null,
    };

    try {
      if (!formData.name.trim() || !formData.category.trim() || !formData.importance.trim()) {
        showSnack("error", "Please fill in all required fields.");
        setIsSubmitting(false);
        return;
      }
      
      if (formData.type === 'text') {
        if (!formData.content.trim()) {
          showSnack("error", "Please provide text content.");
          setIsSubmitting(false);
          return;
        }
        submission.content = formData.content.trim();
      } else if (formData.type === 'image') {
        if (!formData.imageFile) {
          showSnack("error", "Please upload an image.");
          setIsSubmitting(false);
          return;
        }
        const storagePath = createOpaqueStoragePath(formData.imageFile, "images");
        const url = await uploadToSupabase(formData.imageFile, storagePath, userKey);
        if (!url) {
          showSnack("error", "Image upload failed.");
          setIsSubmitting(false);
          return;
        }
        submission.imageURL = url;
      } else if (formData.type === 'file') {
        if (!formData.docFile) {
          showSnack("error", "Please upload a file.");
          setIsSubmitting(false);
          return;
        }
        const storagePath = createOpaqueStoragePath(formData.docFile, "documents");
        const url = await uploadToSupabase(formData.docFile, storagePath, userKey);
        if (!url) {
          showSnack("error", "File upload failed.");
          setIsSubmitting(false);
          return;
        }
        submission.file = url;
      }

      handleCreate(submission)
        .then(() => {
          setTimeout(() => navigate("/"), 2000);
        })
        .catch((err) => {
          console.error(err);
          setIsSubmitting(false);
        });

    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      component="section"
      sx={{
        p: 4,
        minHeight: '90vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        pt: 8
      }}
    >
      <Paper 
        elevation={0}
        sx={{ 
          p: 5, 
          width: '100%', 
          maxWidth: 800, // Increased width for better editor experience
          borderRadius: 3,
          border: `2px solid ${theme.palette.text.primary}`,
          boxShadow: theme.palette.mode === 'dark' ? '8px 8px 0px #E6E6E6' : '8px 8px 0px #000'
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800, mb: 3 }}>
          New Entry
        </Typography>

        <Stack spacing={3}>
          <TextField
            label="Title"
            fullWidth
            required
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="cursor-hover-target"
          />
          
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Category"
              fullWidth
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="cursor-hover-target"
            />
            <TextField
              label="Importance (Low, Medium, High)"
              fullWidth
              required
              value={formData.importance}
              onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
              className="cursor-hover-target"
            />
          </Stack>

          <Box sx={{ p: 1.5, borderRadius: '8px', border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isTemporary}
                  onChange={(e) => setFormData({ ...formData, isTemporary: e.target.checked })}
                  color="warning"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Temporary Note (Auto-Deletes)
                </Typography>
              }
              className="cursor-hover-target"
            />
            {formData.isTemporary && (
              <Box sx={{ mt: 1.5, pl: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                  Expires in:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {[
                    { label: '24 Hours', days: 1 },
                    { label: '7 Days', days: 7 },
                    { label: '30 Days', days: 30 },
                    { label: '90 Days', days: 90 },
                  ].map((opt) => {
                    const isSelected = (formData.retentionDays || 30) === opt.days;
                    return (
                      <Chip
                        key={opt.days}
                        label={opt.label}
                        onClick={() => setFormData(prev => ({ ...prev, retentionDays: opt.days }))}
                        variant={isSelected ? "filled" : "outlined"}
                        color={isSelected ? "warning" : "default"}
                        className="cursor-hover-target"
                        sx={{
                          fontWeight: isSelected ? 700 : 500,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          borderWidth: isSelected ? '2px' : '1px',
                          transition: 'all 0.1s ease-in-out',
                          '&:hover': {
                            transform: 'translate(-1px, -1px)',
                          }
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>

          <FormControl fullWidth className="cursor-hover-target">
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              label="Type"
              onChange={handleTypeChange}
            >
              <MenuItem value="text" className="cursor-hover-target">Text Note</MenuItem>
              <MenuItem value="image" className="cursor-hover-target">Image</MenuItem>
              <MenuItem value="file" className="cursor-hover-target">File Attachment</MenuItem>
            </Select>
          </FormControl>

          {formData.type === 'text' && (
            <MarkdownInput
              value={formData.content}
              onChange={(val) => setFormData({ ...formData, content: val })}
              placeholder="Write your note in Markdown..."
            />
          )}

          {(formData.type === 'image' || formData.type === 'file') && (
            <Button
              component="label"
              variant="outlined"
              fullWidth
              className="cursor-hover-target"
              sx={{ 
                height: 100, 
                borderStyle: 'dashed', 
                borderWidth: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              <CloudUploadIcon fontSize="large" />
              <Typography variant="button">
                {formData.type === 'image' 
                  ? (formData.imageFile ? formData.imageFile.name : "Click to upload image") 
                  : (formData.docFile ? formData.docFile.name : "Click to upload file")}
              </Typography>
              <input
                type="file"
                hidden
                accept={formData.type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xlsx'}
                onChange={handleFileChange}
              />
            </Button>
          )}

          <Button
            variant="outlined"
            color="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="cursor-hover-target"
            sx={{
              mt: 4,
              py: 1.5,
              fontWeight: 'bold',
              fontSize: '1rem',
              borderWidth: 2,
              borderRadius: 1,
              borderColor: isSubmitting ? theme.palette.action.disabled : theme.palette.primary.main,
              boxShadow: 'none',
              transition: 'all 0.1s ease-in-out',
              '&:hover': {
                transform: isSubmitting ? 'none' : 'translate(-1px, -1px)',
                boxShadow: isSubmitting ? 'none' : `2px 2px 0px ${theme.palette.primary.main}`,
                borderWidth: 2,
              },
              '&:active': {
                transform: isSubmitting ? 'none' : 'translate(1px, 1px) !important',
                boxShadow: 'none !important',
              },
              '&.Mui-disabled': {
                borderWidth: 2,
                borderColor: theme.palette.action.disabled,
              }
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Info Card'}
          </Button>
        </Stack>

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnack(prev => ({ ...prev, open: false }))} 
            severity={snack.type} 
            variant="filled" 
            sx={{ 
              width: '100%', 
              border: '2px solid #000', 
              boxShadow: '4px 4px 0px #000', 
              fontWeight: 'bold' 
            }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}