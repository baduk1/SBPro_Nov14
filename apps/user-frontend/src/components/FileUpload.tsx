import { useEffect, useRef, useState } from 'react'
import { Box, Button, Stepper, Step, StepLabel, TextField, Typography, Paper, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_URL, uploads, jobs, projects } from '../services/api'

const steps = ['File', 'Details', 'Upload']

export default function FileUpload() {
  const [projectId, setProjectId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [uploadPct, setUploadPct] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loadingProject, setLoadingProject] = useState(true)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  // Load user's first project on mount
  useEffect(() => {
    async function loadProject() {
      try {
        const userProjects = await projects.list()
        if (userProjects.length > 0) {
          setProjectId(userProjects[0].id)
        } else {
          // No projects found - create a default one
          const newProject = await projects.create({ name: 'My First Project' })
          setProjectId(newProject.id)
        }
      } catch (err) {
        console.error('Failed to load project:', err)
      } finally {
        setLoadingProject(false)
      }
    }
    loadProject()
  }, [])

  // Default acceptance: IFC models for take-off
  const accept = '.ifc,model/x-ifc,application/octet-stream'

  // Drag & Drop
  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    const over = (e: DragEvent) => { prevent(e); el.classList.add('drag-over') }
    const leave = (e: DragEvent) => { prevent(e); el.classList.remove('drag-over') }
    const drop = (e: DragEvent) => {
      prevent(e); el.classList.remove('drag-over')
      const f = e.dataTransfer?.files?.[0]
      if (f) setFile(f)
    }
    el.addEventListener('dragover', over)
    el.addEventListener('dragleave', leave)
    el.addEventListener('drop', drop)
    return () => {
      el.removeEventListener('dragover', over)
      el.removeEventListener('dragleave', leave)
      el.removeEventListener('drop', drop)
    }
  }, [])

  async function startUpload() {
    if (!file) return
    setBusy(true); setUploadPct(0)
    try {
      // 1) Presign
      const contentType = file.type || 'application/octet-stream'
      const { file_id, upload_url, headers } = await uploads.presign(projectId, file.name, contentType)
      const absoluteUploadUrl = new URL(upload_url, API_URL).toString()
      // 2) Upload to storage via absolute URL
      await axios.put(absoluteUploadUrl, file, {
        headers: { 'Content-Type': contentType, ...(headers || {}) },
        onUploadProgress: (p) => {
          if (p.total) setUploadPct(Math.round((p.loaded / p.total) * 100))
        },
      })
      // 3) Queue a job
      const job = await jobs.create(projectId, file_id, 'IFC')
      navigate(`/app/jobs/${job.id}`)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const canNextFrom0 = !!file
  const canNextFrom1 = !!projectId

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{mb:3}}>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {activeStep === 0 && (
        <Paper ref={dropRef} variant="outlined" sx={{
          p:4, textAlign:'center', borderStyle:'dashed',
          '&.drag-over': { borderColor: 'primary.main', backgroundColor: 'rgba(0,229,168,0.06)' }
        }}>
          <Typography variant="subtitle1" sx={{mb:2}}>Drag an .IFC file here or choose it from your computer</Typography>
          <Button variant="outlined" component="label">
            Choose file
            <input type="file" hidden accept={accept} onChange={(e)=>setFile(e.target.files?.[0] || null)} />
          </Button>
          {file && <Box sx={{mt:2}}><Chip label={file.name} /></Box>}
          <Box sx={{mt:3}}>
            <Button variant="contained" disabled={!canNextFrom0} onClick={()=>setActiveStep(1)}>
              Next
            </Button>
          </Box>
        </Paper>
      )}

      {activeStep === 1 && (
        <Box sx={{display:'flex', gap:2, alignItems:'center', flexWrap:'wrap'}}>
          <TextField label="Project ID" value={projectId} onChange={(e)=>setProjectId(e.target.value)} />
          {file && <Chip label={file.name} />}
          <Box sx={{flex:1}} />
          <Button variant="outlined" onClick={()=>setActiveStep(0)}>Back</Button>
          <Button variant="contained" disabled={!canNextFrom1} onClick={()=>setActiveStep(2)}>
            Continue to upload
          </Button>
        </Box>
      )}

      {activeStep === 2 && (
        <Box sx={{display:'flex', flexDirection:'column', gap:2}}>
          <Typography>Click “Upload and start” to send the file via the presigned URL and queue a job.</Typography>
          <Box sx={{display:'flex', gap:1}}>
            <Button variant="outlined" onClick={()=>setActiveStep(1)}>Back</Button>
            <Button variant="contained" onClick={startUpload} disabled={busy || !file}>
              Upload and start
            </Button>
          </Box>
          {busy && (
            <Typography>Uploading… {uploadPct}%</Typography>
          )}
        </Box>
      )}
    </Box>
  )
}
