import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography
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

  const DrawerList = (
    <Box
      sx={{ width: '75vw', maxWidth: 300,}}
      role="presentation"
      onClick={toggleDrawer}
    >
    <List>
      <ListItem disablePadding>
        <ListItemButton className="cursor-hover-target" onClick={() => navigate('/create')}>
          <ListItemIcon sx={{ color: theme.palette.text.primary }}><AddBoxOutlinedIcon/></ListItemIcon>
          <ListItemText primary="Create" sx={{ color: theme.palette.text.primary }}/>
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton className="cursor-hover-target" onClick={() => navigate('/update-profile')}>
          <ListItemIcon sx={{ color: theme.palette.text.primary }}><SettingsIcon /></ListItemIcon>
          <ListItemText primary="Settings" sx={{ color: theme.palette.text.primary }}/>
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton className="cursor-hover-target" onClick={handleLogout}>
          <ListItemIcon sx={{ color: theme.palette.text.primary }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" sx={{ color: theme.palette.text.primary }}/>
        </ListItemButton>
      </ListItem>   
    </List>
    <Typography variant="h7" component="div" sx={{ textAlign: 'center', mt: 4, color: theme.palette.text.primary }}>
      Made with ❤️ by Pranav Kishan
    </Typography>
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
          color: '#0F172A',
        },
      }}
    >
      {DrawerList}
    </Drawer>
  );
}
