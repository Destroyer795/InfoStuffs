import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#5686a7ff',
      paper: '#81aaf6ff',
    },
    text: {
      primary: '#0F172A',
    },
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
