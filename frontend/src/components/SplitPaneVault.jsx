import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateCleanSnippet, formatExpirationLabel, calculateExpirationDate, parseExistingRetention, validateRetentionConfig } from '../utils/snippet';
import { 
  uploadToSupabase, 
  deleteFromSupabase, 
  getDecryptedFileUrl, 
  createOpaqueStoragePath 
} from '../utils/supabaseUpload';
import MarkdownInput from './MarkdownInput';
import TemporaryRetentionSelector from './TemporaryRetentionSelector';
import CustomScrollbar from './CustomScrollbar';

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
import UploadFileIcon from '@mui/icons-material/UploadFile';

const SecureImagePreview = ({ path, userKey, alt, sx }) => {
  const theme = useTheme();
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
          border: `2px solid ${theme.palette.text.primary}`,
          boxShadow: 'none',
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          transition: 'all 0.1s ease-in-out',
          '&:hover': {
            boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
            transform: 'translate(-1px, -1px)',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
          },
          '&:active': {
            boxShadow: 'none !important',
            transform: 'translate(1px, 1px)'
          }
        }}
      >
        Download Image
      </Button>
    </Box>
  );
};

const SecureFilePreview = ({ path, userKey }) => {
  const theme = useTheme();
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
          border: `2px solid ${theme.palette.text.primary}`,
          boxShadow: 'none',
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          transition: 'all 0.1s ease-in-out',
          '&:hover': {
            boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
            transform: 'translate(-1px, -1px)',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
          },
          '&:active': {
            boxShadow: 'none !important',
            transform: 'translate(1px, 1px)'
          }
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
  allInfos,
  onUpdate,
  onDelete,
  userKey,
  searchQuery = '',
  setSearchQuery
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // displayList receives centralized filteredInfos from App
  const displayList = useMemo(() => infos || [], [infos]);
  const fullList = useMemo(() => (allInfos && allInfos.length ? allInfos : displayList), [allInfos, displayList]);

  const notesListRef = useRef(null);
  const canvasScrollRef = useRef(null);
  const categoriesScrollRef = useRef(null);

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

  // Unified snackbar toast
  const [snack, setSnack] = useState({
    open: false,
    type: 'success',
    message: ''
  });

  const showSnack = (type, message) => {
    setSnack({ open: false, type, message });
    setTimeout(() => {
      setSnack({ open: true, type, message });
    }, 10);
  };

  // Full popup preview modal state
  const [previewNote, setPreviewNote] = useState(null);

  // Edit dialog state
  const [editNote, setEditNote] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    importance: 'Medium',
    content: '',
    type: 'text',
    imageURL: '',
    file: '',
    isTemporary: false,
    retentionConfig: {
      preset: 30,
      customMode: 'duration',
      days: 0,
      hours: 1,
      minutes: 0,
      specificDate: ''
    }
  });
  const [newFileData, setNewFileData] = useState({
    imageFile: null,
    docFile: null
  });
  const [isSaving, setIsSaving] = useState(false);

  // Categories list with counts (normalized casing so "knowledge" and "Knowledge" merge into "Knowledge")
  const categories = useMemo(() => {
    const counts = { All: fullList.length };
    fullList.forEach(item => {
      const raw = (item.category || 'General').trim();
      if (!raw) return;
      const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [fullList]);

  // Filter notes by category (search query filtering is already centralized in displayList)
  const filteredNotes = useMemo(() => {
    return displayList.filter(note => {
      const matchesCat = selectedCategory === 'All' || 
        (note.category || 'General').trim().toLowerCase() === selectedCategory.toLowerCase();

      return matchesCat;
    });
  }, [displayList, selectedCategory]);

  // Active note object
  const activeNote = useMemo(() => {
    return fullList.find(n => n._id === selectedId) || null;
  }, [fullList, selectedId]);

  const getRelativePathFromUrl = (url) => {
    if (typeof url !== 'string') return null;
    if (!url.includes('http')) return url;
    const mainUrlPart = url.split('?')[0]; 
    const parts = mainUrlPart.split('/infostuffsende/');
    return parts?.[1] || null;
  };

  const handleFileUpdate = (e) => {
    if (!e.target.files.length) return;
    const file = e.target.files[0];
    if (editFormData.type === 'image') {
      setNewFileData(prev => ({ ...prev, imageFile: file }));
    } else if (editFormData.type === 'file') {
      setNewFileData(prev => ({ ...prev, docFile: file }));
    }
  };

  const handleFileSubmit = async () => {
    let newImageUrl = editFormData.imageURL;
    let newFileUrl = editFormData.file;

    try {
      if (editNote?.type === 'image' && editFormData.type !== 'image') {
        const oldImagePath = getRelativePathFromUrl(editNote.imageURL);
        if (oldImagePath) await deleteFromSupabase(oldImagePath);
        newImageUrl = '';
      }
      if (editNote?.type === 'file' && editFormData.type !== 'file') {
        const oldFilePath = getRelativePathFromUrl(editNote.file);
        if (oldFilePath) await deleteFromSupabase(oldFilePath);
        newFileUrl = ''; 
      }

      if (editFormData.type === 'image' && newFileData.imageFile) {
        const oldImagePath = getRelativePathFromUrl(editNote?.imageURL);
        if (oldImagePath) await deleteFromSupabase(oldImagePath);
        const storagePath = createOpaqueStoragePath(newFileData.imageFile, 'images');
        newImageUrl = await uploadToSupabase(newFileData.imageFile, storagePath, userKey);
        if (!newImageUrl) throw new Error("Image encryption or upload failed");
      }

      if (editFormData.type === 'file' && newFileData.docFile) {
        const oldFilePath = getRelativePathFromUrl(editNote?.file);
        if (oldFilePath) await deleteFromSupabase(oldFilePath);
        const storagePath = createOpaqueStoragePath(newFileData.docFile, 'documents');
        newFileUrl = await uploadToSupabase(newFileData.docFile, storagePath, userKey);
        if (!newFileUrl) throw new Error("Document encryption or upload failed");
      }

      if (editFormData.type === 'text') {
        newImageUrl = '';
        newFileUrl = '';
      }

      return { imageURL: newImageUrl, file: newFileUrl };
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  };

  const handleCopyContent = () => {
    if (!activeNote?.content) return;
    navigator.clipboard.writeText(activeNote.content);
    showSnack('success', 'Note content copied to clipboard!');
  };

  const handleOpenEdit = (note) => {
    setEditNote(note);
    const parsed = parseExistingRetention(note.expiresAt, note.createdAt);
    setEditFormData({
      name: note.name || '',
      category: note.category || '',
      importance: note.importance || 'Medium',
      content: note.content || '',
      type: note.type || 'text',
      imageURL: note.imageURL || '',
      file: note.file || '',
      isTemporary: !!note.isTemporary,
      retentionConfig: parsed,
      _initialRetentionConfig: JSON.stringify(parsed)
    });
    setNewFileData({ imageFile: null, docFile: null });
  };

  const handleEditClose = () => {
    setEditNote(null);
    setNewFileData({ imageFile: null, docFile: null });
  };

  const handleEditTypeChange = (e) => {
    const newType = e.target.value;
    setEditFormData(prev => ({
      ...prev,
      type: newType,
      content: newType === 'text' ? prev.content : '',
    }));
  };

  const handleSaveEdit = async () => {
    if (!onUpdate || !editNote) return;

    const isTempChanged = (editFormData.isTemporary || false) !== (editNote.isTemporary || false);
    const isRetentionChanged = editFormData.isTemporary && (
      JSON.stringify(editFormData.retentionConfig) !== editFormData._initialRetentionConfig
    );

    const noChanges = 
      editFormData.name === editNote.name &&
      editFormData.category === editNote.category &&
      editFormData.importance === editNote.importance &&
      editFormData.content === editNote.content &&
      editFormData.type === editNote.type &&
      !isTempChanged &&
      !isRetentionChanged;
      
    const hasNewFiles = newFileData.imageFile !== null || newFileData.docFile !== null;
    
    if (noChanges && !hasNewFiles) {
      showSnack("info", "Nothing modified");
      handleEditClose();
      return;
    }

    try {
      setIsSaving(true);
      const { imageURL, file } = await handleFileSubmit();
      
      let expiresAt = null;
      if (editFormData.isTemporary) {
        if (!isRetentionChanged && editNote.expiresAt) {
          expiresAt = editNote.expiresAt;
        } else {
          const validation = validateRetentionConfig(true, editFormData.retentionConfig);
          if (!validation.isValid) {
            showSnack("error", validation.error);
            setIsSaving(false);
            return;
          }
          expiresAt = validation.expiresAt;
        }
      }

      const {
        _initialRetentionConfig,
        retentionConfig,
        ...cleanedFormData
      } = editFormData;
      const updatedData = { ...cleanedFormData, imageURL, file, expiresAt };
      await onUpdate(editNote._id, updatedData);

      if (previewNote && previewNote._id === editNote._id) {
        setPreviewNote({ ...editNote, ...updatedData });
      }
      showSnack("success", "Card updated successfully");
      handleEditClose();
    } catch (error) {
      showSnack("error", "Card update failed: " + (error?.message || 'Upload error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActive = async (id) => {
    const toDelete = fullList.find(n => n._id === id);
    try {
      if (toDelete?.imageURL) {
        const imagePath = getRelativePathFromUrl(toDelete.imageURL);
        if (imagePath) await deleteFromSupabase(imagePath);
      }
      if (toDelete?.file) {
        const filePath = getRelativePathFromUrl(toDelete.file);
        if (filePath) await deleteFromSupabase(filePath);
      }
      if (onDelete) {
        await onDelete(id);
      }
      if (selectedId === id) {
        setSelectedId(null);
      }
      if (previewNote?._id === id) {
        setPreviewNote(null);
      }
      showSnack("success", "Deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      showSnack("error", "Delete failed");
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
                  border: `2px solid ${theme.palette.text.primary}`,
                  boxShadow: 'none',
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.1s ease-in-out',
                  '&:hover': {
                    transform: 'translate(-1px, -1px)',
                    boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  },
                  '&:active': {
                    transform: 'translate(1px, 1px)',
                    boxShadow: 'none !important',
                  }
                }}
                title="Create New Note"
              >
                <AddIcon fontSize="small" />
              </Button>
            </Box>

            {/* Category Filter Pills (Horizontal Scroll with Custom Scrollbar) */}
            <Box sx={{ position: 'relative', mt: 0.75, pb: 0.75 }}>
              <Box 
                ref={categoriesScrollRef}
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
                  pt: 0.5,
                  pb: 0.75,
                  px: 0.5,
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': {
                    display: 'none',
                    width: 0,
                    height: 0,
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
              <CustomScrollbar 
                targetRef={categoriesScrollRef} 
                horizontal={true} 
                watch={categories.length} 
              />
            </Box>
          </Box>

          {/* Notes Scrollable Container with Custom Monochromatic Scrollbar */}
          <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box 
              ref={notesListRef}
              sx={{ 
                flexGrow: 1, 
                overflowY: 'auto', 
                pl: 1.5,
                pt: 1.5,
                pb: 1.5,
                pr: 3, // Generous 24px right padding so cards have a clear, distinct gap from the scrollbar
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1.2
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
                        <Tooltip title={formatExpirationLabel(note.expiresAt, note.createdAt)} arrow placement="top">
                          <Chip
                            label={formatExpirationLabel(note.expiresAt, note.createdAt)}
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
                        </Tooltip>
                      )}
                    </Box>
                  </Paper>
                );
              })
            )}
            </Box>
            <CustomScrollbar targetRef={notesListRef} watch={filteredNotes.length} />
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
                        border: `2px solid ${theme.palette.text.primary}`,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        boxShadow: 'none',
                        bgcolor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        transition: 'all 0.1s ease-in-out',
                        '&:hover': {
                          transform: 'translate(-1px, -1px)',
                          boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                        },
                        '&:active': {
                          transform: 'translate(1px, 1px)',
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
                      {activeNote.isTemporary && (
                        <Tooltip title={formatExpirationLabel(activeNote.expiresAt, activeNote.createdAt)} arrow placement="top">
                          <Chip 
                            label={formatExpirationLabel(activeNote.expiresAt, activeNote.createdAt)} 
                            size="small" 
                            sx={{ 
                              height: 22, 
                              fontWeight: 800, 
                              borderRadius: '4px',
                              bgcolor: '#ff9800',
                              color: '#000',
                              border: '1px solid #000'
                            }} 
                          />
                        </Tooltip>
                      )}
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
                        border: `2px solid ${theme.palette.text.primary}`,
                        borderRadius: '8px',
                        p: 0.8,
                        boxShadow: 'none',
                        bgcolor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        transition: 'all 0.1s ease-in-out',
                        '&:hover': { 
                          transform: 'translate(-1px, -1px)',
                          boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
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
                        border: `2px solid ${theme.palette.text.primary}`,
                        borderRadius: '8px',
                        p: 0.8,
                        boxShadow: 'none',
                        bgcolor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        transition: 'all 0.1s ease-in-out',
                        '&:hover': { 
                          transform: 'translate(-1px, -1px)',
                          boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
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
                        border: `2px solid ${theme.palette.text.primary}`,
                        borderRadius: '8px',
                        p: 0.8,
                        boxShadow: 'none',
                        bgcolor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        transition: 'all 0.1s ease-in-out',
                        '&:hover': { 
                          transform: 'translate(-1px, -1px)',
                          boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
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
                        boxShadow: 'none',
                        bgcolor: theme.palette.background.paper,
                        transition: 'all 0.1s ease-in-out',
                        '&:hover': { 
                          transform: 'translate(-1px, -1px)',
                          boxShadow: '2px 2px 0px #d32f2f',
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

              {/* Canvas Scrollable Container with Custom Monochromatic Scrollbar */}
              <Box sx={{ position: 'relative', flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box
                  ref={canvasScrollRef}
                  sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: { xs: 2.5, sm: 4, md: 5 },
                    pr: { xs: 3.5, sm: 5, md: 6 }, // Generous right padding creating clear space before scrollbar
                    maxWidth: '900px',
                    width: '100%',
                    mx: 'auto',
                    fontSize: '1.05rem',
                    lineHeight: 1.7,
                    wordBreak: 'break-word',
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
                <CustomScrollbar targetRef={canvasScrollRef} watch={selectedId} />
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
                  border: `2px solid ${theme.palette.text.primary}`,
                  boxShadow: 'none',
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  fontWeight: 700,
                  px: 2.5,
                  py: 1,
                  transition: 'all 0.1s ease-in-out',
                  '&:hover': {
                    transform: 'translate(-1px, -1px)',
                    boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                  },
                  '&:active': {
                    transform: 'translate(1px, 1px)',
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

      {/* Toast Notification */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnack(prev => ({ ...prev, open: false }))} 
          severity={snack.type} 
          variant="filled"
          sx={{ 
            borderRadius: '8px', 
            border: '2px solid #000', 
            boxShadow: '4px 4px 0px #000', 
            fontWeight: 'bold' 
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>

      {/* Edit Info Dialog */}
      <Dialog 
        open={!!editNote} 
        onClose={handleEditClose} 
        fullWidth 
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            border: neoBorderStyle,
            boxShadow: getNeoShadow(6),
            overflowX: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: `2px solid ${theme.palette.divider}`, p: 2.5 }}>
          Edit Info
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: { xs: 2, sm: 3 } }}>
          <TextField
            label="Name"
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

          <FormControl fullWidth>
            <InputLabel id="edit-importance-label">Importance</InputLabel>
            <Select
              labelId="edit-importance-label"
              value={['High', 'Medium', 'Low'].includes(editFormData.importance) ? editFormData.importance : (editFormData.importance || 'Medium')}
              label="Importance"
              onChange={(e) => setEditFormData(prev => ({ ...prev, importance: e.target.value }))}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              {editFormData.importance && !['High', 'Medium', 'Low'].includes(editFormData.importance) && (
                <MenuItem value={editFormData.importance}>{editFormData.importance}</MenuItem>
              )}
            </Select>
          </FormControl>

          <TemporaryRetentionSelector
            isTemporary={editFormData.isTemporary}
            onToggleTemporary={(val) => setEditFormData(prev => ({ ...prev, isTemporary: val }))}
            config={editFormData.retentionConfig}
            onChangeConfig={(newConfig) => setEditFormData(prev => ({ ...prev, retentionConfig: newConfig }))}
          />

          <FormControl fullWidth className="cursor-hover-target">
            <InputLabel id="edit-content-type-label">Content Type</InputLabel>
            <Select
              labelId="edit-content-type-label"
              value={editFormData.type || 'text'}
              label="Content Type"
              onChange={handleEditTypeChange}
            >
              <MenuItem value="text" className="cursor-hover-target">Text</MenuItem>
              <MenuItem value="image" className="cursor-hover-target">Image</MenuItem>
              <MenuItem value="file" className="cursor-hover-target">File</MenuItem>
            </Select>
          </FormControl>
          
          {editFormData.type === 'text' && (
            <MarkdownInput
              value={editFormData.content}
              onChange={(val) => setEditFormData(prev => ({ ...prev, content: val }))}
              placeholder="Edit your content..."
            />
          )}

          {(editFormData.type === 'image' || editFormData.type === 'file') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<UploadFileIcon />}
                className="cursor-hover-target"
                sx={{
                  height: '60px',
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  borderColor: theme.palette.divider,
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  '&:hover': {
                    borderStyle: 'dashed',
                    borderWidth: '2px',
                    borderColor: theme.palette.primary.main,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                  }
                }}
              >
                {editFormData.type === 'image'
                  ? (newFileData.imageFile 
                      ? `Selected: ${newFileData.imageFile.name}` 
                      : (editFormData.imageURL ? "Replace Current Encrypted Image" : "Upload New Image"))
                  : (newFileData.docFile 
                      ? `Selected: ${newFileData.docFile.name}` 
                      : (editFormData.file ? "Replace Current Encrypted Document" : "Upload New File"))}
                <input
                  type="file"
                  hidden
                  accept={editFormData.type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xlsx'}
                  onChange={handleFileUpdate}
                />
              </Button>
              {editFormData.type === 'image' && editFormData.imageURL && !newFileData.imageFile && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                  Current image: {editFormData.imageURL.split('?')[0].split('/').pop()}
                </Typography>
              )}
              {editFormData.type === 'file' && editFormData.file && !newFileData.docFile && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                  Current attachment: {editFormData.file.split('?')[0].split('/').pop()}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, gap: 1 }}>
          <Button 
            onClick={handleEditClose} 
            variant="outlined"
            className="cursor-hover-target"
            disabled={isSaving}
            sx={{
              fontWeight: 700,
              borderRadius: '8px',
              border: '2px solid #d32f2f !important',
              color: '#d32f2f',
              bgcolor: theme.palette.background.paper,
              boxShadow: 'none',
              transition: 'all 0.1s ease-in-out',
              '&:hover': {
                bgcolor: 'rgba(211, 47, 47, 0.08)',
                border: '2px solid #d32f2f !important',
                boxShadow: '2px 2px 0px #d32f2f',
                transform: 'translate(-1px, -1px)'
              },
              '&:active': {
                boxShadow: 'none !important',
                transform: 'translate(1px, 1px) !important'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleSaveEdit}
            disabled={isSaving}
            className="cursor-hover-target"
            sx={{
              borderRadius: '8px',
              border: `2px solid ${theme.palette.text.primary}`,
              boxShadow: 'none',
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              fontWeight: 700,
              px: 2.5,
              transition: 'all 0.1s ease-in-out',
              '&:hover': {
                transform: isSaving ? 'none' : 'translate(-1px, -1px)',
                boxShadow: isSaving ? 'none' : `2px 2px 0px ${theme.palette.text.primary}`,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
              },
              '&:active': { transform: 'translate(1px, 1px) !important', boxShadow: 'none !important' }
            }}
          >
            {isSaving ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} color="inherit" />
                <span>Saving...</span>
              </Box>
            ) : (
              'Save Changes'
            )}
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
                <Tooltip title={formatExpirationLabel(previewNote?.expiresAt, previewNote?.createdAt)} arrow placement="top">
                  <Chip
                    label={formatExpirationLabel(previewNote?.expiresAt, previewNote?.createdAt)}
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
                </Tooltip>
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
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: '8px',
              p: 0.75,
              boxShadow: 'none',
              transition: 'all 0.1s ease-in-out',
              '&:hover': {
                borderColor: theme.palette.text.primary,
                boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
                transform: 'translate(-1px, -1px)',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
              },
              '&:active': {
                boxShadow: 'none !important',
                transform: 'translate(1px, 1px)'
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
                  showSnack('success', 'Note content copied to clipboard!');
                }}
                className="cursor-hover-target"
                sx={{
                  borderRadius: '8px',
                  border: `2px solid ${theme.palette.text.primary}`,
                  boxShadow: 'none',
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  transition: 'all 0.1s ease-in-out',
                  '&:hover': {
                    transform: 'translate(-1px, -1px)',
                    boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
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
                border: `2px solid ${theme.palette.text.primary}`,
                boxShadow: 'none',
                bgcolor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                transition: 'all 0.1s ease-in-out',
                '&:hover': {
                  transform: 'translate(-1px, -1px)',
                  boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
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
              border: `2px solid ${theme.palette.text.primary}`,
              boxShadow: 'none',
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              fontWeight: 700,
              px: 3,
              transition: 'all 0.1s ease-in-out',
              '&:hover': {
                transform: 'translate(-1px, -1px)',
                boxShadow: `2px 2px 0px ${theme.palette.text.primary}`,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
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
