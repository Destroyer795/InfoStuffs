import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#d9b48fff', // custom light background
      paper: '#85b3d1ff',   // card/dialog background
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
      default: '#121212', // custom dark background
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
    },
  },
});
