#!/usr/bin/env python3
"""
Migration: Add indexes to FK columns for performance
Purpose: Optimize queries with JOIN and WHERE clauses on FK columns
Date: 2025-10-30
"""
import sys
from sqlalchemy import text
from app.db.session import engine


def migrate():
    """Add indexes to foreign key columns that don't have them"""
    print("🔄 Migration: Adding indexes to FK columns...")
    
    indexes_to_create = [
        ("idx_suppliers_user_id", "suppliers", "user_id"),
        ("idx_supplier_price_items_supplier_id", "supplier_price_items", "supplier_id"),
        ("idx_boq_items_mapped_price_item_id", "boq_items", "mapped_price_item_id"),
        ("idx_jobs_price_list_id", "jobs", "price_list_id"),
    ]
    
    with engine.begin() as conn:
        for index_name, table_name, column_name in indexes_to_create:
            # Check if index already exists
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM pg_indexes 
                WHERE tablename = :table 
                AND indexname = :index
            """), {"table": table_name, "index": index_name})
            
            if result.scalar() > 0:
                print(f"  ⏭️  Index {index_name} already exists on {table_name}.{column_name}")
                continue
            
            # Create the index
            print(f"  ✅ Creating index {index_name} on {table_name}.{column_name}...")
            conn.execute(text(f"""
                CREATE INDEX {index_name} ON {table_name} ({column_name})
            """))
    
    print("\n✅ Successfully added all FK indexes!")
    print("\n📊 Performance impact:")
    print("  - Faster JOIN queries on suppliers, price items, BOQ items")
    print("  - Improved WHERE clause performance on FK columns")
    print("  - Better query planner optimization")


if __name__ == "__main__":
    try:
        migrate()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}", file=sys.stderr)
        sys.exit(1)

