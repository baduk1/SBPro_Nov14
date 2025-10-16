import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Components {
    MuiDataGrid?: {
      styleOverrides?: {
        root?: any
        columnHeader?: any
        cell?: any
        row?: any
      }
    }
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#00e5a8' },
    secondary: { main: '#00bcd4' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h5: { fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#fafafa',
        },
      },
    },
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
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          border: '1px solid rgba(0,0,0,0.12)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorTransparent: {
          backgroundColor: '#fff',
        },
      },
    },
  },
})

export default theme
