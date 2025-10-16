import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import { createTheme, ThemeProvider, PaletteMode } from '@mui/material'

interface ColorModeContextType {
  mode: PaletteMode
  toggleMode: () => void
}

const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'light',
  toggleMode: () => {}
})

export function useColorMode() {
  return useContext(ColorModeContext)
}

interface ColorModeProviderProps {
  children: ReactNode
}

export function ColorModeProvider({ children }: ColorModeProviderProps) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const stored = localStorage.getItem('theme')
    return (stored as PaletteMode) || 'light'
  })

  const toggleMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', newMode)
      return newMode
    })
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#1976d2' : '#FF9D00' // HuggingFace orange
          },
          secondary: {
            main: mode === 'light' ? '#dc004e' : '#60A5FA' // Light blue accent
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#0b0f19', // HuggingFace navy
            paper: mode === 'light' ? '#ffffff' : '#161b26' // Slightly lighter navy for cards
          },
          text: {
            primary: mode === 'light' ? 'rgba(0,0,0,0.87)' : '#e5e7eb',
            secondary: mode === 'light' ? 'rgba(0,0,0,0.6)' : '#9ca3af'
          },
          divider: mode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'
        },
        typography: {
          fontFamily: '"IBM Plex Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontWeight: 700 },
          h2: { fontWeight: 700 },
          h3: { fontWeight: 600 },
          h4: { fontWeight: 600 },
          h5: { fontWeight: 600 },
          h6: { fontWeight: 600 },
          button: { fontWeight: 500 }
        },
        shape: {
          borderRadius: 8
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 6
              }
            }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                boxShadow: mode === 'light'
                  ? '0 2px 8px rgba(0,0,0,0.1)'
                  : '0 1px 3px rgba(0,0,0,0.4)',
                border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : 'none'
              }
            }
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none'
              }
            }
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                backgroundColor: mode === 'dark' ? '#0b0f19' : undefined,
                borderBottom: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : undefined
              }
            }
          }
        }
      }),
    [mode]
  )

  return (
    <ColorModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  )
}
