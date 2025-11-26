import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Stack, Box } from '@mui/material';
import { Brightness4, Brightness7, Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useTheme } from '@mui/material/styles';

function NavBar({ darkMode, toggleDarkMode, onMenuClick }) {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <AppBar position="sticky" color="inherit">
      <Toolbar sx={{ justifyContent: "space-between", minHeight: '70px' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={onMenuClick} 
            className='cursor-hover-target'
            sx={{ 
              border: 'none', 
              boxShadow: 'none', 
              '&:hover': { backgroundColor: 'transparent', transform: 'scale(1.1)' } 
            }}
          >
            <MenuIcon fontSize="medium" />
          </IconButton>
          
          <Box 
            onClick={() => navigate('/')} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              gap: 1
            }}
            className='cursor-hover-target'
          >
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 800, 
                letterSpacing: '-1px',
                userSelect: 'none'
              }}
            >
              Info<span style={{ color: theme.palette.secondary.main }}>Stuffs</span>
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton 
            onClick={toggleDarkMode} 
            color="inherit"
            className='cursor-hover-target'
            sx={{ 
              border: `2px solid ${theme.palette.text.primary}`,
              borderRadius: '50%',
              padding: '6px',
              boxShadow: 'none',
              '&:hover': { boxShadow: `2px 2px 0px ${theme.palette.text.primary}`, transform: 'translate(-1px, -1px)' }
            }}
          >
            {darkMode ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
          </IconButton>
          
          <Box sx={{ border: `2px solid ${theme.palette.primary.main}`, borderRadius: '50%', display: 'flex', p: '2px' }}>
            <UserButton
              afterSwitchSessionUrl="/login"
              userProfileMode="navigation"
              appearance={{
                elements: {
                  userButtonPopoverActionButton__manageAccount: { display: "none" },
                  userButtonPopoverActionButton__signOut: { display: "none" },
                  userButtonPopoverActionButton__switchSession: { display: "none" },
                  userButtonPopoverActionButton__signIn: { display: "none" },
                  userButtonAvatarBox: { width: '32px', height: '32px' }
                },
              }}
            />
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;