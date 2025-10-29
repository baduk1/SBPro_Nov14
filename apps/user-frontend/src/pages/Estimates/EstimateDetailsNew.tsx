import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileUpload as ImportIcon
} from '@mui/icons-material'
import { estimates, jobs, type EstimateItem, type CostAdjustment } from '../../services/api'

export default function EstimateDetails() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const jobId = searchParams.get('job_id')

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [estimate, setEstimate] = useState<any>(null)
  const [items, setItems] = useState<EstimateItem[]>([])
  const [adjustments, setAdjustments] = useState<CostAdjustment[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [total, setTotal] = useState(0)

  // Line Item Dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EstimateItem | null>(null)
  const [itemForm, setItemForm] = useState({
    description: '',
    element_type: '',
    unit: 'm2',
    quantity: 0,
    unit_price: 0,
    currency: 'GBP',
    notes: ''
  })

  // Adjustment Dialog
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [editingAdjustment, setEditingAdjustment] = useState<CostAdjustment | null>(null)
  const [adjustmentForm, setAdjustmentForm] = useState({
    name: '',
    adjustment_type: 'percentage' as 'percentage' | 'fixed',
    value: 0
  })

  // Import from Job Dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [availableJobs, setAvailableJobs] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>(jobId || '')
  const [importingJob, setImportingJob] = useState(false)

  useEffect(() => {
    if (!isNew && id) {
      loadEstimate()
    } else if (jobId) {
      // Auto-load job info if job_id in URL
      setSelectedJobId(jobId)
      loadJobInfo(jobId)
    }
  }, [id, isNew, jobId])

  // Auto-calculate totals when items or adjustments change
  useEffect(() => {
    calculateTotals()
  }, [items, adjustments])

  const calculateTotals = () => {
    // Calculate subtotal from items
    const newSubtotal = items.reduce((sum, item) => sum + item.total_price, 0)
    setSubtotal(newSubtotal)

    // Calculate total with adjustments
    let runningTotal = newSubtotal
    
    for (const adj of adjustments) {
      if (adj.adjustment_type === 'percentage') {
        runningTotal += newSubtotal * (adj.value / 100)
      } else {
        runningTotal += adj.value
      }
    }

    setTotal(runningTotal)
  }

  const loadEstimate = async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const data = await estimates.get(id)
      setEstimate(data)
      setName(data.name)
      setDescription(data.description || '')
      setItems(data.items || [])
      setAdjustments(data.adjustments || [])
    } catch (err: any) {
      console.error('Load estimate error:', err)
      setError(err?.response?.data?.detail || 'Failed to load estimate')
    } finally {
      setLoading(false)
    }
  }

  const loadJobInfo = async (jId: string) => {
    try {
      const job = await jobs.get(jId)
      const jobDisplayName = job.name || job.file_id || jId.slice(0, 8)
      setName(`Estimate for Job ${jobDisplayName}`)
      setDescription(`Cost estimate based on Job ${jobDisplayName}`)
    } catch (err) {
      console.error('Failed to load job info:', err)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Estimate name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (isNew) {
        const created = await estimates.create({
          name,
          description,
          currency: 'GBP',
          job_id: selectedJobId || undefined,
          items: [],
          adjustments: []
        })
        navigate(`/app/estimates/${created.id}`)
      } else if (id) {
        await estimates.update(id, {
          name,
          description
        })
        await loadEstimate()
      }
    } catch (err: any) {
      console.error('Save estimate error:', err)
      setError(err?.response?.data?.detail || 'Failed to save estimate')
    } finally {
      setSaving(false)
    }
  }

  // ==================== LINE ITEMS ====================

  const openItemDialog = (item?: EstimateItem) => {
    if (item) {
      setEditingItem(item)
      setItemForm({
        description: item.description,
        element_type: item.element_type || '',
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency: item.currency,
        notes: item.notes || ''
      })
    } else {
      setEditingItem(null)
      setItemForm({
        description: '',
        element_type: '',
        unit: 'm2',
        quantity: 0,
        unit_price: 0,
        currency: 'GBP',
        notes: ''
      })
    }
    setItemDialogOpen(true)
  }

  const handleSaveItem = async () => {
    if (!itemForm.description || itemForm.quantity <= 0 || itemForm.unit_price < 0) {
      setError('Please fill in all required fields with valid values')
      return
    }

    if (!id || isNew) {
      // For new estimates, just add to local state
      const newItem: EstimateItem = {
        id: `temp-${Date.now()}`,
        estimate_id: id || '',
        description: itemForm.description,
        element_type: itemForm.element_type,
        unit: itemForm.unit,
        quantity: itemForm.quantity,
        unit_price: itemForm.unit_price,
        total_price: itemForm.quantity * itemForm.unit_price,
        currency: itemForm.currency,
        notes: itemForm.notes,
        sort_order: items.length,
        created_at: new Date().toISOString()
      }
      setItems([...items, newItem])
      setItemDialogOpen(false)
      return
    }

    try {
      const payload = {
        description: itemForm.description,
        element_type: itemForm.element_type || undefined,
        unit: itemForm.unit,
        quantity: itemForm.quantity,
        unit_price: itemForm.unit_price,
        currency: itemForm.currency,
        notes: itemForm.notes || undefined,
        sort_order: items.length
      }

      if (editingItem) {
        const updated = await estimates.updateItem(id, editingItem.id, payload)
        setItems(items.map(item => item.id === editingItem.id ? updated : item))
      } else {
        const created = await estimates.createItem(id, payload)
        setItems([...items, created])
      }

      setItemDialogOpen(false)
      await loadEstimate() // Reload to get updated totals
    } catch (err: any) {
      console.error('Save item error:', err)
      setError(err?.response?.data?.detail || 'Failed to save item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return

    if (!id || isNew || itemId.startsWith('temp-')) {
      // Local state only
      setItems(items.filter(item => item.id !== itemId))
      return
    }

    try {
      await estimates.deleteItem(id, itemId)
      setItems(items.filter(item => item.id !== itemId))
      await loadEstimate()
    } catch (err: any) {
      console.error('Delete item error:', err)
      setError(err?.response?.data?.detail || 'Failed to delete item')
    }
  }

  // ==================== ADJUSTMENTS ====================

  const openAdjustmentDialog = (adjustment?: CostAdjustment) => {
    if (adjustment) {
      setEditingAdjustment(adjustment)
      setAdjustmentForm({
        name: adjustment.name,
        adjustment_type: adjustment.adjustment_type,
        value: adjustment.value
      })
    } else {
      setEditingAdjustment(null)
      setAdjustmentForm({
        name: '',
        adjustment_type: 'percentage',
        value: 0
      })
    }
    setAdjustmentDialogOpen(true)
  }

  const handleSaveAdjustment = async () => {
    if (!adjustmentForm.name || adjustmentForm.value === 0) {
      setError('Please fill in all fields')
      return
    }

    if (!id || isNew) {
      // Local state only
      const newAdj: CostAdjustment = {
        id: `temp-${Date.now()}`,
        estimate_id: id || '',
        name: adjustmentForm.name,
        adjustment_type: adjustmentForm.adjustment_type,
        value: adjustmentForm.value,
        amount: 0, // Will be calculated
        sort_order: adjustments.length,
        created_at: new Date().toISOString()
      }
      setAdjustments([...adjustments, newAdj])
      setAdjustmentDialogOpen(false)
      return
    }

    try {
      const payload = {
        name: adjustmentForm.name,
        adjustment_type: adjustmentForm.adjustment_type,
        value: adjustmentForm.value,
        sort_order: adjustments.length
      }

      if (editingAdjustment) {
        const updated = await estimates.updateAdjustment(id, editingAdjustment.id, payload)
        setAdjustments(adjustments.map(adj => adj.id === editingAdjustment.id ? updated : adj))
      } else {
        const created = await estimates.createAdjustment(id, payload)
        setAdjustments([...adjustments, created])
      }

      setAdjustmentDialogOpen(false)
      await loadEstimate()
    } catch (err: any) {
      console.error('Save adjustment error:', err)
      setError(err?.response?.data?.detail || 'Failed to save adjustment')
    }
  }

  const handleDeleteAdjustment = async (adjId: string) => {
    if (!confirm('Delete this adjustment?')) return

    if (!id || isNew || adjId.startsWith('temp-')) {
      setAdjustments(adjustments.filter(adj => adj.id !== adjId))
      return
    }

    try {
      await estimates.deleteAdjustment(id, adjId)
      setAdjustments(adjustments.filter(adj => adj.id !== adjId))
      await loadEstimate()
    } catch (err: any) {
      console.error('Delete adjustment error:', err)
      setError(err?.response?.data?.detail || 'Failed to delete adjustment')
    }
  }

  // ==================== IMPORT FROM JOB ====================

  const handleOpenImportDialog = async () => {
    try {
      const jobsList = await jobs.list()
      setAvailableJobs(jobsList.filter((j: any) => j.status === 'completed'))
      setImportDialogOpen(true)
    } catch (err) {
      console.error('Failed to load jobs:', err)
      setError('Failed to load jobs list')
    }
  }

  const handleImportFromJob = async () => {
    if (!selectedJobId) {
      setError('Please select a job')
      return
    }

    setImportingJob(true)
    setError(null)

    try {
      const boqItems = await jobs.getBoq(selectedJobId)
      
      // Convert BOQ items to Estimate items
      const newItems: EstimateItem[] = boqItems.map((boqItem: any, index: number) => ({
        id: `temp-${Date.now()}-${index}`,
        estimate_id: id || '',
        boq_item_id: boqItem.id,
        description: boqItem.element_type || boqItem.description || 'Unknown',
        element_type: boqItem.element_type,
        unit: boqItem.unit,
        quantity: boqItem.quantity,
        unit_price: boqItem.unit_price || 0,
        total_price: (boqItem.quantity || 0) * (boqItem.unit_price || 0),
        currency: boqItem.currency || 'GBP',
        sort_order: index,
        created_at: new Date().toISOString()
      }))

      setItems([...items, ...newItems])
      setImportDialogOpen(false)

      // If estimate already exists, save items to backend
      if (id && !isNew) {
        for (const item of newItems) {
          await estimates.createItem(id, {
            boq_item_id: item.boq_item_id,
            description: item.description,
            element_type: item.element_type,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            currency: item.currency,
            sort_order: item.sort_order
          })
        }
        await loadEstimate()
      }
    } catch (err: any) {
      console.error('Import from job error:', err)
      setError(err?.response?.data?.detail || 'Failed to import items from job')
    } finally {
      setImportingJob(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
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
        <IconButton onClick={() => navigate('/app/estimates')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ ml: 2 }}>
          {isNew ? 'Create Estimate' : 'Estimate Details'}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Estimate Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <TextField
              label="Estimate Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              placeholder="e.g., House Construction Quote"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., Cost estimate for 2-story house construction"
            />

            {selectedJobId && (
              <Chip 
                label={`Linked to Job: ${selectedJobId.slice(0, 8)}...`} 
                color="primary" 
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Line Items</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImportIcon />}
                onClick={handleOpenImportDialog}
              >
                Import from Job
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => openItemDialog()}
              >
                Add Item
              </Button>
            </Stack>
          </Stack>

          {items.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell align="center"><strong>Qty</strong></TableCell>
                  <TableCell align="center"><strong>Unit</strong></TableCell>
                  <TableCell align="right"><strong>Unit Price</strong></TableCell>
                  <TableCell align="right"><strong>Total</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2">{item.description}</Typography>
                      {item.element_type && (
                        <Typography variant="caption" color="text.secondary">
                          {item.element_type}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell align="center">{item.unit}</TableCell>
                    <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(item.total_price)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openItemDialog(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert severity="info">
              No items yet. Click "Add Item" to add line items manually, or "Import from Job" to load items from a completed job.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>Cost Summary</Typography>
        
        <Stack spacing={2}>
          {/* Subtotal */}
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body1">Subtotal:</Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatCurrency(subtotal)}
            </Typography>
          </Stack>

          {/* Adjustments */}
          {adjustments.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">
                Adjustments:
              </Typography>

              {adjustments.map((adj) => {
                const amount = adj.adjustment_type === 'percentage' 
                  ? subtotal * (adj.value / 100)
                  : adj.value
                
                return (
                  <Stack key={adj.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">
                        {adj.name}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({adj.adjustment_type === 'percentage' ? `${adj.value}%` : formatCurrency(adj.value)})
                        </Typography>
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color={amount >= 0 ? 'success.main' : 'error.main'}>
                        {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
                      </Typography>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openAdjustmentDialog(adj)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteAdjustment(adj.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                )
              })}
            </>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => openAdjustmentDialog()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add Adjustment
          </Button>

          <Divider />

          {/* Total */}
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6" color="primary">
              {formatCurrency(total)}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* Actions */}
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Estimate'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/app/estimates')}>
          Cancel
        </Button>
      </Stack>

      {/* ==================== DIALOGS ==================== */}

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Line Item' : 'Add Line Item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              fullWidth
              required
              placeholder="e.g., Brick walls, Concrete floors"
            />

            <TextField
              label="Element Type (Optional)"
              value={itemForm.element_type}
              onChange={(e) => setItemForm({ ...itemForm, element_type: e.target.value })}
              fullWidth
              placeholder="e.g., Wall, Floor, Column"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Quantity"
                type="number"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: parseFloat(e.target.value) || 0 })}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
              />

              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  label="Unit"
                >
                  <MenuItem value="m2">m² (Square meter)</MenuItem>
                  <MenuItem value="m3">m³ (Cubic meter)</MenuItem>
                  <MenuItem value="m">m (Linear meter)</MenuItem>
                  <MenuItem value="piece">piece</MenuItem>
                  <MenuItem value="kg">kg</MenuItem>
                  <MenuItem value="ton">ton</MenuItem>
                  <MenuItem value="hour">hour</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Unit Price"
              type="number"
              value={itemForm.unit_price}
              onChange={(e) => setItemForm({ ...itemForm, unit_price: parseFloat(e.target.value) || 0 })}
              fullWidth
              required
              inputProps={{ min: 0, step: 0.01 }}
              helperText={`Total: ${formatCurrency(itemForm.quantity * itemForm.unit_price)}`}
            />

            <TextField
              label="Notes (Optional)"
              value={itemForm.notes}
              onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveItem} variant="contained">
            {editingItem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onClose={() => setAdjustmentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAdjustment ? 'Edit Adjustment' : 'Add Adjustment'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={adjustmentForm.name}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, name: e.target.value })}
              fullWidth
              required
              placeholder="e.g., Markup, VAT, Discount"
            />

            <FormControl component="fieldset">
              <FormLabel component="legend">Type</FormLabel>
              <RadioGroup
                value={adjustmentForm.adjustment_type}
                onChange={(e) => setAdjustmentForm({ 
                  ...adjustmentForm, 
                  adjustment_type: e.target.value as 'percentage' | 'fixed' 
                })}
              >
                <FormControlLabel 
                  value="percentage" 
                  control={<Radio />} 
                  label="Percentage (%) of Subtotal" 
                />
                <FormControlLabel 
                  value="fixed" 
                  control={<Radio />} 
                  label="Fixed Amount (£)" 
                />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Value"
              type="number"
              value={adjustmentForm.value}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, value: parseFloat(e.target.value) || 0 })}
              fullWidth
              required
              inputProps={{ step: 0.01 }}
              helperText={
                adjustmentForm.adjustment_type === 'percentage' 
                  ? `Amount: ${formatCurrency(subtotal * (adjustmentForm.value / 100))}`
                  : 'Enter fixed amount in GBP'
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveAdjustment} variant="contained">
            {editingAdjustment ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import from Job Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Items from Job</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Select a completed job to import its BOQ items into this estimate.
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Select Job</InputLabel>
              <Select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                label="Select Job"
              >
                {availableJobs.map((job: any) => (
                  <MenuItem key={job.id} value={job.id}>
                    Job {job.id.slice(0, 8)}... (Status: {job.status})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {availableJobs.length === 0 && (
              <Alert severity="info">
                No completed jobs found. Complete a job with BOQ items first.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleImportFromJob} 
            variant="contained"
            disabled={!selectedJobId || importingJob}
          >
            {importingJob ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
