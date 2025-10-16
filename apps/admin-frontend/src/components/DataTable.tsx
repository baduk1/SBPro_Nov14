import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { Box } from '@mui/material'

type Props = {
  rows: any[]
  columns: GridColDef[]
  height?: number
}

export default function DataTable({ rows, columns, height = 520 }: Props) {
  return (
    <Box sx={{ height }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id || row.code || row.email || row.description}
        density="compact"
      />
    </Box>
  )
}
