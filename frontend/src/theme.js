import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#8fc9ffff',
      paper: '#81aaf6ff',
    },
    text: {
      primary: '#0F172A',
    },
    secondary: {
      main: '#f50057',
    }
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212', 
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
    },
    
  },
});
