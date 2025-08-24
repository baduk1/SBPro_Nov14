import { useEffect, useState } from 'react'
import { Box, Typography, Button, TextField, Paper } from '@mui/material'
import api from '../services/api'

export default function AdminMappings() {
  const [dwg, setDwg] = useState<any[]>([])
  const [ifc, setIfc] = useState<any[]>([])

  const load = async ()=>{
    const [a,b] = await Promise.all([ api.get('/mappings/dwg-layers'), api.get('/mappings/ifc-classes') ])
    setDwg(a.data); setIfc(b.data)
  }
  useEffect(()=>{ load() }, [])

  const save = async ()=>{
    await api.put('/mappings/dwg-layers', dwg)
    await api.put('/mappings/ifc-classes', ifc)
    alert('Saved.')
  }

  const addDwg = ()=> setDwg(prev => [...prev, { layer_name:'NewLayer', element_type:'Element', default_unit:'m', default_code:'' }])
  const addIfc = ()=> setIfc(prev => [...prev, { ifc_class:'IfcWall', element_type:'Wall', default_unit:'m', default_code:'E10/100' }])

  return (
    <Box>
      <Typography variant="h5" sx={{mb:2}}>Admin • Mappings</Typography>
      <Paper sx={{p:2, mb:2}}>
        <Typography variant="h6">DWG Layers</Typography>
        {dwg.map((r,idx)=>(
          <Box key={idx} sx={{display:'grid', gridTemplateColumns:'180px 160px 80px 160px', gap:1, my:0.5}}>
            <TextField size="small" label="Layer" value={r.layer_name} onChange={(e)=>{ const v=[...dwg]; v[idx]={...v[idx], layer_name:e.target.value}; setDwg(v) }} />
            <TextField size="small" label="Type" value={r.element_type} onChange={(e)=>{ const v=[...dwg]; v[idx]={...v[idx], element_type:e.target.value}; setDwg(v) }} />
            <TextField size="small" label="Unit" value={r.default_unit} onChange={(e)=>{ const v=[...dwg]; v[idx]={...v[idx], default_unit:e.target.value}; setDwg(v) }} />
            <TextField size="small" label="Code" value={r.default_code||''} onChange={(e)=>{ const v=[...dwg]; v[idx]={...v[idx], default_code:e.target.value}; setDwg(v) }} />
          </Box>
        ))}
        <Button onClick={addDwg}>Add layer</Button>
      </Paper>

      <Paper sx={{p:2}}>
        <Typography variant="h6">IFC Classes</Typography>
        {ifc.map((r,idx)=>(
          <Box key={idx} sx={{display:'grid', gridTemplateColumns:'180px 160px 80px 160px', gap:1, my:0.5}}>
            <TextField size="small" label="IFC Class" value={r.ifc_class} onChange={(e)=>{ const v=[...ifc]; v[idx]={...v[idx], ifc_class:e.target.value}; setIfc(v) }} />
            <TextField size="small" label="Type" value={r.element_type} onChange={(e)=>{ const v=[...ifc]; v[idx]={...v[idx], element_type:e.target.value}; setIfc(v) }} />
            <TextField size="small" label="Unit" value={r.default_unit} onChange={(e)=>{ const v=[...ifc]; v[idx]={...v[idx], default_unit:e.target.value}; setIfc(v) }} />
            <TextField size="small" label="Code" value={r.default_code||''} onChange={(e)=>{ const v=[...ifc]; v[idx]={...v[idx], default_code:e.target.value}; setIfc(v) }} />
          </Box>
        ))}
        <Button onClick={addIfc}>Add class</Button>
      </Paper>

      <Box sx={{mt:2}}>
        <Button variant="contained" onClick={save}>Save mappings</Button>
      </Box>
    </Box>
  )
}
