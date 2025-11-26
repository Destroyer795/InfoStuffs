import { createTheme } from '@mui/material/styles';

const getShadow = (color) => `4px 4px 0px 0px ${color}`;
const getHoverShadow = (color) => `6px 6px 0px 0px ${color}`;

const getDesignTokens = (mode) => {
  const isDark = mode === 'dark';
  const primaryColor = isDark ? '#2979ff' : '#000000'; 
  const secondaryColor = isDark ? '#2979ff' : '#2979ff'; 
  const borderColor = isDark ? '#2979ff' : '#000000';
  const shadowColor = isDark ? '#2979ff' : '#000000';
  const bgColor = isDark ? '#121212' : '#f4f4f0';
  const paperColor = isDark ? '#1E1E1E' : '#ffffff';

  return {
    palette: {
      mode,
      primary: {
        main: primaryColor,
      },
      secondary: {
        main: secondaryColor,
      },
      background: {
        default: bgColor,
        paper: paperColor,
      },
      text: {
        primary: isDark ? '#ffffff' : '#000000',
        secondary: isDark ? '#cccccc' : '#444444',
      },
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 800,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 700,
      },
      button: {
        fontWeight: 700,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body {
            background-color: ${bgColor};
            transition: background-color 0.3s ease;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `,
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
          disableRipple: true,
        },
        styleOverrides: {
          root: {
            border: `2px solid ${borderColor}`,
            boxShadow: getShadow(shadowColor),
            transition: 'all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1)',
            transform: 'translate(0, 0)',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(41, 121, 255, 0.1)' : '#e3f2fd',
              boxShadow: getHoverShadow(shadowColor),
              transform: 'translate(-2px, -2px)',
            },
            '&:active': {
              boxShadow: 'none !important',
              transform: 'translate(4px, 4px) !important',
            },
          },

          contained: {
            '&:hover': {
              backgroundColor: isDark ? '#2979ff' : '#000000',
              color: '#fff',
            }
          },
          outlined: {
            '&:hover': {
              backgroundColor: isDark ? 'rgba(41, 121, 255, 0.1)' : 'rgba(0,0,0,0.05)',
            }
          }
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `2px solid ${borderColor}`,
            boxShadow: getShadow(shadowColor),
            overflow: 'visible',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderWidth: '2px',
                borderColor: isDark ? '#555' : '#000',
              },
              '&:hover fieldset': {
                borderColor: primaryColor,
              },
              '&.Mui-focused fieldset': {
                borderColor: primaryColor,
                boxShadow: getShadow(primaryColor),
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderBottom: `2px solid ${borderColor}`,
            boxShadow: 'none',
            backgroundColor: paperColor,
            color: isDark ? '#fff' : '#000',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            border: `2px solid ${borderColor}`,
            boxShadow: getHoverShadow(shadowColor),
          }
        }
      }
    },
  };
};

export const lightTheme = createTheme(getDesignTokens('light'));
export const darkTheme = createTheme(getDesignTokens('dark'));