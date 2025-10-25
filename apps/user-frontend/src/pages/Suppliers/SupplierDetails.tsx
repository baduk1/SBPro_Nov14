import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  FileUpload as FileUploadIcon,
  Add as AddIcon,
  Star as StarIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { suppliers, Supplier, SupplierPriceItem } from '../../services/api'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function SupplierDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [priceItems, setPriceItems] = useState<SupplierPriceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SupplierPriceItem | null>(null)
  const [itemForm, setItemForm] = useState({
    code: '',
    description: '',
    unit: '',
    price: '',
    currency: 'GBP',
    is_active: true
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const [supplierData, itemsData] = await Promise.all([
        suppliers.get(id),
        suppliers.listPriceItems(id)
      ])
      setSupplier(supplierData)
      setPriceItems(itemsData)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load supplier')
    } finally {
      setLoading(false)
    }
  }

  const handleImportCSV = async () => {
    if (!csvFile || !id) return

    setImporting(true)
    try {
      const result = await suppliers.importPriceItems(id, csvFile)
      alert(`Imported ${result.imported_count} items. Skipped: ${result.skipped_count}`)
      setImportDialogOpen(false)
      setCsvFile(null)
      loadData() // Reload price items
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!id || !confirm('Delete this price item?')) return

    try {
      await suppliers.deletePriceItem(id, itemId)
      setPriceItems(priceItems.filter(item => item.id !== itemId))
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete item')
    }
  }

  const openItemDialog = (item?: SupplierPriceItem) => {
    if (item) {
      setEditingItem(item)
      setItemForm({
        code: item.code,
        description: item.description,
        unit: item.unit,
        price: (item.price / 100).toFixed(2), // Convert from minor units
        currency: item.currency,
        is_active: item.is_active
      })
    } else {
      setEditingItem(null)
      setItemForm({
        code: '',
        description: '',
        unit: '',
        price: '',
        currency: 'GBP',
        is_active: true
      })
    }
    setItemDialogOpen(true)
  }

  const handleSaveItem = async () => {
    if (!id) return

    try {
      const priceFloat = parseFloat(itemForm.price)
      if (isNaN(priceFloat)) {
        alert('Invalid price')
        return
      }

      const payload = {
        code: itemForm.code,
        description: itemForm.description,
        unit: itemForm.unit,
        price: Math.round(priceFloat * 100), // Convert to minor units
        currency: itemForm.currency,
        is_active: itemForm.is_active
      }

      if (editingItem) {
        const updated = await suppliers.updatePriceItem(id, editingItem.id, payload)
        setPriceItems(priceItems.map(item => item.id === editingItem.id ? updated : item))
      } else {
        const created = await suppliers.createPriceItem(id, payload)
        setPriceItems([...priceItems, created])
      }

      setItemDialogOpen(false)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to save item')
    }
  }

  const filteredItems = priceItems.filter(item =>
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (error || !supplier) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Supplier not found'}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => navigate('/app/suppliers')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
            <Typography variant="h4">
              {supplier.name}
            </Typography>
            {supplier.is_default && (
              <StarIcon color="warning" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Created {new Date(supplier.created_at).toLocaleDateString()}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/app/suppliers/${id}/edit`)}
        >
          Edit
        </Button>
      </Stack>

      {/* Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Contact Information
          </Typography>
          <Typography variant="body1" mb={2}>
            {supplier.contact_info || 'No contact information provided'}
          </Typography>

          <Stack direction="row" spacing={2}>
            <Chip
              label={`${supplier.price_items_count || 0} Price Items`}
              color="primary"
              variant="outlined"
            />
            {supplier.is_default && (
              <Chip label="Default Supplier" color="warning" />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Price List" />
          <Tab label="History" />
        </Tabs>
      </Box>

      {/* Price List Tab */}
      <TabPanel value={tabValue} index={0}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <TextField
            placeholder="Search price items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ width: 300 }}
          />
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => openItemDialog()}
            >
              Add Item
            </Button>
          </Stack>
        </Stack>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell align="center"><strong>Unit</strong></TableCell>
                <TableCell align="right"><strong>Price</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell align="center">{item.unit}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      £{item.price.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={item.is_active ? 'Active' : 'Inactive'}
                      color={item.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <IconButton
                        size="small"
                        onClick={() => openItemDialog(item)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredItems.length === 0 && (
          <Box textAlign="center" py={6}>
            <Typography variant="body1" color="text.secondary">
              {searchQuery ? 'No matching price items found' : 'No price items yet'}
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* History Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box textAlign="center" py={6}>
          <Typography variant="body1" color="text.secondary">
            History functionality coming soon
          </Typography>
        </Box>
      </TabPanel>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onClose={() => !importing && setImportDialogOpen(false)}>
        <DialogTitle>Import Price Items from CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload a CSV file with columns: code, description, unit, price, currency
          </Typography>
          <Button
            variant="outlined"
            component="label"
            fullWidth
          >
            {csvFile ? csvFile.name : 'Choose CSV File'}
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImportCSV}
            variant="contained"
            disabled={!csvFile || importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Price Item Dialog */}
      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Price Item' : 'Add Price Item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Code"
              required
              fullWidth
              value={itemForm.code}
              onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
              placeholder="e.g. BRK-001"
            />
            <TextField
              label="Description"
              required
              fullWidth
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              placeholder="e.g. Standard Brick"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Unit"
                required
                fullWidth
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="e.g. m2, piece"
              />
              <TextField
                label="Price"
                required
                fullWidth
                type="number"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                placeholder="50.00"
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Stack>
            <TextField
              label="Currency"
              required
              fullWidth
              value={itemForm.currency}
              onChange={(e) => setItemForm({ ...itemForm, currency: e.target.value })}
              placeholder="GBP"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={itemForm.is_active}
                  onChange={(e) => setItemForm({ ...itemForm, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveItem}
            variant="contained"
            disabled={!itemForm.code || !itemForm.description || !itemForm.unit || !itemForm.price}
          >
            {editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
