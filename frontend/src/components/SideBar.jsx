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

export default function SideBar({ open, toggleDrawer }) {
  const navigate = useNavigate();
  const DrawerList = (
    <Box
      sx={{ width: '75vw', maxWidth: 300,}}
      role="presentation"
      onClick={toggleDrawer}
    >
    <List>
      <ListItem disablePadding>
        <ListItemButton className="cursor-hover-target" onClick={() => navigate('/create')}>
          <ListItemIcon><AddBoxOutlinedIcon/></ListItemIcon>
          <ListItemText primary="Create"/>
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton className="cursor-hover-target">
          <ListItemIcon><SettingsIcon /></ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton className="cursor-hover-target">
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </ListItem>   
    </List>
    <Typography variant="h7" component="div" sx={{ textAlign: 'center', mt: 4 }}>
      Made with ❤️ by Pranav Kishan
    </Typography>
    </Box>
  );

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={toggleDrawer}
    >
      {DrawerList}
    </Drawer>
  );
}
