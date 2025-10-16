import { useState } from 'react'
import { Button, Chip, Stack, Card, CardContent, Typography, Tooltip } from '@mui/material'
import { AutoAwesome as AIIcon } from '@mui/icons-material'

interface Suggestion {
  ifcType: string
  suggestedCode: string
  confidence: number
  reason: string
}

interface Props {
  unmappedItems: Array<{ type: string; description?: string }>
  onApply: (ifcType: string, code: string) => void
}

// Mock AI logic - maps IFC types to price codes
function guessPriceCode(ifcType: string): { code: string; confidence: number; reason: string } {
  const mappings: Record<string, { code: string; confidence: number; reason: string }> = {
    'IfcWall': { code: 'BRK-001', confidence: 0.92, reason: 'Based on similar wall projects' },
    'IfcSlab': { code: 'CEM-001', confidence: 0.88, reason: 'Standard concrete slab mapping' },
    'IfcBeam': { code: 'STL-001', confidence: 0.85, reason: 'Typical steel beam specification' },
    'IfcColumn': { code: 'STL-002', confidence: 0.87, reason: 'Structural column pattern match' },
    'IfcDoor': { code: 'WOD-001', confidence: 0.90, reason: 'Common door assembly type' },
    'IfcWindow': { code: 'GLZ-001', confidence: 0.89, reason: 'Standard glazing specification' },
    'IfcRoof': { code: 'ROF-001', confidence: 0.86, reason: 'Roof covering material match' },
    'IfcStair': { code: 'STC-001', confidence: 0.84, reason: 'Staircase construction pattern' },
    'IfcRailing': { code: 'MET-003', confidence: 0.83, reason: 'Metal railing standard' },
    'IfcCovering': { code: 'FIN-001', confidence: 0.80, reason: 'Floor/wall covering pattern' }
  }

  return mappings[ifcType] || { code: 'UNKNOWN', confidence: 0.45, reason: 'No historical data available' }
}

export default function AIMappingSuggestions({ unmappedItems, onApply }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateSuggestions = () => {
    setIsGenerating(true)

    // Simulate AI processing delay
    setTimeout(() => {
      const newSuggestions = unmappedItems.map(item => {
        const { code, confidence, reason } = guessPriceCode(item.type)
        return {
          ifcType: item.type,
          suggestedCode: code,
          confidence,
          reason
        }
      })
      setSuggestions(newSuggestions)
      setIsGenerating(false)
    }, 800)
  }

  const handleApply = (suggestion: Suggestion) => {
    onApply(suggestion.ifcType, suggestion.suggestedCode)
    // Remove applied suggestion
    setSuggestions(prev => prev.filter(s => s.ifcType !== suggestion.ifcType))
  }

  if (unmappedItems.length === 0) {
    return null
  }

  return (
    <Card sx={{ mb: 3, bgcolor: 'info.lighter', borderLeft: 4, borderColor: 'info.main' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <AIIcon color="info" />
              <Typography variant="h6">AI Mapping Assistant</Typography>
            </Stack>
            <Button
              variant="contained"
              startIcon={<AIIcon />}
              onClick={generateSuggestions}
              disabled={isGenerating || suggestions.length > 0}
              size="small"
            >
              {isGenerating ? 'Analyzing...' : 'Get Suggestions'}
            </Button>
          </Stack>

          {suggestions.length === 0 && !isGenerating && (
            <Typography variant="body2" color="text.secondary">
              Found {unmappedItems.length} unmapped item{unmappedItems.length !== 1 ? 's' : ''}.
              Click "Get Suggestions" to auto-map using AI.
            </Typography>
          )}

          {suggestions.length > 0 && (
            <>
              <Typography variant="body2" color="text.secondary">
                AI suggestions ready. Click to apply:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {suggestions.map(s => (
                  <Tooltip
                    key={s.ifcType}
                    title={`${s.reason} (${Math.round(s.confidence * 100)}% confidence)`}
                    arrow
                  >
                    <Chip
                      label={`${s.ifcType} → ${s.suggestedCode}`}
                      onClick={() => handleApply(s)}
                      color={s.confidence >= 0.8 ? 'success' : s.confidence >= 0.6 ? 'warning' : 'default'}
                      variant={s.confidence >= 0.8 ? 'filled' : 'outlined'}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { transform: 'scale(1.05)' }
                      }}
                      role="button"
                      aria-label={`Apply mapping for ${s.ifcType}`}
                    />
                  </Tooltip>
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                💡 Tip: Green = high confidence, Orange = medium, Gray = low (review recommended)
              </Typography>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
