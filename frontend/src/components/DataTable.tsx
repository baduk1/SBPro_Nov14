import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { Box } from '@mui/material'

export default function DataTable({ rows, columns, height=520 }: {rows:any[]; columns:GridColDef[]; height?:number}) {
  return (
    <Box sx={{ height }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r)=>r.id || r.code || r.description}
        density="compact"
      />
    </Box>
  )
}
