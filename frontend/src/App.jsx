import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { 
  useAuth, 
  useUser, 
  SignedOut, 
  AuthenticateWithRedirectCallback
} from '@clerk/clerk-react';
import axios from 'axios';
import {
  Box,
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Typography,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import NavBar from './components/NavBar.jsx';
import CustomCursor from './components/Cursor.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import { encryptText, decryptText, generateKeyFromPassword } from './utils/encryption';
import { getSignedUrl } from './utils/supabaseUpload';
import EncryptionWorker from './utils/worker?worker'; 
import { lightTheme, darkTheme } from './theme';
import config from './config';
import { saveOfflineNotes, getOfflineNotes } from './utils/localStore';

const InfoGrid = lazy(() => import('./components/InfoGrid.jsx'));
const Create = lazy(() => import('./pages/Create.jsx'));
const UpdateProf = lazy(() => import('./pages/UpdateProf.jsx').then(module => ({ default: module.UpdateProf })));

const LoadingScreen = ({ darkMode }) => (
  <Backdrop
    open
    sx={{
      zIndex: (theme) => theme.zIndex.drawer + 1,
      backgroundColor: darkMode ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
      flexDirection: 'column',
      gap: 2
    }}
  >
    <CircularProgress
      size={60}
      thickness={4}
      sx={{ color: darkMode ? '#90caf9' : '#1976d2' }}
    />
    <Typography variant="h6" sx={{ color: darkMode ? '#fff' : '#000', fontWeight: 500 }}>
      Loading...
    </Typography>
  </Backdrop>
);

const VaultModal = ({ open, onUnlock, onReset, darkMode }) => {
  const [password, setPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password) onUnlock(password);
  };

  const handleResetConfirm = () => {
    onReset();
    setShowConfirm(false);
    setPassword('');
  };

  const btnStyle = {
    borderWidth: 2,
    borderRadius: 1,
    textTransform: 'none',
    fontWeight: 600,
    '&:hover': { borderWidth: 2 }
  };

  if (showConfirm) {
    return (
      <Dialog 
        open={true} 
        PaperProps={{ 
          sx: { 
            bgcolor: darkMode ? '#1e1e1e' : '#fff', 
            color: darkMode ? '#fff' : '#000',
            border: '2px solid #d32f2f'
          } 
        }}
      >
        <DialogTitle sx={{ color: '#d32f2f', fontWeight: 'bold' }}>⚠️ EMERGENCY RESET</DialogTitle>
        <DialogContent>
          <Typography color={darkMode ? '#ccc' : '#000'}>
            Since you lost your password, your data is unrecoverable.
            <br /><br />
            This action will <b>PERMANENTLY DELETE ALL YOUR INFORMATIONS</b> so you can start fresh with a new password.
            <br /><br />
            Are you sure you want to do this?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setShowConfirm(false)} 
            variant="outlined"
            sx={{ ...btnStyle, color: darkMode ? '#fff' : '#000', borderColor: darkMode ? '#555' : '#ccc' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleResetConfirm} 
            color="error" 
            variant="outlined"
            sx={btnStyle}
          >
            Yes, Delete Everything
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      disableEscapeKeyDown
      PaperProps={{
        sx: { 
          bgcolor: darkMode ? '#1e1e1e' : '#fff', 
          color: darkMode ? '#fff' : '#000'
        }
      }}
    >
      <DialogTitle>Unlock Your Vault</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: darkMode ? '#ccc' : '#666' }}>
          Enter your secure password to decrypt your notes.
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            autoFocus
            margin="dense"
            label="Vault Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputLabelProps={{ style: { color: darkMode ? '#aaa' : undefined } }}
            InputProps={{ 
              style: { color: darkMode ? '#fff' : undefined },
              sx: { '& .MuiOutlinedInput-notchedOutline': { borderColor: darkMode ? '#555' : undefined } }
            }}
          />
        </form>
      </DialogContent>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 1.5, 
        px: 3, 
        pb: 3, 
        alignItems: 'stretch' 
      }}>
        <Button 
          color="error" 
          variant="outlined"
          onClick={() => setShowConfirm(true)}
          sx={{ ...btnStyle, height: '100%', m: 0 }}
        >
          Forgot Password?
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!password} 
          variant="outlined"
          sx={{ ...btnStyle, height: '100%', m: 0 }}
        >
          Unlock
        </Button>
      </Box>
    </Dialog>
  );
};

