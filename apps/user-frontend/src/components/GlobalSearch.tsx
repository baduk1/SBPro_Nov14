import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material'
import {
  Search,
  Folder,
  CheckSquare,
  Package,
  Users,
  FileText,
  Calculator,
  FileBox,
  Building2,
  TrendingUp,
  Plus,
  Upload,
  Command,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

interface SearchResult {
  id: string
  type: 'project' | 'task' | 'boq' | 'team' | 'file' | 'estimate' | 'template' | 'supplier'
  title: string
  subtitle?: string
  url: string
  metadata?: string
}

interface QuickAction {
  id: string
  title: string
  icon: any
  url?: string
  action?: () => void
  shortcut?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-project', title: 'Create New Project', icon: Plus, url: '/app/dashboard', shortcut: 'N' },
  { id: 'upload', title: 'Upload Files', icon: Upload, url: '/app/upload', shortcut: 'U' },
  { id: 'suppliers', title: 'View Suppliers', icon: Building2, url: '/app/suppliers' },
  { id: 'templates', title: 'View Templates', icon: FileBox, url: '/app/templates' },
  // Note: Invite Team needs to be implemented with a modal dialog
  // { id: 'invite', title: 'Invite Team Member', icon: UserPlus, action: () => alert('Invite modal coming soon!'), shortcut: 'I' },
]

const CATEGORY_CONFIG = {
  project: { icon: Folder, label: 'Projects', color: '#3b82f6' },
  task: { icon: CheckSquare, label: 'Tasks', color: '#10b981' },
  boq: { icon: Package, label: 'BoQ Items', color: '#f59e0b' },
  team: { icon: Users, label: 'Team', color: '#8b5cf6' },
  file: { icon: FileText, label: 'Files', color: '#6366f1' },
  estimate: { icon: Calculator, label: 'Estimates', color: '#ec4899' },
  template: { icon: FileBox, label: 'Templates', color: '#14b8a6' },
  supplier: { icon: Building2, label: 'Suppliers', color: '#f97316' },
}

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Search function with debouncing
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`)
      setResults(response.data.results || [])
    } catch (error) {
      console.error('Search error:', error)
      // For now, return empty results
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      const totalItems = query.trim() ? results.length : QUICK_ACTIONS.length

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % totalItems)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelect(selectedIndex)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, query, results, selectedIndex])

  const handleSelect = (index: number) => {
    if (query.trim() && results.length > 0) {
      const result = results[index]
      if (result) {
        navigate(result.url)
        onClose()
      }
    } else {
      const action = QUICK_ACTIONS[index]
      if (action) {
        if (action.action) {
          action.action()
        } else if (action.url) {
          navigate(action.url)
        }
        onClose()
      }
    }
  }

  const groupResultsByType = (results: SearchResult[]) => {
    const grouped: Record<string, SearchResult[]> = {}
    results.forEach((result) => {
      if (!grouped[result.type]) {
        grouped[result.type] = []
      }
      grouped[result.type].push(result)
    })
    return grouped
  }

  const renderIcon = (type: string) => {
    const config = CATEGORY_CONFIG[type as keyof typeof CATEGORY_CONFIG]
    if (!config) return <Search size={20} />
    const Icon = config.icon
    return <Icon size={20} style={{ color: config.color }} />
  }

  const groupedResults = query.trim() ? groupResultsByType(results) : {}
  const showResults = query.trim() && results.length > 0
  const showQuickActions = !query.trim()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search Input */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            variant="standard"
            placeholder="Search projects, tasks, team, files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <Search size={20} style={{ marginRight: 12, color: '#94a3b8' }} />
              ),
              endAdornment: loading ? <CircularProgress size={20} /> : null,
              sx: {
                fontSize: 16,
                '& input::placeholder': {
                  opacity: 0.6,
                },
              },
            }}
          />
        </Box>

        {/* Results / Quick Actions */}
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {showQuickActions && (
            <>
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  QUICK ACTIONS
                </Typography>
              </Box>
              <List sx={{ py: 0 }}>
                {QUICK_ACTIONS.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <ListItemButton
                      key={action.id}
                      selected={selectedIndex === index}
                      onClick={() => handleSelect(index)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Icon size={20} style={{ color: '#3b82f6' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={action.title}
                        primaryTypographyProps={{
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      />
                      {action.shortcut && (
                        <Chip
                          label={action.shortcut}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: 12,
                            bgcolor: 'action.hover',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </ListItemButton>
                  )
                })}
              </List>
            </>
          )}

          {showResults && (
            <>
              {Object.entries(groupedResults).map(([type, items], groupIndex) => {
                const config = CATEGORY_CONFIG[type as keyof typeof CATEGORY_CONFIG]
                const Icon = config?.icon || Search

                return (
                  <Box key={type}>
                    {groupIndex > 0 && <Divider />}
                    <Box sx={{ p: 2, pb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon size={16} style={{ color: config?.color || '#64748b' }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {config?.label || type}
                        </Typography>
                        <Chip
                          label={items.length}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 11,
                            bgcolor: 'action.hover',
                          }}
                        />
                      </Box>
                    </Box>
                    <List sx={{ py: 0 }}>
                      {items.map((result, index) => {
                        const globalIndex = Object.entries(groupedResults)
                          .slice(0, groupIndex)
                          .reduce((acc, [, items]) => acc + items.length, 0) + index

                        return (
                          <ListItemButton
                            key={result.id}
                            selected={selectedIndex === globalIndex}
                            onClick={() => handleSelect(globalIndex)}
                            sx={{
                              py: 1.5,
                              px: 2,
                              '&.Mui-selected': {
                                bgcolor: 'action.selected',
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              {renderIcon(result.type)}
                            </ListItemIcon>
                            <ListItemText
                              primary={result.title}
                              secondary={result.subtitle}
                              primaryTypographyProps={{
                                fontSize: 14,
                                fontWeight: 500,
                              }}
                              secondaryTypographyProps={{
                                fontSize: 12,
                                sx: { mt: 0.5 },
                              }}
                            />
                            {result.metadata && (
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', ml: 2 }}
                              >
                                {result.metadata}
                              </Typography>
                            )}
                          </ListItemButton>
                        )
                      })}
                    </List>
                  </Box>
                )
              })}
            </>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <Box
              sx={{
                py: 8,
                px: 4,
                textAlign: 'center',
                color: 'text.secondary',
              }}
            >
              <Search size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <Typography variant="body2">No results found for "{query}"</Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Try different keywords or check spelling
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer with hints */}
        <Box
          sx={{
            p: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'action.hover',
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Chip label="↑↓" size="small" sx={{ height: 20, fontSize: 11 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Navigate
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Chip label="↵" size="small" sx={{ height: 20, fontSize: 11 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Select
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Chip label="ESC" size="small" sx={{ height: 20, fontSize: 11 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Close
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Command size={12} style={{ color: '#64748b' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              + K to open
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
