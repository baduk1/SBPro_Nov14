#!/usr/bin/env python3
"""
Migration script to add Templates and Estimates support.
Creates: templates, template_items, estimates, estimate_items, cost_adjustments tables
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, inspect
from app.core.config import settings
from app.models.base import Base

def migrate():
    """Run migration to add Templates and Estimates tables"""
    engine = create_engine(settings.DB_URL, echo=True)
    inspector = inspect(engine)

    print("\n=== Starting Migration: Add Templates & Estimates ===\n")

    existing_tables = inspector.get_table_names()
    print(f"Existing tables: {existing_tables}")

    tables_to_create = []

    # Check which tables need to be created
    if 'templates' not in existing_tables:
        tables_to_create.append('templates')
    if 'template_items' not in existing_tables:
        tables_to_create.append('template_items')
    if 'estimates' not in existing_tables:
        tables_to_create.append('estimates')
    if 'estimate_items' not in existing_tables:
        tables_to_create.append('estimate_items')
    if 'cost_adjustments' not in existing_tables:
        tables_to_create.append('cost_adjustments')

    if not tables_to_create:
        print("⚠️  All tables already exist. Migration not needed.")
        return

    print(f"\nTables to create: {tables_to_create}\n")

    # Import models to ensure they're registered
    from app.models.template import Template, TemplateItem
    from app.models.estimate import Estimate, EstimateItem, CostAdjustment

    # Create tables
    print("Creating tables...")
    Base.metadata.create_all(engine, checkfirst=True)

    print("\n✅ Tables created successfully!")
    print("\nNew tables:")
    print("  - templates (template definitions)")
    print("  - template_items (items within templates)")
    print("  - estimates (cost estimates)")
    print("  - estimate_items (line items in estimates)")
    print("  - cost_adjustments (markup/discount/tax)")

    print("\n=== Migration Completed Successfully! ===\n")

if __name__ == "__main__":
    migrate()
