import React, { useEffect, useState, useMemo } from 'react';
import InfoGrid from './components/InfoGrid.jsx';
import axios from 'axios';
import NavBar from './components/NavBar.jsx';
import SideBar from './components/SideBar.jsx';
import Create from './pages/Create.jsx';
import { lightTheme, darkTheme } from './theme';
import { Box, ThemeProvider, CssBaseline   } from '@mui/material';
import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom'; 

const App = () => {
  const [infos, setInfos] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);


  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  useEffect(() => {
    axios.get('http://localhost:5000/api/info')
      .then(res => setInfos(res.data.data))
      .catch(err => console.error(err));
  }, []);

  
  const handleCreate = async (newData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/info', newData);
      const data = response.data;  // not response.data.data

      const newInfo = {
        name: data.name || '',
        category: data.category || '',
        importance: data.importance || '',
        content: data.content || '',
        image: data.image || 'https://via.placeholder.com/300x180?text=No+Image',
        _id: data._id
      };
      
      setInfos(prev => [...prev, newInfo]);
    } catch (err) {
      console.error('Create failed:', err);
    }
  };


  
  const handleUpdate = async (id, updatedData) => {
    try {
      const response = await axios.patch(`http://localhost:5000/api/info/${id}`, updatedData);
      setInfos(prev =>
        prev.map(info => (info._id === id ? response.data.data : info))
      );
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/info/${id}`);
      setInfos(prev => prev.filter(info => info._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box>
          <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} onMenuClick={toggleDrawer} />
          <SideBar open={drawerOpen} toggleDrawer={toggleDrawer} />
          <Routes>
            <Route path="/" element={<InfoGrid infos={infos} onUpdate={handleUpdate} onDelete={handleDelete} />} />
            <Route path="/create" element={<Create handleCreate={handleCreate}/>} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
