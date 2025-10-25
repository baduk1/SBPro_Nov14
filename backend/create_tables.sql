-- Migration: Add Templates and Estimates tables
-- Date: 2025-10-21
-- Auto-generated from SQLAlchemy models

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- Template Items table
CREATE TABLE IF NOT EXISTS template_items (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    element_type TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    default_unit_price REAL,
    default_currency TEXT DEFAULT 'GBP',
    quantity_multiplier REAL DEFAULT 1.0,
    sort_order REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON template_items(template_id);

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    job_id TEXT,
    project_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'GBP',
    notes TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON estimates(project_id);

-- Estimate Items table
CREATE TABLE IF NOT EXISTS estimate_items (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    boq_item_id TEXT,
    description TEXT NOT NULL,
    element_type TEXT,
    unit TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    notes TEXT,
    sort_order REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
    FOREIGN KEY (boq_item_id) REFERENCES boq_items(id)
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id);

-- Cost Adjustments table
CREATE TABLE IF NOT EXISTS cost_adjustments (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    name TEXT NOT NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed')),
    value REAL NOT NULL,
    amount REAL NOT NULL,
    sort_order REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cost_adjustments_estimate_id ON cost_adjustments(estimate_id);
