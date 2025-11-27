import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useAuth, useUser, SignedOut } from '@clerk/clerk-react';
import axios from 'axios';
import {
  Box,
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Typography,
  Backdrop,
} from '@mui/material';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import NavBar from './components/NavBar.jsx';
import SideBar from './components/SideBar.jsx';
import CustomCursor from './components/Cursor.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import { encryptText, decryptText } from './utils/encryption';
import { lightTheme, darkTheme } from './theme';

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

const App = () => {
  const [infos, setInfos] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn, isLoaded: userLoaded } = useUser();

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);

  const filteredInfos = useMemo(() => {
    if (!searchQuery) {
      return infos;
    }
    return infos.filter(
      (info) =>
        info.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        info.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [infos, searchQuery]);

  const getAuthHeaders = async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchInfos = async () => {
    if (!isSignedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/info`, { headers });
      const decrypted = (res.data.data || []).map((item) => ({
        ...item,
        content: item.type === 'text' ? decryptText(item.content) : item.content
      }));
      setInfos(decrypted);
    } catch (err) {
      console.error('Fetch failed:', err);
      setError('Failed to load your content. Please try again.');
      setInfos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoaded && userLoaded && isSignedIn) {
      fetchInfos();
    } else if (authLoaded && userLoaded && !isSignedIn) {
      setIsLoading(false);
    }
  }, [authLoaded, userLoaded, isSignedIn]);

  const handleCreate = async (newData) => {
    const headers = await getAuthHeaders();
    const encryptedData = { ...newData, content: newData.type === 'text' ? encryptText(newData.content) : newData.content };
    const res = await axios.post(`${API_BASE_URL}/api/info`, encryptedData, { headers });
    const newInfo = res.data.data;
    const decryptedNewInfo = {
      ...newInfo,
      content: newInfo.type === 'text' ? decryptText(newInfo.content) : newInfo.content
    };
    setInfos((prev) => [decryptedNewInfo, ...prev]);
  };

  const handleUpdate = async (id, updatedData) => {
    const headers = await getAuthHeaders();
    const encryptedData = { ...updatedData, content: updatedData.type === 'text' ? encryptText(updatedData.content) : updatedData.content };
    const response = await axios.patch(`${API_BASE_URL}/api/info/${id}`, encryptedData, { headers });
    const updated = { ...response.data.data, content: updatedData.type === 'text' ? decryptText(response.data.data.content) : response.data.data.content };
    setInfos((prev) => prev.map((item) => (item._id === id ? updated : item)));
  };

  const handleDelete = async (id) => {
    const headers = await getAuthHeaders();
    await axios.delete(`${API_BASE_URL}/api/info/${id}`, { headers });
    setInfos((prev) => prev.filter((item) => item._id !== id));
  };

  const shouldShowLoading = !authLoaded || !userLoaded || (isSignedIn && isLoading);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomCursor />
      {shouldShowLoading && <LoadingScreen darkMode={darkMode} />}
      <Router>
        <AppContent
          infos={filteredInfos}
          handleUpdate={handleUpdate}
          handleDelete={handleDelete}
          handleCreate={handleCreate}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          drawerOpen={drawerOpen}
          toggleDrawer={toggleDrawer}
          error={error}
          isLoading={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </Router>
    </ThemeProvider>
  );
};

function AppContent({
  infos, handleUpdate, handleDelete, handleCreate, darkMode,
  toggleDarkMode, drawerOpen, toggleDrawer, error, isLoading,
  searchQuery, setSearchQuery
}) {
  const location = useLocation();
  const { isSignedIn, isLoaded } = useUser();
  const hideNav = ['/login', '/signup'].includes(location.pathname) || !isLoaded || !isSignedIn;

  return (
    <Box>
      {!hideNav && (
        <>
          <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} onMenuClick={toggleDrawer} />
          <SideBar open={drawerOpen} toggleDrawer={toggleDrawer} />
        </>
      )}
      <Suspense fallback={<LoadingScreen darkMode={darkMode} />}>
        <Routes>
          <Route path="/login" element={<SignedOut><Login /></SignedOut>} />
          <Route path="/signup" element={<SignedOut><Signup /></SignedOut>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <InfoGrid
                  infos={infos}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  error={error}
                  isLoading={isLoading}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <Create handleCreate={handleCreate} />
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