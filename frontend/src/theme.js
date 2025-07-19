import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#85b3d1ff', // custom light background
      paper: '#d1fdff',   // card/dialog background
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
