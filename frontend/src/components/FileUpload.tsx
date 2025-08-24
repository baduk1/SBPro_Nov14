import { useState } from 'react'
import { Box, Button, TextField, MenuItem } from '@mui/material'
import api, { API_URL } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function FileUpload(){
  const [projectId, setProjectId] = useState('demo-project')
  const [file, setFile] = useState<File|null>(null)
  const [type, setType] = useState<'IFC'|'DWG'>('DWG')
  const navigate = useNavigate()

  const onSubmit = async () => {
    if(!file) return
    const presign = await api.post('/files', null, { params: { project_id: projectId, filename: file.name, ftype: type }})
    const { file_id, upload_url } = presign.data
    const body = await file.arrayBuffer()
    await fetch(`${API_URL}${upload_url}`, { method: 'PUT', body })
    const job = await api.post('/jobs', { project_id: projectId, file_id, price_list_id: null })
    navigate(`/app/jobs/${job.data.id}`)
  }

  return (
    <Box sx={{display:'flex', gap:2, alignItems:'center', flexWrap:'wrap'}}>
      <TextField label="Project ID" value={projectId} onChange={(e)=>setProjectId(e.target.value)} />
      <TextField select label="Type" value={type} onChange={(e)=>setType(e.target.value as any)} sx={{width:140}}>
        <MenuItem value="DWG">DWG</MenuItem>
        <MenuItem value="IFC">IFC</MenuItem>
      </TextField>
      <Button variant="outlined" component="label">
        Choose File
        <input type="file" hidden onChange={(e)=>setFile(e.target.files?.[0] || null)} />
      </Button>
      <Button variant="contained" onClick={onSubmit} disabled={!file}>Upload & Start</Button>
    </Box>
  )
}
