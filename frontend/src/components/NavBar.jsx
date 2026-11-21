import { AppBar, Toolbar, Typography, IconButton, Stack, Box, Avatar, Button, Tooltip } from '@mui/material';
import { Brightness4, Brightness7, LockOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import ProfileMenu from './ProfileMenu';

const PUBLIC_LOGO_HOST = 'https://info-stuffs.vercel.app';

function NavBar({ darkMode, toggleDarkMode, vaultName, onLockVault }) {
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
            onClick={() => navigate('/dashboard')} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              gap: 1,
              userSelect: 'none'
            }}
            className='cursor-hover-target'
          >
            <Box
              component="img"
              src={darkMode ? `${PUBLIC_LOGO_HOST}/logo_name_dark.png` : `${PUBLIC_LOGO_HOST}/logo_name.png`}
              alt="InfoStuffs"
              draggable="false"
              onDragStart={(e) => e.preventDefault()}
              sx={{
                height: 45,
                objectFit: 'contain',
                display: { xs: 'none', sm: 'block' },
                userSelect: 'none'
              }}
            />
            <Box
              component="img"
              src={darkMode ? `${PUBLIC_LOGO_HOST}/logo_dark.png` : `${PUBLIC_LOGO_HOST}/logo.png`}
              alt="InfoStuffs"
              draggable="false"
              onDragStart={(e) => e.preventDefault()}
              sx={{
                height: 40,
                objectFit: 'contain',
                display: { xs: 'block', sm: 'none' },
                userSelect: 'none'
              }}
            />
          </Box>
        </Stack>

        <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
          {vaultName && <Tooltip title="Lock this vault to switch or create another">
            <Button variant="outlined" onClick={onLockVault} startIcon={<LockOutlined />} aria-label={`Lock ${vaultName} and switch vaults`}
              sx={{ minWidth: 0, maxWidth: { xs: 115, sm: 230 } }}>
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vaultName}</Box>
            </Button>
          </Tooltip>}
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
