import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  Paper,
  Divider,
  Stack,
  Tooltip,
  useMediaQuery,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateCleanSnippet } from '../utils/snippet';
import { getDecryptedFileUrl } from '../utils/supabaseUpload';

// Icons
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';

const SecureImagePreview = ({ path, userKey, alt, sx }) => {
  const [url, setUrl] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  React.useEffect(() => {
    if (isOffline) {
      setUrl('offline');
      return;
    }
    if (!path || !userKey) return;
    let objectUrl = null;
    let isMounted = true;
    getDecryptedFileUrl(path, userKey, 'image/jpeg').then(blobUrl => {
      if (isMounted && blobUrl) {
        objectUrl = blobUrl;
        setUrl(objectUrl);
      }
    });
    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, userKey, isOffline]);

  if (isOffline || url === 'offline') {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">Image unavailable in Offline Mode</Typography>
      </Box>
    );
  }

  if (!url) {
    return (
      <Box sx={{ p: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box
        component="img"
        src={url}
        alt={alt || 'Decrypted note attachment'}
        sx={{
          maxWidth: '100%',
          maxHeight: '65vh',
          objectFit: 'contain',
          borderRadius: '10px',
          border: '2px solid',
          borderColor: 'divider',
          boxShadow: 2,
          ...sx
        }}
      />
      <Button
        variant="outlined"
        href={url}
        download={path.split('/').pop() || 'download'}
        className="cursor-hover-target"
        sx={{
          borderRadius: '8px',
          borderWidth: 2,
          '&:hover': { borderWidth: 2 }
        }}
      >
        Download Image
      </Button>
    </Box>
  );
};

const SecureFilePreview = ({ path, userKey }) => {
  const [url, setUrl] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  React.useEffect(() => {
    if (isOffline) {
      setUrl('offline');
      return;
    }
    if (!path || !userKey) return;
    let objectUrl = null;
    let isMounted = true;
    getDecryptedFileUrl(path, userKey, path.toLowerCase().includes('.pdf') ? 'application/pdf' : 'application/octet-stream').then(blobUrl => {
      if (isMounted && blobUrl) {
        objectUrl = blobUrl;
        setUrl(objectUrl);
      }
    });
    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, userKey, isOffline]);

  if (isOffline || url === 'offline') {
    return (
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">File unavailable in Offline Mode</Typography>
      </Box>
    );
  }

  if (!url) {
    return (
      <Box sx={{ p: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
      {path.toLowerCase().includes('.pdf') ? (
        <Box sx={{ width: '100%', height: { xs: '400px', sm: '600px' }, border: '2px solid', borderColor: 'divider', borderRadius: '10px', overflow: 'hidden' }}>
          <iframe 
            src={url} 
            width="100%" 
            height="100%" 
            title="PDF Preview" 
            style={{ border: 'none' }} 
          />
        </Box>
      ) : (
        <Typography variant="h6" gutterBottom>Attached Document Ready</Typography>
      )}
      <Button
        variant="outlined"
        href={url}
        download={path.split('/').pop() || 'download'}
        className="cursor-hover-target"
        sx={{
          borderRadius: '8px',
          borderWidth: 2,
          '&:hover': { borderWidth: 2 }
        }}
      >
        Download {path.toLowerCase().includes('.pdf') ? 'PDF' : 'Document'}
      </Button>
    </Box>
  );
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'image':
      return <ImageOutlinedIcon fontSize="small" />;
    case 'file':
      return <DescriptionOutlinedIcon fontSize="small" />;
    case 'text':
    default:
      return <ArticleOutlinedIcon fontSize="small" />;
  }
};

const getImportanceColor = (importance, theme) => {
  switch (importance?.toLowerCase()) {
    case 'high':
      return { bg: '#ffcdd2', text: '#b71c1c', border: '#b71c1c' };
    case 'medium':
      return { bg: '#fff9c4', text: '#f57f17', border: '#f57f17' };
    case 'low':
      return { bg: '#c8e6c9', text: '#1b5e20', border: '#1b5e20' };
    default:
      return { bg: theme.palette.action.selected, text: theme.palette.text.primary, border: theme.palette.divider };
  }
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Recent';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recent';
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatFullDateTime = (dateString) => {
  if (!dateString) return 'Date unavailable';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};



export default function SplitPaneVault({
  infos = [],
  onUpdate,
  onDelete,
  userKey,
  searchQuery = '',
  setSearchQuery
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Display real user notes strictly
  const displayList = useMemo(() => infos || [], [infos]);

  // Live 60-second ticker to automatically update relative timestamps
  const [, setClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) {
        setClock((c) => c + 1);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // By default, no note is selected
  const [selectedId, setSelectedId] = useState(null);

  // Selected Category filter
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Copy notification toast
  const [copySnack, setCopySnack] = useState(false);

  // Full popup preview modal state
  const [previewNote, setPreviewNote] = useState(null);

  // Edit dialog state
  const [editNote, setEditNote] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    importance: 'Medium',
    content: '',
    isTemporary: false
  });

  // Categories list with counts (normalized casing so "knowledge" and "Knowledge" merge into "Knowledge")
  const categories = useMemo(() => {
    const counts = { All: displayList.length };
    displayList.forEach(item => {
      const raw = (item.category || 'General').trim();
      if (!raw) return;
      const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [displayList]);

  // Filter notes by search query and category
  const filteredNotes = useMemo(() => {
    return displayList.filter(note => {
      const matchesSearch = !searchQuery || 
        note.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'All' || 
        (note.category || 'General').trim().toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [displayList, searchQuery, selectedCategory]);

  // Active note object
  const activeNote = useMemo(() => {
    return displayList.find(n => n._id === selectedId) || null;
  }, [displayList, selectedId]);

  const handleCopyContent = () => {
    if (!activeNote?.content) return;
    navigator.clipboard.writeText(activeNote.content);
    setCopySnack(true);
  };

  const handleOpenEdit = (note) => {
    setEditNote(note);
    setEditFormData({
      name: note.name || '',
      category: note.category || '',
      importance: note.importance || 'Medium',
      content: note.content || '',
      isTemporary: !!note.isTemporary
    });
  };

  const handleSaveEdit = async () => {
    if (!editNote) return;
    if (onUpdate) {
      await onUpdate(editNote._id, { ...editNote, ...editFormData });
    }
    setEditNote(null);
  };

  const handleDeleteActive = async (id) => {
    if (onDelete) {
      await onDelete(id);
    }
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  // Neobrutalist styling helpers matching theme.js
  const neoBorderStyle = `2px solid ${theme.palette.text.primary}`;
  const getNeoShadow = (offset = 4) => 
    theme.palette.mode === 'dark' 
      ? `${offset}px ${offset}px 0px 0px ${theme.palette.primary.main}`
      : `${offset}px ${offset}px 0px 0px #000000`;

  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Main Split-Pane Container */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          height: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        
        {/* LEFT COLUMN: Master Index List */}
        <Box
          sx={{
            width: { xs: '100%', md: '380px', lg: '420px' },
            minWidth: { md: '360px' },
            display: {
              xs: selectedId && isMobile ? 'none' : 'flex',
              md: 'flex'
            },
            flexDirection: 'column',
            borderRight: { md: `2px solid ${theme.palette.divider}` },
            bgcolor: theme.palette.background.default,
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Index Header: Search & Create New Button */}
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search encrypted notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={() => setSearchQuery && setSearchQuery('')}
                        className="cursor-hover-target"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    bgcolor: theme.palette.background.paper
                  }
                }}
              />
              <Button
                variant="outlined"
                onClick={() => navigate('/create')}
                className="cursor-hover-target"
                sx={{
                  minWidth: '40px',
                  width: '40px',
                  height: '40px',
                  p: 0,
                  borderRadius: '8px',
                  border: neoBorderStyle,
                  boxShadow: getNeoShadow(2),
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  '&:hover': {
                    transform: 'translate(-2px, -2px)',
                    boxShadow: getNeoShadow(4),
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  },
                  '&:active': {
                    transform: 'translate(2px, 2px)',
                    boxShadow: 'none !important',
                  }
                }}
                title="Create New Note"
              >
                <AddIcon fontSize="small" />
              </Button>
            </Box>

            {/* Category Filter Pills (Horizontal Scroll) */}
            <Box 
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              sx={{ 
                display: 'flex', 
                gap: 1, 
                overflowX: 'auto', 
                overflowY: 'hidden',
                mt: 0.75, // Shift categories down by a little bit as requested
                pt: 1,    // Generous top padding so hover lift/shadow is never cut off at the top
                pb: 0.75, // Bottom padding for scrollbar and shadow
                px: 0.5,
                scrollbarWidth: 'thin',
                scrollbarColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.2) transparent' 
                  : 'rgba(0, 0, 0, 0.2) transparent',
                '&::-webkit-scrollbar': {
                  height: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.38)' 
                      : 'rgba(0, 0, 0, 0.38)',
                  }
                }
              }}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <Chip
                    key={cat.name}
                    label={`${cat.name} (${cat.count})`}
                    size="small"
                    onClick={() => setSelectedCategory(cat.name)}
                    className="cursor-hover-target"
                    sx={{
                      cursor: 'pointer',
                      flexShrink: 0,
                      fontWeight: isSelected ? 700 : 500,
                      textTransform: 'capitalize',
                      border: isSelected ? neoBorderStyle : `1px solid ${theme.palette.divider}`,
                      bgcolor: isSelected 
                        ? theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)' 
                        : theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      boxShadow: isSelected ? getNeoShadow(2) : 'none',
                      transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      '&:hover': {
                        transform: 'translate(-1px, -1px)',
                        boxShadow: getNeoShadow(2),
                        borderColor: theme.palette.text.primary
                      },
                      '&:active': {
                        transform: 'translate(1px, 1px)',
                        boxShadow: 'none'
                      }
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Notes Scrollable Rows with custom themed scrollbar */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              overflowY: 'auto', 
              p: 1.5, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1.2,
              scrollbarWidth: 'thin',
              scrollbarColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.2) transparent' 
                : 'rgba(0, 0, 0, 0.2) transparent',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.38)' 
                    : 'rgba(0, 0, 0, 0.38)',
                }
              }
            }}
          >
            {filteredNotes.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">
                  {searchQuery || selectedCategory !== 'All' 
                    ? 'No notes match your filter.' 
                    : 'No notes in your vault yet.'}
                </Typography>
              </Box>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = selectedId === note._id;
                const impStyle = getImportanceColor(note.importance, theme);

                return (
                  <Paper
                    key={note._id}
                    onClick={() => setSelectedId(note._id)}
                    elevation={0}
                    className="cursor-hover-target"
                    sx={{
                      p: 1.75,
                      cursor: 'pointer',
                      borderRadius: '10px',
                      border: isSelected ? neoBorderStyle : `1.5px solid ${theme.palette.divider}`,
                      bgcolor: isSelected 
                        ? (theme.palette.mode === 'dark' ? '#222' : '#f0f0eb') 
                        : theme.palette.background.paper,
                      boxShadow: isSelected ? getNeoShadow(3) : 'none',
                      transition: 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.15s ease, border-color 0.15s ease',
                      '&:hover': {
                        borderColor: theme.palette.text.primary,
                        transform: 'translate(-3px, -3px)',
                        boxShadow: getNeoShadow(4)
                      },
                      '&:active': {
                        transform: 'translate(1px, 1px)',
                        boxShadow: isSelected ? getNeoShadow(1) : 'none'
                      }
                    }}
                  >
                    {/* Top row: Type Icon + Title + Timestamp */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                      <Box 
                        sx={{ 
                          p: 0.5, 
                          display: 'flex', 
                          borderRadius: '6px', 
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          color: theme.palette.text.primary
                        }}
                      >
                        {getTypeIcon(note.type)}
                      </Box>
                      
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: 700, 
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {note.name}
                        </Typography>
                      </Box>

                      <Tooltip title={formatFullDateTime(note.updatedAt || note.createdAt)} arrow placement="top">
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 500, cursor: 'default' }}
                        >
                          {formatTimeAgo(note.updatedAt || note.createdAt)}
                        </Typography>
                      </Tooltip>
                    </Box>

                    {/* Content 2-line preview sanitized from raw markdown */}
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: '0.825rem',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1.25
                      }}
                    >
                      {generateCleanSnippet(note.content, 90)}
                    </Typography>

                    {/* Bottom row: Category Chip + Importance Badge */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={note.category || 'General'}
                        size="small"
                        sx={{
                          height: '20px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          borderRadius: '4px',
                          border: `1px solid ${theme.palette.divider}`,
                          bgcolor: 'transparent',
                          textTransform: 'capitalize'
                        }}
                      />
                      <Chip
                        label={note.importance || 'Medium'}
                        size="small"
                        sx={{
                          height: '20px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          borderRadius: '4px',
                          bgcolor: impStyle.bg,
                          color: impStyle.text,
                          border: `1px solid ${impStyle.border}`
                        }}
                      />
                      {note.isTemporary && (
                        <Chip
                          label="TEMP"
                          size="small"
                          sx={{
                            height: '20px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            borderRadius: '4px',
                            bgcolor: '#ff9800',
                            color: '#000',
                            border: '1px solid #000'
                          }}
                        />
                      )}
                    </Box>
                  </Paper>
                );
              })
            )}
          </Box>
        </Box>


        {/* RIGHT COLUMN: Reading & Action Canvas */}
        <Box
          sx={{
            flexGrow: 1,
            display: {
              xs: !selectedId && isMobile ? 'none' : 'flex',
              md: 'flex'
            },
            flexDirection: 'column',
            bgcolor: theme.palette.background.paper,
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {activeNote ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              
              {/* Canvas Action Bar */}
              <Box
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderBottom: `2px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                }}
              >
                {/* Left side of header: Mobile Back Button + Note Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flexGrow: 1 }}>
                  {isMobile && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ArrowBackIcon />}
                      onClick={() => setSelectedId(null)}
                      className="cursor-hover-target"
                      sx={{
                        borderRadius: '8px',
                        border: neoBorderStyle,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        boxShadow: getNeoShadow(2),
                        transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        '&:hover': {
                          transform: 'translate(-2px, -2px)',
                          boxShadow: getNeoShadow(3)
                        },
                        '&:active': {
                          transform: 'translate(2px, 2px)',
                          boxShadow: 'none !important'
                        }
                      }}
                    >
                      List
                    </Button>
                  )}

                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 800, 
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {activeNote.name}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip 
                        label={activeNote.category || 'General'} 
                        size="small" 
                        sx={{ height: 22, fontWeight: 600, borderRadius: '4px', textTransform: 'capitalize' }} 
                      />
                      <Chip 
                        label={activeNote.importance || 'Medium'} 
                        size="small" 
                        sx={{ 
                          height: 22, 
                          fontWeight: 700, 
                          borderRadius: '4px',
                          ...getImportanceColor(activeNote.importance, theme)
                        }} 
                      />
                      <Tooltip title={formatFullDateTime(activeNote.updatedAt || activeNote.createdAt)} arrow placement="top">
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                          <AccessTimeIcon sx={{ fontSize: 13 }} />
                          Updated {formatTimeAgo(activeNote.updatedAt || activeNote.createdAt)}
                        </Typography>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>

                {/* Right side of header: Action Buttons */}
                <Stack direction="row" spacing={1.2}>
                  <Tooltip title="View in Popup">
                    <IconButton
                      size="small"
                      onClick={() => setPreviewNote(activeNote)}
                      className="cursor-hover-target"
                      sx={{
                        border: neoBorderStyle,
                        borderRadius: '8px',
                        p: 0.8,
                        boxShadow: getNeoShadow(2),
                        bgcolor: theme.palette.background.paper,
                        transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        '&:hover': { 
                          transform: 'translate(-2px, -2px)',
                          boxShadow: getNeoShadow(3),
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                        },
                        '&:active': {
                          transform: 'translate(1px, 1px)',
                          boxShadow: 'none !important'
                        }
                      }}
                    >
                      <OpenInFullIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Copy Content">
                    <IconButton
                      size="small"
                      onClick={handleCopyContent}
                      className="cursor-hover-target"
                      sx={{
                        border: neoBorderStyle,
                        borderRadius: '8px',
                        p: 0.8,
                        boxShadow: getNeoShadow(2),
                        bgcolor: theme.palette.background.paper,
                        transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        '&:hover': { 
                          transform: 'translate(-2px, -2px)',
                          boxShadow: getNeoShadow(3),
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                        },
                        '&:active': {
                          transform: 'translate(1px, 1px)',
                          boxShadow: 'none !important'
                        }
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Edit Note">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(activeNote)}
                      className="cursor-hover-target"
                      sx={{
                        border: neoBorderStyle,
                        borderRadius: '8px',
                        p: 0.8,
                        boxShadow: getNeoShadow(2),
                        bgcolor: theme.palette.background.paper,
                        transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        '&:hover': { 
                          transform: 'translate(-2px, -2px)',
                          boxShadow: getNeoShadow(3),
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                        },
                        '&:active': {
                          transform: 'translate(1px, 1px)',
                          boxShadow: 'none !important'
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete Note">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteActive(activeNote._id)}
                      className="cursor-hover-target"
                      sx={{
                        border: '2px solid #d32f2f',
                        borderRadius: '8px',
                        p: 0.8,
                        color: '#d32f2f',
                        boxShadow: theme.palette.mode === 'dark' ? '2px 2px 0px #d32f2f' : '2px 2px 0px #d32f2f',
                        bgcolor: theme.palette.background.paper,
                        transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        '&:hover': { 
                          transform: 'translate(-2px, -2px)',
                          boxShadow: theme.palette.mode === 'dark' ? '3px 3px 0px #d32f2f' : '3px 3px 0px #d32f2f',
                          bgcolor: 'rgba(211, 47, 47, 0.08)'
                        },
                        '&:active': {
                          transform: 'translate(1px, 1px)',
                          boxShadow: 'none !important'
                        }
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Canvas Scrollable Reading Body with custom themed scrollbar */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  p: { xs: 2.5, sm: 4, md: 5 },
                  maxWidth: '900px',
                  width: '100%',
                  mx: 'auto',
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                  wordBreak: 'break-word',
                  scrollbarWidth: 'thin',
                  scrollbarColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2) transparent' 
                    : 'rgba(0, 0, 0, 0.2) transparent',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.38)' 
                        : 'rgba(0, 0, 0, 0.38)',
                    }
                  },
                  '& img': { maxWidth: '100%', borderRadius: '8px', border: `2px solid ${theme.palette.divider}` },
                  '& pre': {
                    backgroundColor: theme.palette.mode === 'dark' ? '#181818' : '#f5f5f2',
                    padding: '16px',
                    borderRadius: '8px',
                    border: `2px solid ${theme.palette.divider}`,
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                  },
                  '& code': {
                    backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#e8e8e4',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.88em'
                  },
                  '& pre code': {
                    backgroundColor: 'transparent',
                    padding: 0
                  },
                  '& blockquote': {
                    borderLeft: `5px solid ${theme.palette.text.primary}`,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    margin: '1.5em 0',
                    padding: '12px 20px',
                    borderRadius: '0 8px 8px 0',
                    fontStyle: 'italic'
                  },
                  '& table': {
                    borderCollapse: 'collapse',
                    width: '100%',
                    margin: '1.5em 0',
                    border: `2px solid ${theme.palette.divider}`
                  },
                  '& th, & td': {
                    border: `1px solid ${theme.palette.divider}`,
                    padding: '10px 14px',
                    textAlign: 'left'
                  },
                  '& th': {
                    backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#eee'
                  }
                }}
              >
                {activeNote.type === 'text' && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeNote.content || '*Empty note*'}
                  </ReactMarkdown>
                )}

                {activeNote.type === 'image' && (
                  <SecureImagePreview 
                    path={activeNote.imageURL} 
                    userKey={userKey} 
                    alt={activeNote.name} 
                  />
                )}

                {activeNote.type === 'file' && (
                  <SecureFilePreview 
                    path={activeNote.file} 
                    userKey={userKey} 
                  />
                )}
              </Box>
            </Box>
          ) : (
            /* Empty State on Canvas when no note selected */
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                textAlign: 'center',
                color: 'text.secondary'
              }}
            >
              <Box
                sx={{
                  p: 3,
                  borderRadius: '50%',
                  border: `2px dashed ${theme.palette.divider}`,
                  mb: 2
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              </Box>
              <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                No Note Selected
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: '360px', mb: 3 }}>
                Choose a note from the left index to view its decrypted contents, or create a brand new encrypted record.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/create')}
                className="cursor-hover-target"
                sx={{
                  borderRadius: '8px',
                  border: neoBorderStyle,
                  boxShadow: getNeoShadow(3),
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  fontWeight: 700,
                  px: 2.5,
                  py: 1,
                  transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  '&:hover': {
                    transform: 'translate(-2px, -2px)',
                    boxShadow: getNeoShadow(5),
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                  },
                  '&:active': {
                    transform: 'translate(2px, 2px)',
                    boxShadow: 'none !important'
                  }
                }}
              >
                Create New Note
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Copy Toast */}
      <Snackbar
        open={copySnack}
        autoHideDuration={2500}
        onClose={() => setCopySnack(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: '8px', border: '2px solid #000' }}>
          Note content copied to clipboard!
        </Alert>
      </Snackbar>

      {/* Quick Edit Dialog */}
      <Dialog 
        open={!!editNote} 
        onClose={() => setEditNote(null)} 
        fullWidth 
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '12px',
            border: neoBorderStyle,
            boxShadow: getNeoShadow(6)
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: `2px solid ${theme.palette.divider}` }}>
          Edit Note (Draft UI)
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3 }}>
          <TextField
            label="Title"
            fullWidth
            value={editFormData.name}
            onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            label="Category"
            fullWidth
            value={editFormData.category}
            onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
          />
          <TextField
            label="Content (Markdown)"
            fullWidth
            multiline
            rows={6}
            value={editFormData.content}
            onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editFormData.isTemporary}
                onChange={(e) => setEditFormData(prev => ({ ...prev, isTemporary: e.target.checked }))}
              />
            }
            label="Temporary note (auto-expires in 30 days)"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
          <Button 
            variant="outlined" 
            onClick={() => setEditNote(null)}
            className="cursor-hover-target"
            sx={{
              borderRadius: '8px',
              border: neoBorderStyle,
              boxShadow: getNeoShadow(2),
              transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
              '&:hover': { transform: 'translate(-2px, -2px)', boxShadow: getNeoShadow(3) },
              '&:active': { transform: 'translate(1px, 1px)', boxShadow: 'none !important' }
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleSaveEdit}
            className="cursor-hover-target"
            sx={{
              borderRadius: '8px',
              border: neoBorderStyle,
              boxShadow: getNeoShadow(2),
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              fontWeight: 700,
              transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
              '&:hover': { 
                transform: 'translate(-2px, -2px)', 
                boxShadow: getNeoShadow(3),
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
              },
              '&:active': { transform: 'translate(1px, 1px)', boxShadow: 'none !important' }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full Content Preview Popup Modal */}
      <Dialog
        open={!!previewNote}
        onClose={() => setPreviewNote(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            border: neoBorderStyle,
            boxShadow: getNeoShadow(6),
            overflowX: 'hidden',
            maxWidth: 'calc(100vw - 32px)',
            boxSizing: 'border-box'
          }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: `2px solid ${theme.palette.divider}`,
            p: 2.5,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                lineHeight: 1.3,
                wordBreak: 'break-word'
              }}
            >
              {previewNote?.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip
                label={previewNote?.category || 'General'}
                size="small"
                sx={{ height: 22, fontWeight: 600, borderRadius: '4px', textTransform: 'capitalize' }}
              />
              <Chip
                label={previewNote?.importance || 'Medium'}
                size="small"
                sx={{
                  height: 22,
                  fontWeight: 700,
                  borderRadius: '4px',
                  ...getImportanceColor(previewNote?.importance, theme)
                }}
              />
              {previewNote?.isTemporary && (
                <Chip
                  label="TEMP"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '4px',
                    bgcolor: '#ff9800',
                    color: '#000',
                    border: '1px solid #000'
                  }}
                />
              )}
              <Tooltip title={formatFullDateTime(previewNote?.updatedAt || previewNote?.createdAt)} arrow placement="top">
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                  <AccessTimeIcon sx={{ fontSize: 13 }} />
                  Updated {formatTimeAgo(previewNote?.updatedAt || previewNote?.createdAt)}
                </Typography>
              </Tooltip>
            </Stack>
          </Box>
          <IconButton
            onClick={() => setPreviewNote(null)}
            size="small"
            className="cursor-hover-target"
            sx={{
              border: `1.5px solid ${theme.palette.divider}`,
              borderRadius: '8px',
              p: 0.75,
              '&:hover': {
                borderColor: theme.palette.text.primary,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            p: { xs: 2, sm: 4 },
            wordBreak: 'break-word',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            '& img': { maxWidth: '100%', borderRadius: '8px', border: `2px solid ${theme.palette.divider}` },
            '& pre': {
              backgroundColor: theme.palette.mode === 'dark' ? '#181818' : '#f5f5f2',
              padding: '16px',
              borderRadius: '8px',
              border: `2px solid ${theme.palette.divider}`,
              overflowX: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            },
            '& code': {
              backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#e8e8e4',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.88em'
            },
            '& pre code': {
              backgroundColor: 'transparent',
              padding: 0
            },
            '& blockquote': {
              borderLeft: `5px solid ${theme.palette.text.primary}`,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              margin: '1.5em 0',
              padding: '12px 20px',
              borderRadius: '0 8px 8px 0',
              fontStyle: 'italic'
            },
            '& table': {
              borderCollapse: 'collapse',
              width: '100%',
              margin: '1.5em 0',
              border: `2px solid ${theme.palette.divider}`
            },
            '& th, & td': {
              border: `1px solid ${theme.palette.divider}`,
              padding: '10px 14px',
              textAlign: 'left'
            },
            '& th': {
              backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#eee'
            }
          }}
        >
          {previewNote?.type === 'text' && (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {previewNote?.content || '*Empty note*'}
            </ReactMarkdown>
          )}

          {previewNote?.type === 'image' && previewNote?.imageURL && (
            <SecureImagePreview
              path={previewNote.imageURL}
              userKey={userKey}
              alt={previewNote.name}
            />
          )}

          {previewNote?.type === 'file' && previewNote?.file && (
            <SecureFilePreview
              path={previewNote.file}
              userKey={userKey}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {previewNote?.type === 'text' && previewNote?.content && (
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={() => {
                  navigator.clipboard.writeText(previewNote.content);
                  setCopySnack(true);
                }}
                className="cursor-hover-target"
                sx={{
                  borderRadius: '8px',
                  border: neoBorderStyle,
                  boxShadow: getNeoShadow(2),
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  '&:hover': {
                    transform: 'translate(-2px, -2px)',
                    boxShadow: getNeoShadow(3)
                  },
                  '&:active': { transform: 'translate(1px, 1px)', boxShadow: 'none !important' }
                }}
              >
                Copy Content
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => {
                const toEdit = previewNote;
                setPreviewNote(null);
                handleOpenEdit(toEdit);
              }}
              className="cursor-hover-target"
              sx={{
                borderRadius: '8px',
                border: neoBorderStyle,
                boxShadow: getNeoShadow(2),
                bgcolor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
                '&:hover': {
                  transform: 'translate(-2px, -2px)',
                  boxShadow: getNeoShadow(3)
                },
                '&:active': { transform: 'translate(1px, 1px)', boxShadow: 'none !important' }
              }}
            >
              Edit
            </Button>
          </Box>

          <Button
            onClick={() => setPreviewNote(null)}
            variant="outlined"
            className="cursor-hover-target"
            sx={{
              borderRadius: '8px',
              border: neoBorderStyle,
              boxShadow: getNeoShadow(2),
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              fontWeight: 700,
              px: 3,
              transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
              '&:hover': {
                transform: 'translate(-2px, -2px)',
                boxShadow: getNeoShadow(3)
              },
              '&:active': { transform: 'translate(1px, 1px)', boxShadow: 'none !important' }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
