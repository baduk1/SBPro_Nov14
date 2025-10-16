// Mock data for UI development and presentation

import type {
  Supplier,
  SupplierPriceItem,
  Template,
  TemplateMapping,
  Estimate,
  EstimateItem,
  CostAdjustment,
  ProjectHistory,
  BillingRecord
} from '../types/extended'

// ==================== SUPPLIERS ====================

export const mockSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    user_id: 'user-1',
    name: 'BuildMaster Supplies Ltd',
    contact_info: 'contact@buildmaster.co.uk, +44 20 1234 5678',
    is_default: true,
    created_at: '2025-09-15T10:00:00Z',
    price_items_count: 245
  },
  {
    id: 'sup-2',
    user_id: 'user-1',
    name: 'EcoConstruct Materials',
    contact_info: 'info@ecoconstruct.com, +44 161 987 6543',
    is_default: false,
    created_at: '2025-09-20T14:30:00Z',
    price_items_count: 189
  },
  {
    id: 'sup-3',
    user_id: 'user-1',
    name: 'Premium Steel & Concrete',
    contact_info: 'sales@premiumsteel.co.uk',
    is_default: false,
    created_at: '2025-10-01T09:15:00Z',
    price_items_count: 78
  }
]

export const mockSupplierPriceItems: SupplierPriceItem[] = [
  {
    id: 'item-1',
    supplier_id: 'sup-1',
    code: 'BRK-001',
    description: 'Standard Red Brick 215x102.5x65mm',
    unit: 'unit',
    price: 0.65,
    currency: 'GBP',
    is_active: true,
    created_at: '2025-09-15T10:00:00Z'
  },
  {
    id: 'item-2',
    supplier_id: 'sup-1',
    code: 'CEM-001',
    description: 'Portland Cement 25kg Bag',
    unit: 'bag',
    price: 5.50,
    currency: 'GBP',
    is_active: true,
    created_at: '2025-09-15T10:00:00Z'
  },
  {
    id: 'item-3',
    supplier_id: 'sup-1',
    code: 'STL-001',
    description: 'Reinforcement Steel Bar 12mm',
    unit: 'm',
    price: 8.75,
    currency: 'GBP',
    is_active: true,
    created_at: '2025-09-15T10:00:00Z'
  },
  {
    id: 'item-4',
    supplier_id: 'sup-2',
    code: 'ECO-BRK-001',
    description: 'Recycled Brick 215x102.5x65mm',
    unit: 'unit',
    price: 0.55,
    currency: 'GBP',
    is_active: true,
    created_at: '2025-09-20T14:30:00Z'
  },
  {
    id: 'item-5',
    supplier_id: 'sup-2',
    code: 'ECO-CEM-001',
    description: 'Low-Carbon Cement 25kg',
    unit: 'bag',
    price: 6.25,
    currency: 'GBP',
    is_active: true,
    created_at: '2025-09-20T14:30:00Z'
  }
]

// ==================== TEMPLATES ====================

export const mockTemplates: Template[] = [
  {
    id: 'tpl-1',
    user_id: 'user-1',
    name: 'Residential Building Standard',
    description: 'Standard mapping for residential construction projects',
    template_type: 'mapping',
    is_public: false,
    created_at: '2025-09-18T11:00:00Z',
    updated_at: '2025-09-25T15:30:00Z',
    mappings_count: 45
  },
  {
    id: 'tpl-2',
    user_id: 'user-1',
    name: 'Commercial Fit-Out',
    description: 'Mapping template for commercial interior fit-out works',
    template_type: 'mapping',
    is_public: false,
    created_at: '2025-09-22T09:15:00Z',
    mappings_count: 32
  },
  {
    id: 'tpl-3',
    user_id: 'user-1',
    name: 'Standard Export Format',
    description: 'Pre-configured export settings with company branding',
    template_type: 'export',
    is_public: true,
    created_at: '2025-09-10T14:20:00Z',
    mappings_count: 0
  }
]

export const mockTemplateMappings: TemplateMapping[] = [
  {
    id: 'map-1',
    template_id: 'tpl-1',
    source_code: 'IfcWall',
    target_code: 'BRK-001',
    allowance_percent: 10.0
  },
  {
    id: 'map-2',
    template_id: 'tpl-1',
    source_code: 'IfcSlab',
    target_code: 'CEM-001',
    allowance_percent: 5.0
  },
  {
    id: 'map-3',
    template_id: 'tpl-1',
    source_code: 'IfcBeam',
    target_code: 'STL-001',
    allowance_percent: 8.0
  }
]

// ==================== ESTIMATES ====================

export const mockEstimates: Estimate[] = [
  {
    id: 'est-1',
    user_id: 'user-1',
    project_id: 'proj-1',
    job_id: 'job-123',
    name: 'Riverside Apartments - Final Estimate',
    description: 'Complete bill of quantities for riverside development',
    base_total: 485000.00,
    adjustments_total: 87300.00,
    final_total: 572300.00,
    currency: 'GBP',
    status: 'final',
    created_at: '2025-09-28T16:45:00Z',
    updated_at: '2025-10-02T10:20:00Z',
    items_count: 156,
    adjustments_count: 4
  },
  {
    id: 'est-2',
    user_id: 'user-1',
    project_id: 'proj-2',
    name: 'Office Refurbishment - Draft',
    description: 'Initial estimate for office space renovation',
    base_total: 125000.00,
    adjustments_total: 18750.00,
    final_total: 143750.00,
    currency: 'GBP',
    status: 'draft',
    created_at: '2025-10-05T09:30:00Z',
    items_count: 67,
    adjustments_count: 2
  },
  {
    id: 'est-3',
    user_id: 'user-1',
    project_id: 'proj-1',
    name: 'Riverside Apartments - Revised',
    description: 'Updated estimate with client changes',
    base_total: 510000.00,
    adjustments_total: 91800.00,
    final_total: 601800.00,
    currency: 'GBP',
    status: 'draft',
    created_at: '2025-10-04T14:15:00Z',
    items_count: 168,
    adjustments_count: 5
  }
]

