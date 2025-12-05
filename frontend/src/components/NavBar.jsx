import { AppBar, Toolbar, Typography, IconButton, Stack, Box, Avatar } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import ProfileMenu from './ProfileMenu';

function NavBar({ darkMode, toggleDarkMode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useUser();

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuToggle = (event) => {
    setAnchorEl((prevAnchorEl) => (prevAnchorEl ? null : event.currentTarget));
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="sticky" color="inherit">
      <Toolbar sx={{ justifyContent: "space-between", minHeight: '70px' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
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
              transition: 'all 0.1s ease-in-out',
              '&:hover': { 
                boxShadow: `2px 2px 0px ${theme.palette.text.primary}`, 
                transform: 'translate(-1px, -1px)' 
              },
              '&:active': {
                boxShadow: 'none',
                transform: 'translate(1px, 1px)'
              }
            }}
          >
            {darkMode ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
          </IconButton>
          
          <IconButton
            onClick={handleMenuToggle}
            size="small"
            className="cursor-hover-target"
            sx={{ 
              border: `2px solid ${theme.palette.text.primary}`,
              borderRadius: '50%',
              padding: '2px',
              boxShadow: 'none',
              transition: 'all 0.1s ease-in-out',
              '&:hover': { 
                borderColor: theme.palette.primary.main,
                boxShadow: `2px 2px 0px ${theme.palette.primary.main}`, 
                transform: 'translate(-1px, -1px)' 
              },
              '&:active': {
                boxShadow: 'none',
                transform: 'translate(1px, 1px)'
              }
            }}
          >
            <Avatar 
              src={user?.imageUrl} 
              alt={user?.username} 
              sx={{ width: 32, height: 32 }}
            />
          </IconButton>
          <ProfileMenu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
          />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;