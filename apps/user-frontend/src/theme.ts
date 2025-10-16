import { createTheme } from '@mui/material/styles'

// Keep this augmentation so DataGrid overrides type-check
declare module '@mui/material/styles' {
  interface Components {
    MuiDataGrid?: {
      styleOverrides?: {
        root?: any;
        columnHeader?: any;
        cell?: any;
        row?: any;
      };
    };
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',                          // <-- switch from 'dark' to 'light'
    primary: { main: '#00e5a8' },           // brand accent can stay the same
    secondary: { main: '#00bcd4' }
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h5: { fontWeight: 700 },
  },
  components: {
    // Make the page background light and text dark
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#fafafa',
        },
      },
    },

    // DataGrid styles tuned for light mode
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(0,0,0,0.12)',
          backgroundColor: '#fff',
        },
        columnHeader: {
          backgroundColor: 'rgba(0,0,0,0.04)',
          color: 'rgba(0,0,0,0.87)',
          fontWeight: 600,
        },
        cell: {
          borderColor: 'rgba(0,0,0,0.12)',
        },
        row: {
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0,0,0,0.08)',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.12)',
            },
          },
        },
      }
    },

    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none' },
      },
    },

    // Cards should be white in light mode
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          border: '1px solid rgba(0,0,0,0.12)',
        },
      },
    },

    // Your Navbar uses color="transparent". If you want it white, keep this.
    // If you prefer truly transparent, remove this block.
    MuiAppBar: {
      styleOverrides: {
        colorTransparent: {
          backgroundColor: '#fff',
        },
      },
    },
  }
})

export default theme
