import { useEffect, useState } from 'react'
import { Box, Button, Paper, TextField, Typography } from '@mui/material'
import api from '../services/api'

type DwgLayer = {
  layer_name: string
  element_type: string
  default_unit: string
  default_code?: string | null
}

type IfcClass = {
  ifc_class: string
  element_type: string
  default_unit: string
  default_code?: string | null
}

export default function AdminMappings() {
  const [dwgLayers, setDwgLayers] = useState<DwgLayer[]>([])
  const [ifcClasses, setIfcClasses] = useState<IfcClass[]>([])

  const load = async () => {
    const [dwg, ifc] = await Promise.all([
      api.get<DwgLayer[]>('/admin/mappings/dwg-layers'),
      api.get<IfcClass[]>('/admin/mappings/ifc-classes'),
    ])
    setDwgLayers(dwg.data)
    setIfcClasses(ifc.data)
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    await api.put('/admin/mappings/dwg-layers', dwgLayers)
    await api.put('/admin/mappings/ifc-classes', ifcClasses)
    await load()
  }

  const updateDwg = (index: number, key: keyof DwgLayer, value: string) => {
    setDwgLayers((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  const updateIfc = (index: number, key: keyof IfcClass, value: string) => {
    setIfcClasses((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Mappings</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>DWG layers</Typography>
        {dwgLayers.map((row, idx) => (
          <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, mb: 1 }}>
            <TextField label="Layer" value={row.layer_name} onChange={(e) => updateDwg(idx, 'layer_name', e.target.value)} size="small" />
            <TextField label="Type" value={row.element_type} onChange={(e) => updateDwg(idx, 'element_type', e.target.value)} size="small" />
            <TextField label="Unit" value={row.default_unit} onChange={(e) => updateDwg(idx, 'default_unit', e.target.value)} size="small" />
            <TextField label="Code" value={row.default_code ?? ''} onChange={(e) => updateDwg(idx, 'default_code', e.target.value)} size="small" />
          </Box>
        ))}
        <Button onClick={() => setDwgLayers((prev) => [...prev, { layer_name: 'NewLayer', element_type: 'Element', default_unit: 'm', default_code: '' }])}>
          Add layer
        </Button>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>IFC classes</Typography>
        {ifcClasses.map((row, idx) => (
          <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, mb: 1 }}>
            <TextField label="IFC Class" value={row.ifc_class} onChange={(e) => updateIfc(idx, 'ifc_class', e.target.value)} size="small" />
            <TextField label="Type" value={row.element_type} onChange={(e) => updateIfc(idx, 'element_type', e.target.value)} size="small" />
            <TextField label="Unit" value={row.default_unit} onChange={(e) => updateIfc(idx, 'default_unit', e.target.value)} size="small" />
            <TextField label="Code" value={row.default_code ?? ''} onChange={(e) => updateIfc(idx, 'default_code', e.target.value)} size="small" />
          </Box>
        ))}
        <Button onClick={() => setIfcClasses((prev) => [...prev, { ifc_class: 'IfcWall', element_type: 'Wall', default_unit: 'm', default_code: '' }])}>
          Add class
        </Button>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={save}>Save mappings</Button>
      </Box>
    </Box>
  )
}
