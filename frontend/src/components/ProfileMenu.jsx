import {
  Popover,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  Box,
  Typography,
  Paper
} from '@mui/material';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';

export default function ProfileMenu({ anchorEl, open, onClose }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  
  const menuRef = useRef(null);

  useEffect(() => {
    if (open) {
      const handleScroll = () => {
        if (menuRef.current) {
          menuRef.current.style.opacity = '0';
          menuRef.current.style.transition = 'none';
        }
        onClose();
      };

      const handleMouseDown = (event) => {
        if (menuRef.current && menuRef.current.contains(event.target)) {
          return;
        }
        if (anchorEl && anchorEl.contains(event.target)) {
           return;
        }
        onClose();
      };

      window.addEventListener('scroll', handleScroll, { capture: true });
      window.addEventListener('mousedown', handleMouseDown);

      return () => {
        window.removeEventListener('scroll', handleScroll, { capture: true });
        window.removeEventListener('mousedown', handleMouseDown);
      };
    }
  }, [open, onClose, anchorEl]);

  const handleLogout = () => {
    signOut();
    onClose();
  };

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const menuItemSx = {
    borderRadius: 1,
    margin: '4px 10px',
    border: '2px solid transparent',
    transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
      border: `2px solid ${theme.palette.primary.main}`,
      boxShadow: `2px 2px 0px ${theme.palette.primary.main}`,
      transform: 'translate(-2px, -2px)',
      '& .MuiListItemIcon-root': {
        color: theme.palette.primary.main,
      },
      '& .MuiListItemText-primary': {
        color: theme.palette.primary.main,
        fontWeight: 700,
      }
    },
    '&:active': {
      boxShadow: 'none',
      transform: 'translate(2px, 2px)',
    }
  };

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      disableScrollLock={true}
      disableRestoreFocus={true}
      disableAutoFocus={true} 
      disableEnforceFocus={true}
      hideBackdrop={true}
      sx={{ pointerEvents: 'none' }} 
      PaperProps={{
        ref: menuRef,
        elevation: 0,
        sx: {
          minWidth: { xs: 220, sm: 240 },
          overflow: 'visible',
          backgroundColor: 'transparent',
          pointerEvents: 'auto',
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Paper sx={{
        mt: 1.5,
        borderRadius: 2,
        border: `2px solid ${theme.palette.text.primary}`,
        boxShadow: theme.palette.mode === 'dark' ? '3px 3px 0px #E6E6E6' : '3px 3px 0px #111111',
        padding: '4px 0',
        backgroundColor: theme.palette.background.paper, 
      }}>
        <Box sx={{ px: 2, py: 1.5, textAlign: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {user?.username}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {user?.primaryEmailAddress?.emailAddress}
          </Typography>
        </Box>
        <Divider sx={{ borderBottomWidth: '2px', borderColor: theme.palette.divider }} />
        <MenuItem onClick={() => handleNavigate('/create')} sx={menuItemSx}>
          <ListItemIcon>
            <AddBoxOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Create New" />
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/update-profile')} sx={menuItemSx}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <Divider sx={{ my: 1, borderBottomWidth: '1px' }} />
        <MenuItem 
          onClick={handleLogout} 
          sx={{
            ...menuItemSx,
            '&:hover': {
              ...menuItemSx['&:hover'],
              borderColor: theme.palette.error.main,
              boxShadow: `3px 3px 0px ${theme.palette.error.main}`,
              '& .MuiListItemIcon-root': { color: theme.palette.error.main },
              '& .MuiListItemText-primary': { color: theme.palette.error.main }
            }
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ color: theme.palette.error.main, fontWeight: 600 }} />
        </MenuItem>
      </Paper>
    </Popover>
  );
}