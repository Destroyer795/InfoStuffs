import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  CircularProgress, 
  Alert, 
  Grid, 
  Chip, 
  InputAdornment, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Paper
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SearchIcon from '@mui/icons-material/Search';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import ReactMarkdown from 'react-markdown';

import { getOfflineNotes } from '../utils/localStore';
import { decryptText } from '../utils/encryption';
import EncryptionWorker from '../utils/worker?worker';

const OfflineVault = () => {
  const [cachedNotes, setCachedNotes] = useState([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [decryptedNotes, setDecryptedNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedImportance, setSelectedImportance] = useState('All');
  const [selectedNote, setSelectedNote] = useState(null);

  // Fetch cached notes on mount
  useEffect(() => {
    const loadCache = async () => {
      const data = await getOfflineNotes();
      setCachedNotes(data);
    };
    loadCache();
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password || cachedNotes.length === 0) return;

    setIsUnlocking(true);
    setError('');

    // Fetch the salt from the first note
    const firstNote = cachedNotes[0];
    const salt = firstNote.userId;

    // Use Web Worker to derive the key
    const worker = new EncryptionWorker();
    worker.postMessage({ password, salt });

    worker.onmessage = async (event) => {
      const { success, key, error: workerError } = event.data;

      if (!success) {
        setError(workerError || 'Failed to derive decryption key.');
        setIsUnlocking(false);
        worker.terminate();
        return;
      }

      try {
        // Try decrypting the first note's name to verify the password
        const verifiedName = await decryptText(firstNote.name, key);

        if (verifiedName === '') {
          setError('Incorrect password. Please try again.');
          setIsUnlocking(false);
          worker.terminate();
          return;
        }

        // Decryption was successful! Now decrypt all notes.
        const decryptedPromises = cachedNotes.map(async (note) => {
          const name = await decryptText(note.name, key);
          const category = await decryptText(note.category, key);
          const content = note.type === 'text' 
            ? await decryptText(note.content, key) 
            : note.content;

          return {
            ...note,
            name: name || 'Untitled',
            category: category || 'General',
            content: content || ''
          };
        });

        const decrypted = await Promise.all(decryptedPromises);
        setDecryptedNotes(decrypted);
        setIsUnlocked(true);
      } catch (err) {
        setError('An error occurred during decryption.');
      } finally {
        setIsUnlocking(false);
        worker.terminate();
      }
    };
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setPassword('');
    setDecryptedNotes([]);
    setSelectedNote(null);
  };

  // Get unique categories from decrypted notes
  const categories = ['All', ...new Set(decryptedNotes.map(note => note.category))];
  const importances = ['All', 'High', 'Medium', 'Low'];

  // Filter notes based on search query, category, and importance
  const filteredNotes = decryptedNotes.filter(note => {
    const matchesSearch = 
      note.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory;
    const matchesImportance = selectedImportance === 'All' || note.importance === selectedImportance;

    return matchesSearch && matchesCategory && matchesImportance;
  });

  const getImportanceColor = (importance) => {
    switch (importance) {
      case 'High': return '#ffcdd2';
      case 'Medium': return '#fff9c4';
      case 'Low': return '#c8e6c9';
      default: return '#ffffff';
    }
  };

  if (!isUnlocked) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            borderRadius: '16px', 
            border: '2px solid #E6E6E6',
            bgcolor: '#1E1E1E'
          }}
        >
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
            <WifiOffIcon sx={{ fontSize: 48, color: '#f44336', mr: 1 }} />
            <LockIcon sx={{ fontSize: 48, color: '#E6E6E6' }} />
          </Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
            Offline Vault Locked
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            You are offline. Decrypt and access your local zero-knowledge cache in-browser. Your password is never sent over the network.
          </Typography>

          {cachedNotes.length === 0 ? (
            <Alert severity="warning" sx={{ border: '1px solid #ff9800', borderRadius: '8px', mt: 2 }}>
              No cached notes found in this browser's IndexedDB. You must log in online at least once to sync your notes locally.
            </Alert>
          ) : (
            <form onSubmit={handleUnlock}>
              <TextField
                type={showPassword ? 'text' : 'password'}
                label="Vault Password"
                variant="outlined"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isUnlocking}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={isUnlocking}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 3, border: '1px solid #f44336', borderRadius: '8px' }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="outlined"
                fullWidth
                disabled={isUnlocking}
                startIcon={isUnlocking ? <CircularProgress size={20} color="inherit" /> : <LockOpenIcon />}
                sx={{
                  py: 1.5,
                  borderWidth: 2,
                  borderRadius: 1,
                  fontWeight: 'bold',
                  borderColor: '#E6E6E6',
                  color: '#E6E6E6',
                  '&:hover': {
                    borderWidth: 2,
                    bgcolor: 'rgba(230,230,230,0.1)'
                  }
                }}
              >
                {isUnlocking ? 'Deriving AES-256 Key via PBKDF2...' : 'Unlock Vault'}
              </Button>
            </form>
          )}

          <Typography variant="caption" display="block" sx={{ mt: 4, color: 'text.secondary' }}>
            Found {cachedNotes.length} encrypted local {cachedNotes.length === 1 ? 'record' : 'records'}.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box display="flex" alignItems="center">
          <WifiOffIcon sx={{ color: '#f44336', mr: 1, fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">
            Offline Vault Browser
          </Typography>
        </Box>
        <Button 
          variant="outlined"
          onClick={handleLock}
          startIcon={<LockIcon />}
          sx={{
            borderWidth: 2,
            borderRadius: 1,
            fontWeight: 'bold',
            borderColor: '#E6E6E6',
            color: '#E6E6E6',
            '&:hover': {
              borderWidth: 2,
              bgcolor: 'rgba(230,230,230,0.1)'
            }
          }}
        >
          Lock Vault
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 4 }}>
        <TextField
          placeholder="Search decrypted notes..."
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '50px',
              border: '2px solid #E6E6E6'
            }
          }}
        />
      </Box>

      {/* Filter Chips */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Categories */}
        <Box display="flex" alignItems="center" gap={1} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
            Category:
          </Typography>
          {categories.map(category => (
            <Chip
              key={category}
              label={category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              color={selectedCategory === category ? 'primary' : 'default'}
              sx={{ borderRadius: '8px', fontWeight: 600 }}
            />
          ))}
        </Box>

        {/* Importance */}
        <Box display="flex" alignItems="center" gap={1} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '80px' }}>
            Importance:
          </Typography>
          {importances.map(importance => (
            <Chip
              key={importance}
              label={importance}
              onClick={() => setSelectedImportance(importance)}
              variant={selectedImportance === importance ? 'filled' : 'outlined'}
              color={selectedImportance === importance ? 'primary' : 'default'}
              sx={{ borderRadius: '8px', fontWeight: 600 }}
            />
          ))}
        </Box>
      </Box>

      {/* Note Grid */}
      {filteredNotes.length === 0 ? (
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mt: 8 }}>
          No notes match your filters or search query.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredNotes.map(note => (
            <Grid 
              item 
              xs={12} 
              sm={6} 
              md={4} 
              key={note._id}
              sx={{
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Card 
                onClick={() => setSelectedNote(note)}
                sx={{ 
                  height: 340, 
                  width: 300, 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  border: '2px solid #E6E6E6',
                  borderRadius: '12px',
                  bgcolor: '#1E1E1E',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translate(-4px, -4px)',
                    boxShadow: '8px 8px 0px 0px #E6E6E6',
                    borderColor: '#ffffff',
                  },
                  '&:active': {
                    transform: 'translate(0px, 0px)',
                    boxShadow: '2px 2px 0px 0px #E6E6E6',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'hidden' }}>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold"
                    sx={{ 
                      lineHeight: 1.2, 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {note.name}
                  </Typography>

                  <Box display="flex" gap={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip 
                      label={note.category} 
                      size="small" 
                      variant="outlined" 
                      sx={{ borderRadius: '6px', fontWeight: 600 }}
                    />
                    <Chip 
                      label={note.importance} 
                      size="small" 
                      sx={{ 
                        borderRadius: '6px', 
                        fontWeight: 600,
                        backgroundColor: getImportanceColor(note.importance),
                        color: '#000',
                        border: '1px solid #000'
                      }} 
                    />
                  </Box>

                  {note.type === 'text' ? (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                        mt: 1
                      }}
                    >
                      {note.content}
                    </Typography>
                  ) : (
                    <Box 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center" 
                      justifyContent="center" 
                      sx={{ 
                        flexGrow: 1, 
                        border: '2px dashed #444', 
                        borderRadius: '8px', 
                        p: 2,
                        mt: 1,
                        bgcolor: 'rgba(0,0,0,0.2)'
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        fontStyle="italic"
                        textAlign="center"
                      >
                        {note.type === 'image' ? '🖼️ Image Attachment' : '📄 File Attachment'}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.disabled"
                        textAlign="center"
                        sx={{ mt: 1 }}
                      >
                        (Requires online mode)
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Note Detail Dialog */}
      <Dialog
        open={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: { 
            borderRadius: '16px', 
            border: '2px solid #E6E6E6',
            bgcolor: '#1E1E1E'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '2px solid #E6E6E6', fontWeight: 800, pr: 6 }}>
          {selectedNote?.name}
          <Box display="flex" gap={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
            <Chip 
              label={selectedNote?.category} 
              size="small" 
              variant="outlined" 
              sx={{ borderRadius: '6px', fontWeight: 600 }}
            />
            <Chip 
              label={selectedNote?.importance} 
              size="small" 
              sx={{ 
                borderRadius: '6px', 
                fontWeight: 600,
                backgroundColor: getImportanceColor(selectedNote?.importance),
                color: '#000',
                border: '1px solid #000'
              }} 
            />
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4, wordBreak: 'break-word', minHeight: '200px' }}>
          {selectedNote?.type === 'text' ? (
            <Box sx={{ 
              fontSize: '1.1rem', 
              lineHeight: 1.6, 
              color: '#ffffff',
              '& img': { maxWidth: '100%' },
              '& pre': {
                backgroundColor: '#111',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #333',
                overflowX: 'auto',
              },
              '& code': {
                backgroundColor: '#111',
                padding: '2px 4px',
                borderRadius: '2px',
                fontFamily: 'monospace',
                fontSize: '0.9em'
              },
              '& pre code': {
                backgroundColor: 'transparent', 
                padding: 0
              },
              '& blockquote': {
                borderLeft: '6px solid #E6E6E6',
                backgroundColor: '#111',
                margin: '1.5em 0',
                padding: '16px 24px',
                fontStyle: 'italic',
                color: '#ffffff'
              }
            }}>
              <ReactMarkdown>{selectedNote?.content}</ReactMarkdown>
            </Box>
          ) : (
            <Box sx={{ border: '2px dashed #444', p: 4, borderRadius: '8px', textAlign: 'center', my: 2 }}>
              <Typography color="text.secondary" variant="body1">
                {selectedNote?.type === 'image' 
                  ? '🖼️ Image attachments are unavailable offline (requires connection to Supabase storage).' 
                  : '📄 File attachments are unavailable offline (requires connection to Supabase storage).'
                }
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid #333' }}>
          <Button 
            onClick={() => setSelectedNote(null)}
            variant="outlined"
            sx={{
              borderWidth: 2,
              borderRadius: 1,
              fontWeight: 'bold',
              borderColor: '#E6E6E6',
              color: '#E6E6E6',
              '&:hover': {
                borderWidth: 2,
                bgcolor: 'rgba(230,230,230,0.1)'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OfflineVault;
