import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box, Typography, Paper, Stack, Button, Alert,
  FormControl, InputLabel, Select, MenuItem, Chip, Divider
} from '@mui/material'
import { Store as StoreIcon } from '@mui/icons-material'
import DataTable from '../components/DataTable'
import AIMappingSuggestions from '../components/AIMappingSuggestions'
import { jobs, artifacts as artifactsApi, suppliers, TakeoffItem, Artifact, Supplier, API_URL } from '../services/api'

export default function TakeoffPreview() {
  const { id } = useParams()
  const [rows, setRows] = useState<TakeoffItem[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [loadingApply, setLoadingApply] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | 'pdf' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(()=>{
    let alive = true
    const load = async ()=>{
      if (!id) return
      try {
        const data = await jobs.takeoff(id)
        if (alive) setRows(data)
      } catch {/* ignore */}
    }
    load()
    return ()=>{ alive=false }
  }, [id])

  useEffect(()=>{
    let alive = true
    const loadArtifacts = async () => {
      if (!id) return
      try {
        const data = await jobs.artifacts(id)
        if (alive) setArtifacts(data)
      } catch { /* ignore */ }
    }
    loadArtifacts()
    return ()=>{ alive = false }
  }, [id])

  // Load suppliers
  useEffect(() => {
    let alive = true
    const loadSuppliers = async () => {
      try {
        const data = await suppliers.list()
        if (alive) {
          setSuppliersList(data)
          // Auto-select default supplier if exists
          const defaultSupplier = data.find(s => s.is_default)
          if (defaultSupplier && !selectedSupplierId) {
            setSelectedSupplierId(defaultSupplier.id)
          }
        }
      } catch (e: any) {
        console.error('Failed to load suppliers:', e)
      }
    }
    loadSuppliers()
    return () => { alive = false }
  }, [])

  const selectedSupplier = useMemo(
    () => suppliersList.find(s => s.id === selectedSupplierId),
    [suppliersList, selectedSupplierId]
  )

  const handleApplyPrices = async () => {
    if (!id) return
    if (!selectedSupplierId) {
      setError('Please select a supplier first')
      return
    }
    setLoadingApply(true)
    setMessage(null)
    setError(null)
    try {
      await jobs.applyPrices(id, selectedSupplierId)
      setMessage(`Prices applied from ${selectedSupplier?.name}`)
      // Reload takeoff to see updated prices
      const updatedData = await jobs.takeoff(id)
      setRows(updatedData)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to apply prices.')
    } finally {
      setLoadingApply(false)
    }
  }

  const refreshArtifacts = async () => {
    if (!id) return
    try {
      const data = await jobs.artifacts(id)
      setArtifacts(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to refresh exports.')
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!id) return
    setExportingFormat(format)
    setMessage(null)
    setError(null)
    try {
      await jobs.export(id, format)
      setMessage(`Exported ${format.toUpperCase()} successfully.`)
      await refreshArtifacts()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to export.')
    } finally {
      setExportingFormat(null)
    }
  }

  const handleDownload = async (artifactId: string) => {
    try {
      const { url } = await artifactsApi.presign(artifactId)
      const target = url.startsWith('http') ? url : new URL(url, API_URL.replace(/\/api\/v1\/?$/, '/') ).toString().replace(/\/?$/, '')
      window.open(target, '_blank', 'noopener')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to generate download link.')
    }
  }

  const formatBytes = (size: number) => {
    if (!size || size <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let idx = 0
    let value = size
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024
      idx += 1
    }
    return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`
  }

  const columns = [
    { field: 'element_type', headerName: 'Type', width: 140 },
    { field: 'description', headerName: 'Description', flex: 1 },
    { field: 'unit', headerName: 'Unit', width: 100 },
    { field: 'qty', headerName: 'Qty', width: 140 },
    { field: 'source_ref', headerName: 'Source', width: 160 },
  ]

  const summary = useMemo(()=>{
    const acc: Record<string,{qty:number; unit:string|null}> = {}
    for (const r of rows) {
      const key = r.element_type || 'Other'
      acc[key] = acc[key] || { qty: 0, unit: r.unit || null }
      acc[key].qty += Number(r.qty || 0)
      if (!acc[key].unit && r.unit) acc[key].unit = r.unit
    }
    return acc
  }, [rows])

  // Get unmapped items (items without price codes)
  const unmappedItems = useMemo(() => {
    return rows
      .filter(r => !r.element_type || r.element_type === 'UNKNOWN' || r.element_type.startsWith('Ifc'))
      .map(r => ({ type: r.element_type || 'UNKNOWN', description: r.description }))
      // Deduplicate by type
      .filter((item, index, self) => self.findIndex(i => i.type === item.type) === index)
  }, [rows])

  const handleApplyMapping = (ifcType: string, code: string) => {
    setRows(prev => prev.map(row =>
      row.element_type === ifcType
        ? { ...row, element_type: code, description: `${row.description} (mapped from ${ifcType})` }
        : row
    ))
    setMessage(`Mapped ${ifcType} to ${code}`)
  }

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Take‑off</Typography>

      {/* Mapping Suggestions */}
      <AIMappingSuggestions
        unmappedItems={unmappedItems}
        onApply={handleApplyMapping}
      />

      {/* Supplier Selection & Pricing */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StoreIcon color="primary" />
          Apply Pricing
        </Typography>

        {suppliersList.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No suppliers found. <a href="/app/suppliers">Create a supplier</a> to apply prices.
          </Alert>
        ) : (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Supplier</InputLabel>
              <Select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                label="Select Supplier"
              >
                {suppliersList.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>{s.name}</span>
                      <Stack direction="row" spacing={0.5}>
                        {s.is_default && <Chip label="Default" size="small" color="warning" />}
                        <Chip label={`${s.price_items_count || 0} items`} size="small" variant="outlined" />
                      </Stack>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedSupplier && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>{selectedSupplier.name}</strong> has {selectedSupplier.price_items_count || 0} price items.
                {selectedSupplier.contact_info && (
                  <> Contact: {selectedSupplier.contact_info}</>
                )}
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={handleApplyPrices}
              disabled={loadingApply || !selectedSupplierId}
              fullWidth
            >
              {loadingApply ? 'Applying…' : `Apply Prices from ${selectedSupplier?.name || 'Supplier'}`}
            </Button>
          </>
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* Export Buttons */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
        <Button variant="outlined" onClick={() => handleExport('xlsx')} disabled={!!exportingFormat}>
          {exportingFormat === 'xlsx' ? 'Exporting…' : 'Export XLSX'}
        </Button>
        <Button variant="outlined" onClick={() => handleExport('csv')} disabled={!!exportingFormat}>
          {exportingFormat === 'csv' ? 'Exporting…' : 'Export CSV'}
        </Button>
        <Button variant="outlined" onClick={() => handleExport('pdf')} disabled={!!exportingFormat}>
          {exportingFormat === 'pdf' ? 'Exporting…' : 'Export PDF'}
        </Button>
      </Stack>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Quick summary by element type */}
      <Box sx={{display:'flex', gap:2, flexWrap:'wrap', mb:2}}>
        {Object.entries(summary).map(([k,v])=>(
          <Paper key={k} sx={{p:1.5}}>
            <Typography variant="subtitle2">{k}</Typography>
            <Typography variant="body2">{v.qty.toLocaleString()} {v.unit || ''}</Typography>
          </Paper>
        ))}
      </Box>

      <DataTable rows={rows} columns={columns as any} />

      {artifacts.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Exports</Typography>
          <Stack spacing={1}>
            {artifacts.map((a) => (
              <Paper key={a.id} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle2">{a.kind.toUpperCase()}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatBytes(a.size)}</Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => handleDownload(a.id)}>Download</Button>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
