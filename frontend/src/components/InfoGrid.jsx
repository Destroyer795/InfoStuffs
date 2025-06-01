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
  Link
} from '@mui/material';
import EditSquareIcon from '@mui/icons-material/EditSquare';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';



const InfoGrid = ({ infos, onUpdate, onDelete }) => {
  const [selectedInfo, setSelectedInfo] = useState(null);
  const handleOpen = (info) => setSelectedInfo(info);
  const handleClose = () => setSelectedInfo(null);
  const [editInfo, setEditInfo] = useState(null); // To hold item   being edited
  const [formData, setFormData] = useState({ name: '', category: '', importance: '', content: '', image: '' });
  

  const theme = useTheme();
    if (infos.length === 0) {
    return (
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        sx={{ height: '100vh' }} // Full viewport height
      >
        <Typography variant="h4" color="text.secondary" sx={{ textAlign: 'center' }}>
          No information available. Please add some! <br />
        <Link component={RouterLink} to="/create">
          Click me to create infos
        </Link>
        </Typography>
      </Grid>
    );
  }
  return (
    <>
      <Grid container spacing={3} padding={2} >
        {infos.map((info) => (
          <Grid item xs={12} sm={6} md={4} key={info._id} sx={{ display: 'flex' }}>
            <Card
              onClick={() => handleOpen(info)}
              sx={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                width: '100%',

                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow:
                    theme.palette.mode === 'dark'
                      ? '0px 4px 20px rgba(255, 255, 255, 0.2)'
                      : theme.shadows[7],
                },
                borderRadius: '10px',
                boxShadow: 3,
              }}
            >
          <CardMedia
            component="img"
            height="180"
            image={info?.image || 'https://via.placeholder.com/300x180?text=No+Image'}
            alt={info?.name || 'Info Card'}
            sx={{ objectFit: 'cover' }}
          />

              
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom noWrap>
                  {info.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Category: {info.category}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Importance: {info.importance}
                </Typography>
              </CardContent>

              <Grid container justifyContent="flex-end" px={1} pb={1}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditInfo(info);
                    setFormData({
                      name: info.name,
                      category: info.category,
                      importance: info.importance,
                      content: info.content,
                      image: info.image,
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
                    if (onDelete) {
                      onDelete(info._id); // Pass the ID to delete
                    } 
                  }}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Card>

          </Grid>
        ))}
      </Grid>
      
      {/* Info Dialog */}
      <Dialog open={!!selectedInfo} onClose={handleClose} fullWidth maxWidth="lg" PaperProps={{
        style: {
          width: '75vw',    // 75% of viewport width
          maxWidth: '75vw', // override maxWidth
          height: '75vh',   // optional: 75% of viewport height
          overflowY: 'auto', // allow vertical scrolling if content overflows
          borderRadius: '10px', // optional: rounded corners
          margin: 'auto', // center the dialog
          overflowX: 'hidden', // hide horizontal scrollbar
        }
      }}>
        <DialogTitle>{selectedInfo?.name}</DialogTitle>
        <DialogContent dividers
        sx={{
          overflowY: 'auto', // Enable vertical scrolling
          overflowX: 'hidden', // Disable horizontal scrolling
          whiteSpace: 'pre-wrap',  // Wrap long text and preserve spacing
          wordBreak: 'break-word', // Break long words instead of overflowing
        }}>
          <Typography variant="body1" gutterBottom>
            {selectedInfo?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained" sx={{ mt: 2 }}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditInfo(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (onUpdate && editInfo) {
                onUpdate(editInfo._id, formData); // Pass ID and updated data
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
