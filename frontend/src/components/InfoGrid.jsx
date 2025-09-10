import React, { useState, useEffect } from 'react';
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
  Link,
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Snackbar,
  Alert
} from '@mui/material';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { uploadToSupabase, deleteFromSupabase } from "../utils/supabaseUpload";
import { useUser } from "@clerk/clerk-react";

const InfoGrid = ({ infos, onUpdate, onDelete, searchQuery, setSearchQuery }) => {
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [editInfo, setEditInfo] = useState(null);
  const [justDeleted, setJustDeleted] = useState(false);
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


  useEffect(() => {
  if (justDeleted) {
    const timer = setTimeout(() => {
      setJustDeleted(false);
    }, 500);

    return () => clearTimeout(timer);
  }
}, [justDeleted]);

  const handleOpen = (info) => setSelectedInfo(info);
  const handleClose = () => setSelectedInfo(null);
  const theme = useTheme();

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
        if (oldImagePath) {
          await deleteFromSupabase(oldImagePath);
        }
        newImageUrl = '';
      }

      if (editInfo?.type === 'file' && formData.type !== 'file') {
        const oldFilePath = getRelativePathFromUrl(editInfo.file);
        if (oldFilePath) {
          await deleteFromSupabase(oldFilePath);
        }
        newFileUrl = ''; 
      }

      if (formData.type === 'image') {
        if (newFileData.imageFile) {
          const oldImagePath = getRelativePathFromUrl(editInfo?.imageURL);
          if (oldImagePath) {
            await deleteFromSupabase(oldImagePath);
          }

          const uploadedImageUrl = await uploadToSupabase(newFileData.imageFile, userId, 'images');
          if (uploadedImageUrl) {
            newImageUrl = uploadedImageUrl;
          }
        }
        newFileUrl = '';
      }

      if (formData.type === 'file') {
        if (newFileData.docFile) {
          const oldFilePath = getRelativePathFromUrl(editInfo?.file);
          if (oldFilePath) {
            await deleteFromSupabase(oldFilePath);
          }
          const uploadedFileUrl = await uploadToSupabase(newFileData.docFile, userId, 'documents');
          if (uploadedFileUrl) {
            newFileUrl = uploadedFileUrl;
          }
        }
        newImageUrl = '';
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
    setNewFileData({
      imageFile: null,
      docFile: null
    });
  };

  const handleEditClose = () => {
    setEditInfo(null);
    setNewFileData({
      imageFile: null,
      docFile: null
    });
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
    formData.name !== (editInfo.name || "") ||
    formData.category !== (editInfo.category || "") ||
    formData.importance !== (editInfo.importance || "") ||
    formData.content !== (editInfo.content || "") ||
    formData.type !== (editInfo.type || "");
    
  const hasNewFiles = newFileData.imageFile !== null || newFileData.docFile !== null;
  const AllChanges = !noChanges && !hasNewFiles;
  if (AllChanges) {
    showSnack("info", "Nothing modified");
    handleEditClose();
    return;
  }

    try {
      const { imageURL, file } = await handleFileSubmit();
      
      const updatedData = {
        ...formData,
        imageURL,
        file,
      };

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
  
    if (infos.length === 0) {
      return (
        <Grid container justifyContent="center" alignItems="center" sx={{ height: '50vh' }}>
          <Typography variant="h4" color="text.secondary" sx={{ textAlign: 'center' }}>
            No information available. Please add some! <br />
            <Link component={RouterLink} to="/create">
              Click here to create info
            </Link>
          </Typography>
        </Grid>
      );
    }

    return (
        <Grid container spacing={3} padding={2}>
        {infos.map((info) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={info._id} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card
              onClick={() => handleOpen(info)}
              sx={{
                height: 300,
                width: 300,
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '12px',
                boxShadow: 3,
                transition: 'transform 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0px 4px 20px rgba(255, 255, 255, 0.2)'
                      : theme.shadows[7]
                }
              }}
            >
              <CardMedia
                component="img"
                height="150"
                image={info?.imageURL || `https://api.dicebear.com/8.x/initials/svg?seed=${info.name}`}
                alt={info?.name || 'Info Card'}
                sx={{
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />

              <CardContent
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.5,
                  height: 'calc(100% - 150px - 35px)',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ height: '1.5em', overflow: 'hidden' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 600,
                      lineHeight: '1.5em',
                      fontSize: '1.1rem'
                    }}
                  >
                    {info.name}
                  </Typography>
                </Box>

                <Box sx={{ mt: 1, height: '4em', overflow: 'hidden' }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.25em'
                    }}
                  >
                    Category: {info.category}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.25em'
                    }}
                  >
                    Importance: {info.importance}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.25em'
                    }}
                  >
                    Type: {info.type}
                  </Typography>
                </Box>
              </CardContent>

              <Box
                display="flex"
                justifyContent="flex-end"
                px={1}
                pb={1}
                sx={{
                  height: '35px',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditOpen(info);
                  }}
                  color="primary"
                  size="small"
                  className="cursor-hover-target"
                >
                  <EditSquareIcon />
                </IconButton>
                <IconButton
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      if (info.imageURL) {
                        const imagePath = getRelativePathFromUrl(info.imageURL);
                        if (imagePath) {
                          await deleteFromSupabase(imagePath);
                        }
                      }
                      if (info.file) {
                        const filePath = getRelativePathFromUrl(info.file);
                        if (filePath) {
                          await deleteFromSupabase(filePath);
                        }
                      }
                      onDelete?.(info._id);
                      showSnack("success", "Card deleted successfully")
                      setJustDeleted(true);
                    } catch (error) {
                      showSnack("error", "Card deletion failed: " + error.message)
                    }

                  }}
                  color="error"
                  size="small"
                  className="cursor-hover-target"
                >
                  <DeleteIcon />
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
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <TextField
          label="Search by name or category"
          variant="outlined"
          fullWidth
          sx={{ maxWidth: '500px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>
      
      {renderContent()}

      <Dialog
        open={!!selectedInfo}
        onClose={handleClose}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          style: {
            width: '75vw',
            maxWidth: '75vw',
            height: '75vh',
            overflowY: 'auto',
            borderRadius: '10px',
            margin: 'auto',
            overflowX: 'hidden'
          }
        }}
      >
        <DialogTitle>{selectedInfo?.name}</DialogTitle>
        <DialogContent dividers sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {selectedInfo?.type === 'text' && (
            <Typography variant="body1" gutterBottom>
              {selectedInfo?.content}
            </Typography>
          )}
          {selectedInfo?.type === 'image' && selectedInfo.imageURL && (
            <Box component="img" src={selectedInfo.imageURL} alt="Uploaded" sx={{ maxWidth: '100%', maxHeight: '60vh' }} />
          )}
          {selectedInfo?.type === 'file' && selectedInfo.file && (
            <Box>
            <Typography variant="body1" gutterBottom>
              Click on the button below to download the file.
            </Typography>
            <Button
              variant="outlined"
              href={selectedInfo.file}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 2 }}
            >
              Download File
            </Button>
          </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editInfo} onClose={handleEditClose} fullWidth maxWidth="sm">
        <DialogTitle>Edit Info</DialogTitle>
        <DialogContent dividers>
          <TextField
            margin="dense"
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
        <FormControl fullWidth margin="dense">
          <InputLabel id="select-label">Content Type</InputLabel>
          <Select
            labelId="select-label"
            id="content-type"
            value={formData.type}
            label="Content Type"
            onChange={handleEditTypeChange}
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
          onChange={handleFileUpdate}
        />
      )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            handleEditClose();
            showSnack("info", "Card update cancelled");
            }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
        >
          Save
        </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snack.open}
        autoHideDuration={400}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
          severity={snack.type}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default InfoGrid;