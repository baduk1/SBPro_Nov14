// Extended types for new features (Suppliers, Templates, Estimates, etc.)

// ==================== SUPPLIERS ====================

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
  effective_from?: string
  is_active: boolean
  created_at: string
}

// ==================== TEMPLATES ====================

export interface Template {
  id: string
  user_id: string
  name: string
  description?: string
  template_type: 'mapping' | 'pricing' | 'export'
  config_json?: string
  is_public: boolean
  created_at: string
  updated_at?: string
  mappings_count?: number
}

export interface TemplateMapping {
  id: string
  template_id: string
  source_code: string
  target_code: string
  allowance_percent: number
}

// ==================== ESTIMATES ====================

export interface Estimate {
  id: string
  user_id: string
  project_id?: string
  job_id?: string
  name: string
  description?: string
  base_total: number
  adjustments_total: number
  final_total: number
  currency: string
  status: 'draft' | 'final' | 'archived'
  created_at: string
  updated_at?: string
  items_count?: number
  adjustments_count?: number
}

export interface EstimateItem {
  id: string
  estimate_id: string
  code: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  source: 'takeoff' | 'manual' | 'template'
  supplier_id?: string
  supplier_name?: string
}

export interface CostAdjustment {
  id: string
  estimate_id: string
  category: 'overhead' | 'profit' | 'tax' | 'logistics' | 'custom'
  name: string
  calculation_type: 'percent' | 'fixed' | 'per_unit'
  value: number
  applied_to: 'subtotal' | 'total' | 'specific_items'
  order: number
  created_at: string
  calculated_amount?: number
}

// ==================== PROJECTS ====================

export interface ProjectHistory {
  id: string
  project_id: string
  event_type: 'created' | 'updated' | 'estimate_added' | 'job_completed'
  description: string
  user_id: string
  user_name?: string
  created_at: string
  metadata?: Record<string, any>
}

export interface BillingRecord {
  id: string
  user_id: string
  project_id?: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  due_date?: string
  paid_date?: string
  created_at: string
  description?: string
}
