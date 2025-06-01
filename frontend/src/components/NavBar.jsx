import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Stack } from '@mui/material';
import { Brightness4, Brightness7, Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';


function NavBar({ darkMode, toggleDarkMode, onMenuClick }) {
    const navigate = useNavigate();
  return (
    <AppBar position="static"
    sx={{
      backgroundColor: !darkMode ? '#0063B2' : 'grey.900', // or any color you prefer
      color: 'white' // ensure text/icons are visible
    }}
  >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton color="inherit" onClick={onMenuClick}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" onClick={() => navigate('/')} sx={{ cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' } }} >Impostuffs</Typography>
        </Stack>
        <IconButton color="inherit" onClick={toggleDarkMode}>
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
