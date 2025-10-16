import axios, { InternalAxiosRequestConfig } from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Shared Axios instance for backend calls (except direct PUT to presigned URL)
const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Auto-redirect to sign-in on authentication errors
    if (err?.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/app/signin'
    }
    return Promise.reject(err)
  }
)

// ===== Types =====
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Job {
  id: string
  project_id: string
  file_id: string
  status: JobStatus
  progress?: number
  created_at?: string
}

export interface PresignResponse {
  file_id: string
  upload_url: string            // Absolute storage URL (S3/GCS/MinIO etc.)
  headers?: Record<string,string> // Optional headers (e.g. x-amz-*)
}

export interface TakeoffItem {
  id: string
  element_type: 'Wall' | 'Slab' | string
  description: string
  unit: string
  qty: number
  source_ref?: string
}

export interface Artifact {
  id: string
  job_id: string
  kind: string
  path: string
  size: number
  checksum?: string | null
}

// ===== Endpoint wrappers =====
export const auth = {
  login: async (email: string, password: string) => {
    const data = new URLSearchParams()
    data.append('username', email)
    data.append('password', password)
    const res = await api.post('/auth/login', data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    return res.data as { access_token: string }
  },
}

export const uploads = {
  presign: async (projectId: string, filename: string, contentType: string, fileType: 'IFC' | 'DWG' | 'DXF' | 'PDF' = 'IFC') => {
    const res = await api.post<PresignResponse>('/files', {
      project_id: projectId,
      filename,
      file_type: fileType,
      content_type: contentType,
    })
    return res.data
  },
}

export const jobs = {
  create: async (projectId: string, fileId: string, fileType: 'IFC') => {
    const res = await api.post<Job>('/jobs', {
      project_id: projectId,
      file_id: fileId,
      file_type: fileType,
    })
    return res.data
  },
  list: async () => {
    const res = await api.get<Job[]>('/jobs')
    return res.data
  },
  get: async (id: string) => {
    const res = await api.get<Job>(`/jobs/${id}`)
    return res.data
  },
  takeoff: async (id: string) => {
    const res = await api.get<TakeoffItem[]>(`/jobs/${id}/takeoff`)
    return res.data
  },
  applyPrices: async (id: string, supplierId?: string, priceListId?: string) => {
    const payload = supplierId ? { supplier_id: supplierId } : priceListId ? { price_list_id: priceListId } : {}
    const res = await api.post(`/jobs/${id}/apply-prices`, payload)
    return res.data
  },
  export: async (id: string, format: 'csv' | 'xlsx' | 'pdf') => {
    const res = await api.post<Artifact>(`/jobs/${id}/export`, null, { params: { format } })
    return res.data
  },
  artifacts: async (id: string) => {
    const res = await api.get<Artifact[]>(`/jobs/${id}/artifacts`)
    return res.data
  },
}

export const artifacts = {
  presign: async (artifactId: string) => {
    const res = await api.post<{ url: string }>(`/artifacts/${artifactId}/presign`)
    return res.data
  },
}

// Supplier types (basic - full types in types/extended.ts)
export interface Supplier {
  id: string
  user_id: string
  name: string
  contact_info?: string
  is_default: boolean
  created_at: string
  price_items_count?: number
}

export interface SupplierPriceItem {
  id: string
  supplier_id: string
  code: string
  description: string
  unit: string
  price: number
  currency: string
  is_active: boolean
  created_at: string
}

export const suppliers = {
  list: async () => {
    const res = await api.get<Supplier[]>('/suppliers')
    return res.data
  },
  get: async (id: string) => {
    const res = await api.get<Supplier>(`/suppliers/${id}`)
    return res.data
  },
  create: async (data: { name: string; contact_info?: string; is_default?: boolean }) => {
    const res = await api.post<Supplier>('/suppliers', data)
    return res.data
  },
  update: async (id: string, data: Partial<{ name: string; contact_info?: string; is_default?: boolean }>) => {
    const res = await api.patch<Supplier>(`/suppliers/${id}`, data)
    return res.data
  },
  delete: async (id: string) => {
    await api.delete(`/suppliers/${id}`)
  },
  listPriceItems: async (id: string) => {
    const res = await api.get<SupplierPriceItem[]>(`/suppliers/${id}/items`)
    return res.data
  },
  createPriceItem: async (id: string, data: Omit<SupplierPriceItem, 'id' | 'supplier_id' | 'created_at'>) => {
    const res = await api.post<SupplierPriceItem>(`/suppliers/${id}/items`, data)
    return res.data
  },
  updatePriceItem: async (id: string, itemId: string, data: Partial<Omit<SupplierPriceItem, 'id' | 'supplier_id' | 'created_at'>>) => {
    const res = await api.patch<SupplierPriceItem>(`/suppliers/${id}/items/${itemId}`, data)
    return res.data
  },
  deletePriceItem: async (id: string, itemId: string) => {
    await api.delete(`/suppliers/${id}/items/${itemId}`)
  },
  importPriceItems: async (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<{ imported_count: number; skipped_count: number; errors: string[] }>(
      `/suppliers/${id}/items/import`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
  },
}

export default api