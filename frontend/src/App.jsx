import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import InfoGrid from './components/InfoGrid.jsx';
import axios from 'axios';
import NavBar from './components/NavBar.jsx';
import SideBar from './components/SideBar.jsx';
import Create from './pages/Create.jsx';
import { lightTheme, darkTheme } from './theme';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
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


const App = () => {
  const [infos, setInfos] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { getToken } = useAuth();

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  const getAuthHeaders = async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchInfos = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await axios.get(`${API_BASE_URL}/api/info`, { headers });
        setInfos(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInfos();
  }, []);

  const handleCreate = async (newData) => {
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_BASE_URL}/api/info`, newData, { headers });
      const res = await axios.get(`${API_BASE_URL}/api/info`, { headers });
      setInfos(res.data.data);
    } catch (err) {
      console.error('Create failed:', err);
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
    }
  };

  const handleDelete = async (id) => {
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_BASE_URL}/api/info/${id}`, { headers });
      setInfos(prev => prev.filter(info => info._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CustomCursor />
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
        />
      </Router>
    </ThemeProvider>
  );
}

import { useUser } from '@clerk/clerk-react';

function AppContent({
  infos,
  handleUpdate,
  handleDelete,
  handleCreate,
  darkMode,
  toggleDarkMode,
  drawerOpen,
  toggleDrawer
}) {
  const location = useLocation();
  const { isSignedIn, isLoaded } = useUser();
  const hides =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    !isLoaded ||
    !isSignedIn;

  return (
    <Box>
      {!hides && (
        <>
          <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} onMenuClick={toggleDrawer} />
          <SideBar open={drawerOpen} toggleDrawer={toggleDrawer} />
        </>
      )}
      <Routes>
        <Route path="/login" element={<SignedOut><Login /></SignedOut>} />
        <Route path="/signup" element={<SignedOut><Signup /></SignedOut>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <InfoGrid infos={infos} onUpdate={handleUpdate} onDelete={handleDelete} />
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
