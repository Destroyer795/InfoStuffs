import React, { useEffect, useState, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import InfoGrid from './components/InfoGrid.jsx';
import axios from 'axios';
import NavBar from './components/NavBar.jsx';
import SideBar from './components/SideBar.jsx';
import Create from './pages/Create.jsx';
import { lightTheme, darkTheme } from './theme';
import { 
  Box, 
  ThemeProvider, 
  CssBaseline, 
  CircularProgress, 
  Typography,
  Backdrop 
} from '@mui/material';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate
} from 'react-router-dom'; 
import CustomCursor from './components/Cursor.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import { SignedOut } from '@clerk/clerk-react';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { UpdateProf } from './pages/UpdateProf.jsx';

const LoadingScreen = ({ darkMode }) => (
  <Backdrop
    open={true}
    sx={{
      color: '#fff',
      zIndex: (theme) => theme.zIndex.drawer + 1,
      backgroundColor: darkMode ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
      flexDirection: 'column',
      gap: 2
    }}
  >
    <CircularProgress 
      color="primary" 
      size={60}
      thickness={4}
      sx={{
        color: darkMode ? '#90caf9' : '#1976d2'
      }}
    />
    <Typography 
      variant="h6" 
      sx={{ 
        color: darkMode ? '#fff' : '#000',
        fontWeight: 500
      }}
    >
      Loading your content...
    </Typography>
  </Backdrop>
);

const App = () => {
  const [infos, setInfos] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { isSignedIn, isLoaded: userLoaded } = useUser();

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  const getAuthHeaders = async () => {
    try {
      const token = await getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (err) {
      console.error('Failed to get auth token:', err);
      return {};
    }
  };

  const fetchInfos = async () => {
    if (!isSignedIn || !authLoaded || !userLoaded) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/info`, { headers });
      setInfos(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch infos:', err);
      setError('Failed to load your content. Please try refreshing the page.');
      setInfos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoaded && userLoaded) {
      if (isSignedIn) {
        fetchInfos();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoaded, userLoaded, isSignedIn]);

  const handleCreate = async (newData) => {
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_BASE_URL}/api/info`, newData, { headers });
      
      await fetchInfos();
    } catch (err) {
      console.error('Create failed:', err);
      throw new Error('Failed to create item');
    }
  };

  const handleUpdate = async (id, updatedData) => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.patch(`${API_BASE_URL}/api/info/${id}`, updatedData, { headers });
      
      setInfos(prev =>
        prev.map(info => (info._id === id ? response.data.data : info))
      );
    } catch (err) {
      console.error('Update failed:', err);
      throw new Error('Failed to update item');
    }
  };

  const handleDelete = async (id) => {
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/api/info/${id}`, { headers });
      
      setInfos(prev => prev.filter(info => info._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      throw new Error('Failed to delete item');
    }
  };

  const shouldShowLoading = !authLoaded || !userLoaded || (isSignedIn && isLoading);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomCursor />
      
      {shouldShowLoading && <LoadingScreen darkMode={darkMode} />}
      
      <Router>
        <AppContent 
          infos={infos}
          handleUpdate={handleUpdate}
          handleDelete={handleDelete}
          handleCreate={handleCreate}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          drawerOpen={drawerOpen}
          toggleDrawer={toggleDrawer}
          error={error}
          isLoading={isLoading}
        />
      </Router>
    </ThemeProvider>
  );
};

function AppContent({
  infos,
  handleUpdate,
  handleDelete,
  handleCreate,
  darkMode,
  toggleDarkMode,
  drawerOpen,
  toggleDrawer,
  error,
  isLoading
}) {
  const location = useLocation();
  const { isSignedIn, isLoaded } = useUser();
  
  const shouldHideNavigation =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    !isLoaded ||
    !isSignedIn;

  return (
    <Box>
      {!shouldHideNavigation && (
        <>
          <NavBar 
            darkMode={darkMode} 
            toggleDarkMode={toggleDarkMode} 
            onMenuClick={toggleDrawer} 
          />
          <SideBar 
            open={drawerOpen} 
            toggleDrawer={toggleDrawer} 
          />
        </>
      )}
      
      <Routes>
        <Route 
          path="/login" 
          element={
            <SignedOut>
              <Login />
            </SignedOut>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <SignedOut>
              <Signup />
            </SignedOut>
          } 
        />
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
    </Box>
  );
}

export default App;