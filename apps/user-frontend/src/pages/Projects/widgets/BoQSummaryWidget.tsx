/**
 * BoQSummaryWidget Component
 *
 * Displays Bill of Quantities summary metrics:
 * - Total items count
 * - Total value with currency
 * - Progress percentage (items with prices)
 */

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Skeleton,
  Alert,
} from '@mui/material'
import {
  TableChart as BoqIcon,
  TrendingUp as ValueIcon,
  CheckCircle as ProgressIcon,
} from '@mui/icons-material'
import { jobs } from '../../../services/api'
import { useProjectContext } from '../../../hooks/useProjectContext'

interface BoQSummaryWidgetProps {
  projectId: string
}

interface BoQSummary {
  totalItems: number
  totalValue: number
  itemsWithPrices: number
  progressPercent: number
}

export default function BoQSummaryWidget({ projectId }: BoQSummaryWidgetProps) {
  const { currency } = useProjectContext(projectId)
  const [summary, setSummary] = useState<BoQSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBoQSummary = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get all jobs for this project
        const allJobs = await jobs.list()
        const projectJobs = allJobs.filter((job) => job.project_id === projectId)

        if (projectJobs.length === 0) {
          setSummary({
            totalItems: 0,
            totalValue: 0,
            itemsWithPrices: 0,
            progressPercent: 0,
          })
          setLoading(false)
          return
        }

        // For simplicity, use the first completed job's BoQ
        // TODO: In future, aggregate across all jobs or use project-level BoQ API
        const completedJob = projectJobs.find((job) => job.status === 'COMPLETED')
        if (!completedJob) {
          setSummary({
            totalItems: 0,
            totalValue: 0,
            itemsWithPrices: 0,
            progressPercent: 0,
          })
          setLoading(false)
          return
        }

        const boqItems = await jobs.getBoq(completedJob.id)

        const totalItems = boqItems.length
        const itemsWithPrices = boqItems.filter(
          (item: any) => item.unit_price != null && item.unit_price > 0
        ).length
        const totalValue = boqItems.reduce(
          (sum: number, item: any) =>
            sum + (item.unit_price || 0) * (item.qty || 0),
          0
        )
        const progressPercent = totalItems > 0 ? (itemsWithPrices / totalItems) * 100 : 0

        setSummary({
          totalItems,
          totalValue,
          itemsWithPrices,
          progressPercent,
        })
      } catch (err) {
        console.error('[BoQSummaryWidget] Failed to fetch BoQ summary:', err)
        setError('Failed to load BoQ summary')
      } finally {
        setLoading(false)
      }
    }

    fetchBoQSummary()
  }, [projectId])

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            BoQ Summary
          </Typography>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="rectangular" height={60} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            BoQ Summary
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.totalItems === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            BoQ Summary
          </Typography>
          <Alert severity="info">
            No BoQ data available yet. Upload a file (IFC, PDF, DWG) to get started.
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          BoQ Summary
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <BoqIcon fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">
              Total Items
            </Typography>
          </Box>
          <Typography variant="h5">{summary.totalItems}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ValueIcon fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary">
              Total Value
            </Typography>
          </Box>
          <Typography variant="h5">{formatCurrency(summary.totalValue)}</Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ProgressIcon fontSize="small" color="success" />
            <Typography variant="body2" color="text.secondary">
              Pricing Progress
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={summary.progressPercent}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" fontWeight="bold">
              {Math.round(summary.progressPercent)}%
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {summary.itemsWithPrices} of {summary.totalItems} items priced
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
