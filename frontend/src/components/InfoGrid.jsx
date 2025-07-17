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
  Link,
  Box,
  Alert
} from '@mui/material';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

const InfoGrid = ({ infos, onUpdate, onDelete }) => {
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

  const handleOpen = (info) => setSelectedInfo(info);
  const handleClose = () => setSelectedInfo(null);
  const theme = useTheme();

  if (!Array.isArray(infos) || infos.length === 0) {
    return (
      <Grid container justifyContent="center" alignItems="center" sx={{ height: '100vh' }}>
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
    <>
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
                height="140"
                image={info?.imageURL || `https://picsum.photos/300/140?random=${info._id}`}
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
                  height: 'calc(100% - 120px - 48px)',
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
                  height: '48px',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
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
                  }}
                  color="primary"
                  size="small"
                >
                  <EditSquareIcon />
                </IconButton>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(info._id);
                  }}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* View Dialog */}
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

      {/* Edit Dialog */}
      <Dialog open={!!editInfo} onClose={() => setEditInfo(null)} fullWidth maxWidth="sm">
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
          {formData.type === 'image' && (
            <TextField
              margin="dense"
              label="Image URL"
              fullWidth
              value={formData.imageURL}
              onChange={(e) => setFormData({ ...formData, imageURL: e.target.value })}
            />
          )}
          {formData.type === 'file' && (
            <TextField
              margin="dense"
              label="Document Link"
              fullWidth
              value={formData.file}
              onChange={(e) => setFormData({ ...formData, file: e.target.value })}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditInfo(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (onUpdate && editInfo) {
                onUpdate(editInfo._id, formData);
              }
              setEditInfo(null);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InfoGrid;
