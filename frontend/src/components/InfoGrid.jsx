import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  IconButton,
  TextField,
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Snackbar,
  Alert,
  Chip,
  Stack
} from '@mui/material';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { uploadToSupabase, deleteFromSupabase } from "../utils/supabaseUpload";
import { useUser } from "@clerk/clerk-react";

const TOTAL_PLACEHOLDERS = 15;
const hashCode = (s) => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);

const getPlaceholderImage = (id) => {
  const imageIndex = (Math.abs(hashCode(id)) % TOTAL_PLACEHOLDERS) + 1;
  return `/photos/${imageIndex}.jpg`;
};

const InfoGrid = ({ infos, onUpdate, onDelete, searchQuery, setSearchQuery }) => {
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [editInfo, setEditInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    importance: '',
    content: '',
    type: '',
    imageURL: '',
    file: ''
  });
  const [newFileData, setNewFileData] = useState({
    imageFile: null,
    docFile: null
  });

  const { user } = useUser();
  const userId = user?.id;
  const theme = useTheme();
  const navigate = useNavigate();

  const [snack, setSnack] = React.useState({
    open: false,
    type: 'success',
    message: '',
  });

  const showSnack = (type, message) => {
    setSnack((prev) => ({...prev, open: false }))
    setSnack({ open: true, type, message });
    setTimeout(() => setSnack((prev) => ({ ...prev, open: false })), 400);
  };

  const handleOpen = (info) => setSelectedInfo(info);
  const handleClose = () => setSelectedInfo(null);

  const handleFileUpdate = (e) => {
    if (!e.target.files.length) return;
    const file = e.target.files[0];
    if (formData.type === 'image') {
      setNewFileData(prev => ({ ...prev, imageFile: file }));
    } else if (formData.type === 'file') {
      setNewFileData(prev => ({ ...prev, docFile: file }));
    }
  };

  const getRelativePathFromUrl = (url) => {
    if (typeof url !== 'string') return null;
    const mainUrlPart = url.split('?')[0]; 
    const parts = mainUrlPart.split('/infostuffsende/');
    return parts?.[1] || null;
  };

  const handleFileSubmit = async () => {
    let newImageUrl = formData.imageURL;
    let newFileUrl = formData.file;

    try {
      if (editInfo?.type === 'image' && formData.type !== 'image') {
        const oldImagePath = getRelativePathFromUrl(editInfo.imageURL);
        if (oldImagePath) await deleteFromSupabase(oldImagePath);
        newImageUrl = '';
      }
      if (editInfo?.type === 'file' && formData.type !== 'file') {
        const oldFilePath = getRelativePathFromUrl(editInfo.file);
        if (oldFilePath) await deleteFromSupabase(oldFilePath);
        newFileUrl = ''; 
      }

      if (formData.type === 'image' && newFileData.imageFile) {
        const oldImagePath = getRelativePathFromUrl(editInfo?.imageURL);
        if (oldImagePath) await deleteFromSupabase(oldImagePath);
        newImageUrl = await uploadToSupabase(newFileData.imageFile, userId, 'images');
      }

      if (formData.type === 'file' && newFileData.docFile) {
        const oldFilePath = getRelativePathFromUrl(editInfo?.file);
        if (oldFilePath) await deleteFromSupabase(oldFilePath);
        newFileUrl = await uploadToSupabase(newFileData.docFile, userId, 'documents');
      }

      if (formData.type === 'text') {
        newImageUrl = '';
        newFileUrl = '';
      }

      return { imageURL: newImageUrl, file: newFileUrl };
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  };

  const handleEditOpen = (info) => {
    setEditInfo(info);
    setFormData({
      name: info.name,
      category: info.category,
      importance: info.importance,
      content: info.content || '',
      type: info.type,
      imageURL: info.imageURL || '',
      file: info.file || ''
    });
    setNewFileData({ imageFile: null, docFile: null });
  };

  const handleEditClose = () => {
    setEditInfo(null);
    setNewFileData({ imageFile: null, docFile: null });
  };

  const handleEditTypeChange = (e) => {
    const newType = e.target.value;
    setFormData(prev => ({
        ...prev,
        type: newType,
        content: newType === 'text' ? prev.content : '',
    }));
  };

  const handleSave = async () => {
    if (!onUpdate || !editInfo) return;

    const noChanges = 
      formData.name === editInfo.name &&
      formData.category === editInfo.category &&
      formData.importance === editInfo.importance &&
      formData.content === editInfo.content &&
      formData.type === editInfo.type;
      
    const hasNewFiles = newFileData.imageFile !== null || newFileData.docFile !== null;
    
    if (noChanges && !hasNewFiles) {
      showSnack("info", "Nothing modified");
      handleEditClose();
      return;
    }

    try {
      const { imageURL, file } = await handleFileSubmit();
      const updatedData = { ...formData, imageURL, file };
      await onUpdate(editInfo._id, updatedData);

      if (selectedInfo && selectedInfo._id === editInfo._id) {
        setSelectedInfo({ ...editInfo, ...updatedData });
      }
      showSnack("success", "Card updated successfully")
      handleEditClose();
    } catch (error) {
      showSnack("error", "Card update failed: " + error.message)
    }
  };
  
  const renderContent = () => {
    if (infos.length === 0 && searchQuery) {
      return (
        <Grid container justifyContent="center" alignItems="center" sx={{ height: '50vh' }}>
          <Typography variant="h5" color="text.secondary">
            No results found for "{searchQuery}"
          </Typography>
        </Grid>
      );
    }

    const gridItemStyles = {
      display: 'flex', 
      justifyContent: 'center',
      animation: 'fadeIn 0.5s ease-out forwards',
      opacity: 0, 
    };

    const cardStyles = {
      height: 340,
      width: 300,
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
      borderRadius: '12px',
      '&:hover': {
        transform: 'translate(-4px, -4px)',
        boxShadow: theme.palette.mode === 'dark' 
          ? `8px 8px 0px 0px ${theme.palette.primary.main}`
          : `8px 8px 0px 0px #000`,
        borderColor: theme.palette.primary.main,
      }
    };

    return (
      <Grid container spacing={3} padding={3}>
        
        <Grid item xs={12} sm={6} md={4} lg={3} sx={{ ...gridItemStyles, animationDelay: '0s' }}>
          <Box
            onClick={() => navigate('/create')}
            className="cursor-hover-target"
            sx={{
              ...cardStyles,
              border: `3px dashed ${theme.palette.text.secondary}`,
              backgroundColor: 'transparent',
              boxShadow: 'none',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              '&:hover': {
                ...cardStyles['&:hover'],
                border: `3px dashed ${theme.palette.primary.main}`,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(41, 121, 255, 0.05)' : 'rgba(41, 121, 255, 0.05)',
              }
            }}
          >
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: '50%', 
                border: `2px solid ${theme.palette.text.secondary}`,
                display: 'flex',
                transition: 'all 0.3s ease'
              }}
              className="add-icon-circle"
            >
              <AddIcon sx={{ fontSize: 40, color: theme.palette.text.secondary }} />
            </Box>
            <Typography variant="h6" color="text.secondary" fontWeight="bold">
              Create New
            </Typography>
          </Box>
        </Grid>

        {infos.map((info, index) => (
          <Grid 
            item xs={12} sm={6} md={4} lg={3} 
            key={info._id} 
            sx={{ 
              ...gridItemStyles,
              animationDelay: `${(index + 1) * 0.05}s`,
            }}
          >
            <Card
              onClick={() => handleOpen(info)}
              className="cursor-hover-target"
              sx={cardStyles}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="160"
                  image={info?.imageURL || getPlaceholderImage(info._id)}
                  alt={info?.name}
                  sx={{
                    objectFit: 'cover',
                    borderBottom: `2px solid ${theme.palette.divider}`,
                    borderTopLeftRadius: '10px',
                    borderTopRightRadius: '10px',
                  }}
                />
                <Chip 
                  label={info.type.toUpperCase()} 
                  size="small"
                  sx={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10, 
                    fontWeight: 'bold',
                    backgroundColor: theme.palette.background.paper,
                    border: `2px solid ${theme.palette.text.primary}`,
                    color: theme.palette.text.primary
                  }} 
                />
              </Box>

              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, pt: 2, overflow: 'hidden' }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    lineHeight: 1.2, 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={info.name}
                >
                  {info.name}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Chip 
                    label={info.category} 
                    size="small" 
                    variant="outlined" 
                    title={info.category}
                    sx={{ 
                      borderRadius: '6px', 
                      fontWeight: 600,
                      maxWidth: 'calc(50% - 4px)',
                    }} 
                  />
                  <Chip 
                    label={info.importance} 
                    size="small" 
                    title={info.importance}
                    sx={{ 
                      borderRadius: '6px', 
                      fontWeight: 600,
                      backgroundColor: info.importance === 'High' ? '#ffcdd2' : info.importance === 'Medium' ? '#fff9c4' : '#c8e6c9',
                      color: '#000',
                      border: '1px solid #000',
                      maxWidth: 'calc(50% - 4px)',
                    }} 
                  />
                </Box>
              </CardContent>

              <Box
                display="flex"
                justifyContent="flex-end"
                p={1.5}
                gap={1}
                sx={{ 
                  borderTop: `2px solid ${theme.palette.divider}`, 
                  bgcolor: theme.palette.background.default,
                  borderBottomLeftRadius: '10px', 
                  borderBottomRightRadius: '10px'
                }}
              >
                <IconButton
                  onClick={(e) => { e.stopPropagation(); handleEditOpen(info); }}
                  size="small"
                  sx={{ 
                    border: '2px solid', 
                    borderColor: 'primary.main', 
                    color: 'primary.main',
                    borderRadius: '8px',
                    '&:hover': { bgcolor: 'primary.main', color: 'background.paper' }
                  }}
                >
                  <EditSquareIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      if (info.imageURL) {
                        const imagePath = getRelativePathFromUrl(info.imageURL);
                        if (imagePath) await deleteFromSupabase(imagePath);
                      }
                      if (info.file) {
                        const filePath = getRelativePathFromUrl(info.file);
                        if (filePath) await deleteFromSupabase(filePath);
                      }
                      onDelete?.(info._id);
                      showSnack("success", "Deleted")
                    } catch (error) {
                      showSnack("error", "Delete failed")
                    }
                  }}
                  size="small"
                  sx={{ 
                    border: '2px solid', 
                    borderColor: 'error.main', 
                    color: 'error.main',
                    borderRadius: '8px',
                    '&:hover': { bgcolor: 'error.main', color: '#fff' }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
  

  return (
    <>
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <TextField
          placeholder="Search your collection..."
          variant="outlined"
          fullWidth
          sx={{ 
            maxWidth: '600px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '50px',
              boxShadow: theme.shadows[1]
            }
          }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>
      
      {renderContent()}

      <Dialog
        open={!!selectedInfo}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: { borderRadius: '16px', border: `2px solid ${theme.palette.text.primary}` }
        }}
      >
        <DialogTitle sx={{ borderBottom: `2px solid ${theme.palette.divider}`, fontWeight: 800 }}>
          {selectedInfo?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {selectedInfo?.type === 'text' && (
            <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
              {selectedInfo?.content}
            </Typography>
          )}
          {selectedInfo?.type === 'image' && selectedInfo.imageURL && (
            <Box component="img" src={selectedInfo.imageURL} alt="Preview" sx={{ width: '100%', borderRadius: '8px', border: '2px solid #000' }} />
          )}
          {selectedInfo?.type === 'file' && selectedInfo.file && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" gutterBottom>File Attachment Available</Typography>
              <Button
                variant="contained"
                href={selectedInfo.file}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 2 }}
              >
                Download Document
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `2px solid ${theme.palette.divider}` }}>
          <Button onClick={handleClose} variant="outlined" sx={{ borderWidth: '2px', '&:hover': { borderWidth: '2px' } }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editInfo} onClose={handleEditClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Info</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            label="Category"
            fullWidth
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
          <TextField
            label="Importance"
            fullWidth
            value={formData.importance}
            onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
          />
          <FormControl fullWidth className="cursor-hover-target">
            <InputLabel>Content Type</InputLabel>
            <Select
              value={formData.type}
              label="Content Type"
              onChange={handleEditTypeChange}
            >
              <MenuItem value="text" className="cursor-hover-target">Text</MenuItem>
              <MenuItem value="image" className="cursor-hover-target">Image</MenuItem>
              <MenuItem value="file" className="cursor-hover-target">File</MenuItem>
            </Select>
          </FormControl>
          
          {formData.type === 'text' && (
            <TextField
              label="Content"
              multiline
              rows={6}
              fullWidth
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          )}

          {(formData.type === 'image' || formData.type === 'file') && (
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ height: '56px', borderStyle: 'dashed' }}
            >
              {formData.type === 'image' ? (newFileData.imageFile ? newFileData.imageFile.name : "Upload New Image") : (newFileData.docFile ? newFileData.docFile.name : "Upload New File")}
              <input
                type="file"
                hidden
                accept={formData.type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xlsx'}
                onChange={handleFileUpdate}
              />
            </Button>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleEditClose} color="error" className="cursor-hover-target">Cancel</Button>
          <Button 
            variant="outlined" 
            onClick={handleSave}
            className="cursor-hover-target"
            sx={{
              borderWidth: '2px',
              '&:hover': {
                borderWidth: '2px',
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnack((prev) => ({ ...prev, open: false }))} 
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
    </>
  );
};

export default InfoGrid;