import { createTheme } from '@mui/material/styles'

// Extend the theme interface to include MuiDataGrid
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
    mode: 'dark',
    primary: { main: '#00e5a8' }, // tech green/cyan accent
    secondary: { main: '#00bcd4' }
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h5: { fontWeight: 700 },
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: { 
          border: '1px solid rgba(255,255,255,0.12)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        },
        columnHeader: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: '#00e5a8',
          fontWeight: 600,
        },
        cell: {
          borderColor: 'rgba(255,255,255,0.12)',
        },
        row: {
          '&:hover': {
            backgroundColor: 'rgba(0, 229, 168, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 229, 168, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(0, 229, 168, 0.16)',
            },
          },
        },
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
  }
})

export default theme