const App = () => {
  const [infos, setInfos] = useState([]);
  // 1. Initialize from LocalStorage (or check system preference)
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Fallback: Check if the user's OS is set to Dark Mode
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const API_BASE_URL = config.API_BASE_URL;

  const { getToken, isLoaded: authLoaded } = useAuth();
  const { user, isSignedIn, isLoaded: userLoaded } = useUser();

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const filteredInfos = useMemo(() => {
    if (!searchQuery) return infos;
    return infos.filter(
      (info) =>
        info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        info.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [infos, searchQuery]);

  const handleUnlock = (password) => {
    if (user?.id) {
      setIsUnlocking(true); // Show loader immediately

      // Spawn the worker
      const worker = new EncryptionWorker();

      // Send data to background thread
      worker.postMessage({ password, salt: user.id });

      // Listen for the result
      worker.onmessage = (e) => {
        const { success, key, error } = e.data;
        
        if (success) {
          setEncryptionKey(key);
        } else {
          console.error("Encryption failed:", error);
        }
        
        setIsUnlocking(false); // Hide loader
        worker.terminate(); // Clean up the worker
      };

      // Handle worker errors
      worker.onerror = (err) => {
        console.error("Worker error:", err);
        setIsUnlocking(false);
        worker.terminate();
      };
    }
  };

  const handleVaultReset = async () => {
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/api/info/nuke`, { headers });
      
      setInfos([]); 
      setEncryptionKey(null); 
      setSnackbar({ open: true, message: "Vault has been reset. You can now use a new password.", severity: 'success' });
    } catch (err) {
      console.error("Reset failed", err);
      setSnackbar({ open: true, message: "Failed to reset vault.", severity: 'error' });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar({ ...snackbar, open: false });
  };

  const getAuthHeaders = async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchInfos = async () => {
    if (!isSignedIn || !encryptionKey) return;

    setIsLoading(true);
    setError(null);

    // 1. OFFLINE BOOT: If no internet, read from IndexedDB
    if (!navigator.onLine) {
      console.log("Network offline: Booting from Zero-Knowledge Local Cache...");
      try {
        const cachedNotes = await getOfflineNotes();
        
        // Decrypt cached notes
        const decryptedPromises = (cachedNotes || []).map(async (item) => {
          const decryptedName = await decryptText(item.name, encryptionKey);
          const decryptedCategory = await decryptText(item.category, encryptionKey);
          
          const decryptedContent = item.type === 'text' 
            ? await decryptText(item.content, encryptionKey) 
            : item.content;

          let realImageUrl = item.imageURL;
          let realFileUrl = item.file;

          if (item.type === 'image' && item.imageURL) {
              realImageUrl = await decryptText(item.imageURL, encryptionKey);
          }

          if (item.type === 'file' && item.file) {
              realFileUrl = await decryptText(item.file, encryptionKey);
          }

          return {
            ...item,
            name: decryptedName,
            category: decryptedCategory,
            content: decryptedContent,
            imageURL: realImageUrl,
            file: realFileUrl
          };
        });

        const decrypted = (await Promise.all(decryptedPromises))
          .filter(item => item.name && item.name.length > 0);
        
        setInfos(decrypted);
      } catch (err) {
        console.error('Failed to retrieve offline notes:', err);
        setInfos([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. ONLINE SYNC: Fetch from backend normally
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/info`, { headers });
      const rawNotes = res.data.data || [];
      
      // 3. THE ZKA CACHE: Save the raw ciphertext BEFORE decryption (background process)
      saveOfflineNotes(rawNotes).catch(err => console.error("Cache write failed:", err));
      
      const decryptedPromises = rawNotes.map(async (item) => {
        const decryptedName = await decryptText(item.name, encryptionKey);
        const decryptedCategory = await decryptText(item.category, encryptionKey);
        
        const decryptedContent = item.type === 'text' 
          ? await decryptText(item.content, encryptionKey) 
          : item.content;

        let realImageUrl = item.imageURL;
        let realFileUrl = item.file;

        if (item.type === 'image' && item.imageURL) {
            realImageUrl = await decryptText(item.imageURL, encryptionKey);
        }

        if (item.type === 'file' && item.file) {
            realFileUrl = await decryptText(item.file, encryptionKey);
        }

        return {
          ...item,
          name: decryptedName,
          category: decryptedCategory,
          content: decryptedContent,
          imageURL: realImageUrl,
          file: realFileUrl
        };
      });

      const decrypted = (await Promise.all(decryptedPromises))
        .filter(item => item.name && item.name.length > 0);

      setInfos(decrypted);
    } catch (err) {
      console.error('Failed to fetch from backend', err);
      
      // Fallback in case Render is down but the device thinks it's online
      try {
        const cachedNotes = await getOfflineNotes();
        
        const decryptedPromises = (cachedNotes || []).map(async (item) => {
          const decryptedName = await decryptText(item.name, encryptionKey);
          const decryptedCategory = await decryptText(item.category, encryptionKey);
          
          const decryptedContent = item.type === 'text' 
            ? await decryptText(item.content, encryptionKey) 
            : item.content;

          let realImageUrl = item.imageURL;
          let realFileUrl = item.file;

          if (item.type === 'image' && item.imageURL) {
              realImageUrl = await decryptText(item.imageURL, encryptionKey);
          }

          if (item.type === 'file' && item.file) {
              realFileUrl = await decryptText(item.file, encryptionKey);
          }

          return {
            ...item,
            name: decryptedName,
            category: decryptedCategory,
            content: decryptedContent,
            imageURL: realImageUrl,
            file: realFileUrl
          };
        });

        const decrypted = (await Promise.all(decryptedPromises))
          .filter(item => item.name && item.name.length > 0);
        
        setInfos(decrypted);
      } catch (cacheErr) {
        console.error('Failed to retrieve offline cache:', cacheErr);
        setError('Failed to load your content.');
        setInfos([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('appTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (authLoaded && userLoaded && isSignedIn && encryptionKey) {
      fetchInfos();
    } else if (authLoaded && userLoaded && !isSignedIn) {
      setIsLoading(false);
      setEncryptionKey(null);
    }
  }, [authLoaded, userLoaded, isSignedIn, encryptionKey]);

  const handleCreate = async (newData) => {
    if (!encryptionKey) return;
    const headers = await getAuthHeaders();
    
    const encryptedData = { 
      ...newData, 
      name: await encryptText(newData.name, encryptionKey),
      category: await encryptText(newData.category, encryptionKey),
      content: newData.type === 'text' ? await encryptText(newData.content, encryptionKey) : newData.content,
      imageURL: newData.imageURL ? await encryptText(newData.imageURL, encryptionKey) : '',
      file: newData.file ? await encryptText(newData.file, encryptionKey) : '',
      isTemporary: newData.isTemporary || false
    };

    const res = await axios.post(`${API_BASE_URL}/api/info`, encryptedData, { headers });
    const newInfo = res.data.data;
    
    // the imageURL/file is already the unencrypted path here 
    // so we can just pass them as the true paths.
    const decryptedNewInfo = {
      ...newInfo,
      name: newData.name,
      category: newData.category,
      content: newData.type === 'text' ? newData.content : '',
      imageURL: newData.imageURL || '',
      file: newData.file || ''
    };
    setInfos((prev) => [decryptedNewInfo, ...prev]);
  };

  const handleUpdate = async (id, updatedData) => {
    if (!encryptionKey) return;
    const headers = await getAuthHeaders();

    const encryptedData = { 
      ...updatedData, 
      name: await encryptText(updatedData.name, encryptionKey),
      category: await encryptText(updatedData.category, encryptionKey),
      content: updatedData.type === 'text' ? await encryptText(updatedData.content, encryptionKey) : updatedData.content,
      imageURL: updatedData.imageURL ? await encryptText(updatedData.imageURL, encryptionKey) : '',
      file: updatedData.file ? await encryptText(updatedData.file, encryptionKey) : '',
      isTemporary: updatedData.isTemporary || false
    };
    
    const response = await axios.patch(`${API_BASE_URL}/api/info/${id}`, encryptedData, { headers });
    
    const updated = { 
      ...response.data.data, 
      name: updatedData.name,
      category: updatedData.category,
      content: updatedData.type === 'text' ? updatedData.content : '',
      imageURL: updatedData.imageURL || '',
      file: updatedData.file || ''
    };
    setInfos((prev) => prev.map((item) => (item._id === id ? updated : item)));
  };

  const handleDelete = async (id) => {
    const headers = await getAuthHeaders();
    await axios.delete(`${API_BASE_URL}/api/info/${id}`, { headers });
    setInfos((prev) => prev.filter((item) => item._id !== id));
  };

  const showVaultModal = isSignedIn && userLoaded && !encryptionKey;
  const shouldShowLoading = !authLoaded || !userLoaded || (isSignedIn && isLoading && encryptionKey) || isUnlocking;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomCursor />
      
      {shouldShowLoading && <LoadingScreen darkMode={darkMode} />}
      
      {showVaultModal && !isUnlocking && (
        <VaultModal 
          open={true} 
          onUnlock={handleUnlock}
          onReset={handleVaultReset}
          darkMode={darkMode} 
        />
      )}

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Router>
        <AppContent
          infos={filteredInfos}
          handleUpdate={handleUpdate}
          handleDelete={handleDelete}
          handleCreate={handleCreate}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          error={error}
          isLoading={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isVaultUnlocked={!!encryptionKey} 
          userKey={encryptionKey}
        />
      </Router>
    </ThemeProvider>
  );
};

function AppContent({
  infos, handleUpdate, handleDelete, handleCreate, darkMode,
  toggleDarkMode, error, isLoading,
  searchQuery, setSearchQuery, isVaultUnlocked, userKey
}) {
  const location = useLocation();
  const { isSignedIn, isLoaded } = useUser();
  const hideNav = ['/login', '/signup'].includes(location.pathname) || !isLoaded || !isSignedIn;

  return (
    <Box>
      {!hideNav && (
        <>
          <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </>
      )}
      <Suspense fallback={<LoadingScreen darkMode={darkMode} />}>
        <Routes>
          <Route 
             path="/sso-callback" 
             element={
               <>
                 <LoadingScreen darkMode={darkMode} />
                 <AuthenticateWithRedirectCallback 
                   signInForceRedirectUrl="/dashboard" 
                   signUpForceRedirectUrl="/dashboard" 
                 />
               </>
             } 
          />
          
          <Route path="/login" element={<SignedOut><Login /></SignedOut>} />
          <Route path="/signup" element={<SignedOut><Signup /></SignedOut>} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {isVaultUnlocked && (
                  <InfoGrid
                    infos={infos}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    error={error}
                    isLoading={isLoading}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    userKey={userKey}
                  />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <Create handleCreate={handleCreate} userKey={userKey} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/update-profile"
            element={
              <ProtectedRoute>
                <UpdateProf />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Box>
  );
}

export default App;