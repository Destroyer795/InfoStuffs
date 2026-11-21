import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Container, Card, CardContent, TextField, Button, Alert, Grid, Chip,
  InputAdornment, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import SearchIcon from '@mui/icons-material/Search';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getOfflineSnapshot } from '../utils/localStore';
import { decryptVaultNotes, validateVaultMetadata } from '../utils/vaultCrypto.js';
import VaultAccessDialog from '../components/VaultAccessDialog.jsx';

const OfflineVault = () => {
  const [snapshot, setSnapshot] = useState({ userId: null, vaults: [], notes: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultName, setVaultName] = useState('');
  const [error, setError] = useState('');
  const [decryptedNotes, setDecryptedNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedImportance, setSelectedImportance] = useState('All');
  const [selectedNote, setSelectedNote] = useState(null);
  const epoch = useRef(0);
  const loadCache = useCallback(async () => {
    const sequence = epoch.current;
    setLoading(true); setLoadError('');
    try {
      const data = await getOfflineSnapshot();
      data.vaults.forEach(validateVaultMetadata);
      if (sequence === epoch.current) setSnapshot(data);
    } catch (failure) {
      if (sequence === epoch.current) setLoadError(failure.message || 'Unable to read cached encrypted vaults.');
    } finally { if (sequence === epoch.current) setLoading(false); }
  }, []);
  useEffect(() => { loadCache(); return () => { epoch.current += 1; }; }, [loadCache]);
  const handleUnlock = async (match) => {
    const sequence = epoch.current;
    const ids = new Set(match.legacyInfoIds || []);
    const encrypted = snapshot.notes.filter((note) =>
      (note.vaultId === match.metadata.id || (!note.vaultId && ids.has(note._id))) &&
      (!note.expiresAt || new Date(note.expiresAt).getTime() > Date.now()));
    const result = await decryptVaultNotes(encrypted, match.key);
    if (sequence !== epoch.current) throw new DOMException('Vault session changed.', 'AbortError');
    setDecryptedNotes(result.notes); setVaultName(match.name); setIsUnlocked(true);
    setError(result.failedCount ? `${result.failedCount} encrypted item(s) could not be verified and were kept unchanged.` : '');
  };
  const handleLock = () => {
    epoch.current += 1;
    setIsUnlocked(false); setDecryptedNotes([]); setVaultName(''); setSelectedNote(null);
    setSearchQuery(''); setSelectedCategory('All'); setSelectedImportance('All'); setError('');
  };
  // Get unique categories from decrypted notes
  const categories = ['All', ...new Set(decryptedNotes.map(note => note.category))];
  const importances = ['All', 'High', 'Medium', 'Low'];

  // Filter notes based on search query, category, and importance
  const filteredNotes = decryptedNotes.filter(note => {
    const matchesSearch = 
      note.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content || '').toLowerCase().includes(searchQuery.toLowerCase());
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
    return <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <VaultAccessDialog offline catalog={{ userId: snapshot.userId, vaults: snapshot.vaults, legacyNotes: snapshot.notes.filter((note) => !note.vaultId) }}
        loading={loading} loadError={loadError} onRetry={loadCache} onActivate={handleUnlock} />
    </Box>;
  }
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box display="flex" alignItems="center">
          <WifiOffIcon sx={{ color: '#f44336', mr: 1, fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">
            Offline: {vaultName}
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
            borderColor: 'text.primary',
            color: 'text.primary',
            '&:hover': {
              borderWidth: 2,
              bgcolor: 'action.hover'
            }
          }}
        >
          Lock Vault
        </Button>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}
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
              border: '2px solid', borderColor: 'text.primary'
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
                  border: '2px solid', borderColor: 'text.primary',
                  borderRadius: '12px',
                  bgcolor: 'background.paper',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translate(-4px, -4px)',
                    boxShadow: (theme) => '8px 8px 0px ' + theme.palette.text.primary,
                    borderColor: '#ffffff',
                  },
                  '&:active': {
                    transform: 'translate(0px, 0px)',
                    boxShadow: (theme) => '2px 2px 0px ' + theme.palette.text.primary,
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
      Props={{
          sx: { 
            borderRadius: '16px', 
            border: '2px solid', borderColor: 'text.primary',
            bgcolor: 'background.paper',
            overflowX: 'hidden',
            maxWidth: 'calc(100vw - 32px)',
            boxSizing: 'border-box'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            borderBottom: '2px solid', borderColor: 'text.primary',
            p: 2.5, 
            overflow: 'hidden',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box'
          }}
        >
          <Typography 
            variant="h6" 
            component="div"
            title={selectedNote?.name}
            sx={{ 
              fontWeight: 800, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              width: '100%',
              maxWidth: '100%',
              display: 'block',
              minWidth: 0,
              wordBreak: 'break-all',
              overflowWrap: 'anywhere'
            }}
          >
            {selectedNote?.name}
          </Typography>
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
        
        <DialogContent sx={{ p: { xs: 2, sm: 4 }, wordBreak: 'break-word', minHeight: '200px' }}>
          {selectedNote?.type === 'text' ? (
            <Box sx={{ 
              fontSize: '1.1rem', 
              lineHeight: 1.6, 
              color: '#ffffff',
              '& img': { maxWidth: '100%' },
              '& pre': {
                backgroundColor: 'background.default',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #333',
                overflowX: 'auto',
              },
              '& code': {
                backgroundColor: 'background.default',
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
                borderLeft: '6px solid', borderColor: 'text.primary',
                backgroundColor: 'background.default',
                margin: '1.5em 0',
                padding: '16px 24px',
                fontStyle: 'italic',
                color: '#ffffff'
              },
              '& table': {
                borderCollapse: 'collapse',
                width: '100%',
                margin: '1em 0',
              },
              '& th, & td': {
                border: '1px solid #444',
                padding: '8px 12px',
              },
              '& th': {
                backgroundColor: 'rgba(255,255,255,0.08)',
                fontWeight: 700,
              }
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedNote?.content}</ReactMarkdown>
            </Box>
          ) : (
            <Box sx={{ border: '2px dashed #444', p: 4, borderRadius: '8px', textAlign: 'center', my: 2 }}>
              <Typography color="text.secondary" variant="body1">
                {selectedNote?.type === 'image' 
                  ? '🖼️ Image attachments are unavailable offline (requires connection to Cloudflare R2 storage).'
                  : '📄 File attachments are unavailable offline (requires connection to Cloudflare R2 storage).'
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
              borderColor: 'text.primary',
              color: 'text.primary',
              '&:hover': {
                borderWidth: 2,
                bgcolor: 'action.hover'
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
