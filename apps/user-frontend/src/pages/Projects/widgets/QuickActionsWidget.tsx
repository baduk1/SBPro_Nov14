/**
 * QuickActionsWidget Component
 *
 * Provides quick access to common project actions:
 * - Upload file (IFC, PDF, DWG)
 * - Apply Pricing
 * - Export BoQ
 */

import { Card, CardContent, Typography, Button, Stack } from '@mui/material'
import {
  Upload as UploadIcon,
  AttachMoney as PricingIcon,
  Download as ExportIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

interface QuickActionsWidgetProps {
  projectId: string
}

export default function QuickActionsWidget({ projectId }: QuickActionsWidgetProps) {
  const navigate = useNavigate()

  const handleUpload = () => {
    navigate(`/app/upload?project=${projectId}`)
  }

  const handlePricing = () => {
    navigate(`/app/projects/${projectId}/boq`)
  }

  const handleExport = () => {
    navigate(`/app/projects/${projectId}/boq`)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Stack spacing={2}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUpload}
            fullWidth
          >
            Upload File
          </Button>
          <Button
            variant="outlined"
            startIcon={<PricingIcon />}
            onClick={handlePricing}
            fullWidth
          >
            Apply Pricing
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            fullWidth
          >
            Export BoQ
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
