import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  Divider
} from '@mui/material';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useTheme } from '@mui/material/styles';

export default function SideBar({ open, toggleDrawer }) {
  const theme = useTheme();
  
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const handleLogout = () => {
    signOut();
  };

  const listItemSx = {
    borderRadius: 2,
    mb: 1.5,
    border: '2px solid transparent',
    transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
      border: `2px solid ${theme.palette.primary.main}`,
      boxShadow: `4px 4px 0px ${theme.palette.primary.main}`,
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

  const DrawerList = (
    <Box
      sx={{ 
        width: '80vw', 
        maxWidth: 320, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 3
      }}
      role="presentation"
      onClick={toggleDrawer}
    >
      {/* Header */}
      <Box sx={{ mb: 4, mt: 1, px: 1 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 800, 
            letterSpacing: '-0.02em',
            color: theme.palette.text.primary 
          }}
        >
          Info<span style={{ color: theme.palette.primary.main }}>Stuffs</span>
        </Typography>
      </Box>

      <List sx={{ flexGrow: 1 }}>
        <ListItem disablePadding>
          <ListItemButton 
            className="cursor-hover-target" 
            onClick={() => navigate('/create')}
            sx={listItemSx}
          >
            <ListItemIcon sx={{ color: theme.palette.text.primary, minWidth: 40 }}>
              <AddBoxOutlinedIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Create New" 
              primaryTypographyProps={{ fontWeight: 600 }}
              sx={{ color: theme.palette.text.primary }}
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            className="cursor-hover-target" 
            onClick={() => navigate('/update-profile')}
            sx={listItemSx}
          >
            <ListItemIcon sx={{ color: theme.palette.text.primary, minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Settings" 
              primaryTypographyProps={{ fontWeight: 600 }}
              sx={{ color: theme.palette.text.primary }}
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton 
            className="cursor-hover-target" 
            onClick={handleLogout}
            sx={{
              ...listItemSx,
              '&:hover': {
                ...listItemSx['&:hover'],
                borderColor: theme.palette.error.main,
                boxShadow: `4px 4px 0px ${theme.palette.error.main}`,
                '& .MuiListItemIcon-root': { color: theme.palette.error.main },
                '& .MuiListItemText-primary': { color: theme.palette.error.main }
              }
            }}
          >
            <ListItemIcon sx={{ color: theme.palette.text.primary, minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{ fontWeight: 600 }}
              sx={{ color: theme.palette.text.primary }}
            />
          </ListItemButton>
        </ListItem>   
      </List>

      <Box sx={{ textAlign: 'center', pb: 2 }}>
        <Divider sx={{ mb: 3, borderBottomWidth: 2, borderColor: theme.palette.divider }} />
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
          Made with ❤️ by <span style={{ color: theme.palette.text.primary, fontWeight: 700 }}>Pranav Kishan</span>
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={toggleDrawer}
      sx={{
        '& .MuiDrawer-paper': {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          borderRight: `2px solid ${theme.palette.text.primary}`,
          boxShadow: 'none',
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(2px)'
        }
      }}
    >
      {DrawerList}
    </Drawer>
  );
}