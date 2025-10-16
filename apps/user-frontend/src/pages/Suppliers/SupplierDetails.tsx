import { useState } from 'react'
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
  Tab
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  FileUpload as FileUploadIcon,
  Add as AddIcon,
  Star as StarIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { mockSuppliers, mockSupplierPriceItems } from '../../mocks/mockData'

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

  const supplier = mockSuppliers.find(s => s.id === id)
  const priceItems = mockSupplierPriceItems.filter(item => item.supplier_id === id)

  const filteredItems = priceItems.filter(item =>
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!supplier) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Supplier not found</Typography>
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
              onClick={() => alert('Import CSV functionality - to be implemented')}
            >
              Import CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => alert('Add price item functionality - to be implemented')}
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
                        onClick={() => alert('Edit item functionality - to be implemented')}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => alert('Delete item functionality - to be implemented')}
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
    </Container>
  )
}
