-- Migration: Add description and status fields to projects table
-- Date: 2025-10-21

ALTER TABLE projects ADD COLUMN description TEXT;
ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'ACTIVE';
