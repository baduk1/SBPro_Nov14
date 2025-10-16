import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Tabs,
  Tab
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Calculate as CalculateIcon,
  ContentCopy as CopyIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material'
import { mockEstimates, mockEstimateItems, mockCostAdjustments } from '../../mocks/mockData'
import CostCalculator from '../../components/CostCalculator'
import { generateBidProposal } from '../../services/pdfExport'

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

export default function EstimateDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)

  const estimate = mockEstimates.find(e => e.id === id)
  const items = mockEstimateItems.filter(item => item.estimate_id === id)
  const adjustments = mockCostAdjustments.filter(adj => adj.estimate_id === id)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const handleExportPDF = () => {
    if (!estimate) return
    generateBidProposal(estimate, items, adjustments)
  }

  if (!estimate) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Estimate not found</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={() => navigate('/app/estimates')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" mb={0.5}>
            {estimate.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {estimate.description || 'No description'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<CopyIcon />}
          onClick={() => alert('Duplicate - to be implemented')}
        >
          Duplicate
        </Button>
        <Button
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={handleExportPDF}
          aria-label="Export bid proposal as PDF"
        >
          Export PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/app/estimates/${id}/edit`)}
        >
          Edit
        </Button>
      </Stack>

      {/* Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="start">
            <Box>
              <Stack direction="row" spacing={1} mb={2}>
                <Chip label={estimate.status.toUpperCase()} color="primary" />
                <Chip label={`${items.length} Items`} variant="outlined" />
                <Chip label={new Date(estimate.created_at).toLocaleDateString()} variant="outlined" />
              </Stack>
            </Box>

            <Box sx={{ textAlign: 'right', minWidth: 250 }}>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Base Total
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(estimate.base_total)}
                  </Typography>
                </Box>

                {estimate.adjustments_total > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Adjustments
                      </Typography>
                      <Typography variant="body1" color="success.main">
                        +{formatCurrency(estimate.adjustments_total)}
                      </Typography>
                    </Box>
                  </>
                )}

                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Final Total
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatCurrency(estimate.final_total)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Items" />
          <Tab label="Cost Calculator" icon={<CalculateIcon />} iconPosition="end" />
          <Tab label="History" />
        </Tabs>
      </Box>

      {/* Items Tab */}
      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell align="center"><strong>Quantity</strong></TableCell>
                <TableCell align="center"><strong>Unit</strong></TableCell>
                <TableCell align="right"><strong>Unit Price</strong></TableCell>
                <TableCell align="right"><strong>Total</strong></TableCell>
                <TableCell align="center"><strong>Source</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {item.description}
                    {item.supplier_name && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Supplier: {item.supplier_name}
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
                    <Chip
                      label={item.source}
                      size="small"
                      color={item.source === 'takeoff' ? 'primary' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={5} />
                <TableCell align="right">
                  <Typography variant="h6">
                    {formatCurrency(estimate.base_total)}
                  </Typography>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Cost Calculator Tab */}
      <TabPanel value={tabValue} index={1}>
        <CostCalculator estimateId={id!} />
      </TabPanel>

      {/* History Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box textAlign="center" py={6}>
          <Typography variant="body1" color="text.secondary">
            History functionality coming soon
          </Typography>
        </Box>
      </TabPanel>
    </Container>
  )
}
