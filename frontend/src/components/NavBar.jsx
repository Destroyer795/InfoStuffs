import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Stack, Icon } from '@mui/material';
import { Brightness4, Brightness7, Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useTheme } from '@mui/material/styles';


function NavBar({ darkMode, toggleDarkMode, onMenuClick }) {
  const theme = useTheme();
  const navigate = useNavigate();
  return (
    <AppBar position="static"
    sx={{
      backgroundColor: theme.palette.background.default,
      boxShadow: 'none',
    }}
  >
      <Toolbar sx={{ justifyContent: "space-between", backgroundColor: theme.palette.background.default }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton color="inherit" onClick={onMenuClick} sx={{ color: theme.palette.text.primary }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" onClick={() => navigate('/')} sx={{ cursor: 'pointer', transition: 'transform 0.2s', color: theme.palette.text.primary , '&:hover': { transform: 'scale(1.05)' } }} className='cursor-hover-target'>InfoStuffs</Typography>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
        <UserButton
          afterSwitchSessionUrl="/login"
          userProfileMode="navigation"
          appearance={{
            elements: {
              userButtonPopoverActionButton__manageAccount: {
                display: "none",
              },
              userButtonPopoverActionButton__signOut: {
                display: "none",
              },
              userButtonPopoverActionButton__switchSession: {
                display: "none",
              },
              userButtonPopoverActionButton__signIn: {
                display: "none",
              },
            },
          }}
        />
          <IconButton color="inherit" onClick={toggleDarkMode} sx={{ color: theme.palette.text.primary}}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
