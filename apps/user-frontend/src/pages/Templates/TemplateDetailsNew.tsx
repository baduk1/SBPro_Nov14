import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon
} from '@mui/icons-material'
import { templates, Template, TemplateItem } from '../../services/api'

interface ItemFormData {
  element_type: string
  description: string
  unit: string
  default_unit_price: number
  default_currency: string
  quantity_multiplier: number
  sort_order: number
}

export default function TemplateDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [items, setItems] = useState<TemplateItem[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [itemForm, setItemForm] = useState<ItemFormData>({
    element_type: 'Wall',
    description: '',
    unit: 'm2',
    default_unit_price: 0,
    default_currency: 'GBP',
    quantity_multiplier: 1.0,
    sort_order: 0
  })

  useEffect(() => {
    if (!isNew && id) {
      loadTemplate()
    }
  }, [id, isNew])

  const loadTemplate = async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const data = await templates.get(id)
      setName(data.name)
      setDescription(data.description || '')
      setCategory(data.category || '')
      setIsDefault(data.is_default)
      setItems(data.items)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isNew) {
        const created = await templates.create({
          name,
          description,
          category,
          is_default: isDefault,
          items: items.map(item => ({
            element_type: item.element_type,
            description: item.description,
            unit: item.unit,
            default_unit_price: item.default_unit_price,
            default_currency: item.default_currency,
            quantity_multiplier: item.quantity_multiplier,
            sort_order: item.sort_order
          }))
        })
        navigate(`/app/templates/${created.id}`)
      } else if (id) {
        await templates.update(id, {
          name,
          description,
          category,
          is_default: isDefault
        })
        await loadTemplate()
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = () => {
    const newItem: TemplateItem = {
      id: `temp-${Date.now()}`,
      template_id: id || '',
      ...itemForm,
      created_at: new Date().toISOString()
    }
    setItems([...items, newItem])
    setDialogOpen(false)
    setItemForm({
      element_type: 'Wall',
      description: '',
      unit: 'm2',
      default_unit_price: 0,
      default_currency: 'GBP',
      quantity_multiplier: 1.0,
      sort_order: items.length
    })
  }

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId))
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/app/templates')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ ml: 2 }}>
          {isNew ? 'Create Template' : 'Edit Template'}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Template Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <TextField
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
              placeholder="e.g., Residential, Commercial, Infrastructure"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
              }
              label="Set as default template"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Template Items */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Template Items</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Add Item
            </Button>
          </Stack>

          {items.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Element Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Multiplier</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.element_type}</TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      {item.default_unit_price ? `${item.default_currency} ${item.default_unit_price}` : '-'}
                    </TableCell>
                    <TableCell>{item.quantity_multiplier}x</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                No items yet. Add items to define this template.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Stack direction="row" spacing={2} mt={3}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/app/templates')}>
          Cancel
        </Button>
      </Stack>

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Template Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Element Type</InputLabel>
              <Select
                value={itemForm.element_type}
                onChange={(e) => setItemForm({ ...itemForm, element_type: e.target.value })}
              >
                <MenuItem value="Wall">Wall</MenuItem>
                <MenuItem value="Slab">Slab</MenuItem>
                <MenuItem value="Column">Column</MenuItem>
                <MenuItem value="Beam">Beam</MenuItem>
                <MenuItem value="Roof">Roof</MenuItem>
                <MenuItem value="Door">Door</MenuItem>
                <MenuItem value="Window">Window</MenuItem>
                <MenuItem value="Foundation">Foundation</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Description"
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              fullWidth
            />

            <TextField
              label="Unit"
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              fullWidth
              placeholder="e.g., m2, m3, m, nr"
            />

            <TextField
              label="Default Unit Price"
              type="number"
              value={itemForm.default_unit_price}
              onChange={(e) => setItemForm({ ...itemForm, default_unit_price: parseFloat(e.target.value) || 0 })}
              fullWidth
            />

            <TextField
              label="Currency"
              value={itemForm.default_currency}
              onChange={(e) => setItemForm({ ...itemForm, default_currency: e.target.value })}
              fullWidth
            />

            <TextField
              label="Quantity Multiplier"
              type="number"
              value={itemForm.quantity_multiplier}
              onChange={(e) => setItemForm({ ...itemForm, quantity_multiplier: parseFloat(e.target.value) || 1.0 })}
              fullWidth
              helperText="e.g., 1.1 for 10% waste factor"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddItem} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