export const mockEstimateItems: EstimateItem[] = [
  {
    id: 'item-1',
    estimate_id: 'est-1',
    code: 'BRK-001',
    description: 'Standard Red Brick 215x102.5x65mm',
    quantity: 45000,
    unit: 'unit',
    unit_price: 0.65,
    total_price: 29250.00,
    source: 'takeoff',
    supplier_id: 'sup-1',
    supplier_name: 'BuildMaster Supplies Ltd'
  },
  {
    id: 'item-2',
    estimate_id: 'est-1',
    code: 'CEM-001',
    description: 'Portland Cement 25kg Bag',
    quantity: 2400,
    unit: 'bag',
    unit_price: 5.50,
    total_price: 13200.00,
    source: 'takeoff',
    supplier_id: 'sup-1',
    supplier_name: 'BuildMaster Supplies Ltd'
  },
  {
    id: 'item-3',
    estimate_id: 'est-1',
    code: 'STL-001',
    description: 'Reinforcement Steel Bar 12mm',
    quantity: 8500,
    unit: 'm',
    unit_price: 8.75,
    total_price: 74375.00,
    source: 'takeoff',
    supplier_id: 'sup-1',
    supplier_name: 'BuildMaster Supplies Ltd'
  },
  {
    id: 'item-4',
    estimate_id: 'est-1',
    code: 'CUSTOM-001',
    description: 'Site Preparation and Clearance',
    quantity: 1,
    unit: 'job',
    unit_price: 15000.00,
    total_price: 15000.00,
    source: 'manual'
  }
]

export const mockCostAdjustments: CostAdjustment[] = [
  {
    id: 'adj-1',
    estimate_id: 'est-1',
    category: 'overhead',
    name: 'General Overhead',
    calculation_type: 'percent',
    value: 10.0,
    applied_to: 'subtotal',
    order: 1,
    created_at: '2025-09-28T16:50:00Z',
    calculated_amount: 48500.00
  },
  {
    id: 'adj-2',
    estimate_id: 'est-1',
    category: 'profit',
    name: 'Profit Margin',
    calculation_type: 'percent',
    value: 5.0,
    applied_to: 'subtotal',
    order: 2,
    created_at: '2025-09-28T16:51:00Z',
    calculated_amount: 26675.00
  },
  {
    id: 'adj-3',
    estimate_id: 'est-1',
    category: 'tax',
    name: 'VAT (20%)',
    calculation_type: 'percent',
    value: 20.0,
    applied_to: 'subtotal',
    order: 3,
    created_at: '2025-09-28T16:52:00Z',
    calculated_amount: 112035.00
  },
  {
    id: 'adj-4',
    estimate_id: 'est-1',
    category: 'logistics',
    name: 'Delivery and Logistics',
    calculation_type: 'fixed',
    value: 5000.00,
    applied_to: 'total',
    order: 4,
    created_at: '2025-09-28T16:53:00Z',
    calculated_amount: 5000.00
  }
]

// ==================== PROJECTS ====================

export const mockProjectHistory: ProjectHistory[] = [
  {
    id: 'hist-1',
    project_id: 'proj-1',
    event_type: 'created',
    description: 'Project created',
    user_id: 'user-1',
    user_name: 'John Smith',
    created_at: '2025-09-01T09:00:00Z'
  },
  {
    id: 'hist-2',
    project_id: 'proj-1',
    event_type: 'job_completed',
    description: 'IFC takeoff completed for Building A',
    user_id: 'user-1',
    user_name: 'John Smith',
    created_at: '2025-09-15T14:30:00Z',
    metadata: { job_id: 'job-123', file_name: 'building_a.ifc' }
  },
  {
    id: 'hist-3',
    project_id: 'proj-1',
    event_type: 'estimate_added',
    description: 'Created estimate "Riverside Apartments - Final Estimate"',
    user_id: 'user-1',
    user_name: 'John Smith',
    created_at: '2025-09-28T16:45:00Z',
    metadata: { estimate_id: 'est-1' }
  },
  {
    id: 'hist-4',
    project_id: 'proj-1',
    event_type: 'updated',
    description: 'Updated project details and timeline',
    user_id: 'user-1',
    user_name: 'John Smith',
    created_at: '2025-10-02T10:20:00Z'
  }
]

export const mockBillingRecords: BillingRecord[] = [
  {
    id: 'bill-1',
    user_id: 'user-1',
    project_id: 'proj-1',
    amount: 572300.00,
    currency: 'GBP',
    status: 'paid',
    due_date: '2025-10-15',
    paid_date: '2025-10-12',
    created_at: '2025-10-03T11:00:00Z',
    description: 'Final invoice for Riverside Apartments project'
  },
  {
    id: 'bill-2',
    user_id: 'user-1',
    project_id: 'proj-2',
    amount: 143750.00,
    currency: 'GBP',
    status: 'sent',
    due_date: '2025-10-25',
    created_at: '2025-10-05T15:30:00Z',
    description: 'Invoice for Office Refurbishment - Stage 1'
  },
  {
    id: 'bill-3',
    user_id: 'user-1',
    project_id: 'proj-1',
    amount: 29500.00,
    currency: 'GBP',
    status: 'draft',
    created_at: '2025-10-06T09:15:00Z',
    description: 'Additional works - Riverside Apartments'
  }
]
