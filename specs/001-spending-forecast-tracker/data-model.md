# Data Model: Spending Forecast Tracker

**Feature**: Spending Forecast Tracker
**Date**: 2025-11-17
**Storage**: Snowflake (cloud data warehouse)

## Overview

This document defines the data model for the spending forecast tracking system. The model is optimized for Snowflake's columnar storage and supports efficient filtering, aggregation, and time-series queries.

---

## Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐
│ USERS        │         │ DEPARTMENTS  │
│              │         │              │
│ * user_id    │         │ * dept_id    │
│   username   │         │   dept_name  │
│   email      │         │   dept_code  │
│   role       │         │   created_at │
│   created_at │         │   updated_at │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │                        │ 1:N
       │                        │
       │          ┌─────────────┴────────┐
       │          │                      │
       │    ┌─────▼──────┐        ┌──────▼──────┐
       │    │ PROJECTS   │        │ FORECASTS   │
       │    │            │        │             │
       │    │ * proj_id  │   N:1  │ * fc_id     │
       │    │   proj_name├────────┤   dept_id   │
       │    │   proj_code│        │   proj_id   │
       │    │   dept_id  │        │   user_id   │
       │    │   status   │        │   amount    │
       │    │   created_at│       │   period... │
       └────┤   updated_at│       │   created...│
            └────────────┘        └──────┬──────┘
                                         │ 1:N
                                         │
                                  ┌──────▼────────┐
                                  │ FORECAST_AUDIT│
                                  │               │
                                  │ * audit_id    │
                                  │   fc_id       │
                                  │   user_id     │
                                  │   action      │
                                  │   old_value   │
                                  │   new_value   │
                                  │   changed_at  │
                                  └───────────────┘
```

---

## Entities

### 1. USERS

Represents authenticated users with permissions to access and manage forecasts.

**Table Name**: `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | VARCHAR(36) | PRIMARY KEY | Unique user identifier (UUID) |
| username | VARCHAR(255) | NOT NULL, UNIQUE | User's login name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User's email address |
| full_name | VARCHAR(255) | NOT NULL | User's full display name |
| role | VARCHAR(50) | NOT NULL | User role (e.g., 'admin', 'manager', 'viewer') |
| sso_provider_id | VARCHAR(255) | NULL | SSO provider's user ID |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Account active status |
| created_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Record creation timestamp |
| updated_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Last update timestamp |

**Indexes**:
- Primary Key: `user_id`
- Unique Index: `username`, `email`
- Index: `sso_provider_id` (for SSO lookups)

**Validation Rules**:
- `email` must match email format
- `role` must be one of: 'admin', 'manager', 'user', 'viewer'
- `username` must be alphanumeric with underscores/hyphens

---

### 2. DEPARTMENTS

Represents organizational departments that own spending forecasts.

**Table Name**: `departments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| dept_id | NUMBER(38,0) | PRIMARY KEY | Department unique identifier |
| dept_name | VARCHAR(255) | NOT NULL | Department full name |
| dept_code | VARCHAR(50) | NOT NULL, UNIQUE | Department short code |
| description | TEXT | NULL | Department description |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Department active status |
| created_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Record creation timestamp |
| updated_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Last update timestamp |

**Indexes**:
- Primary Key: `dept_id`
- Unique Index: `dept_code`
- Index: `dept_name` (for name searches)
- Index: `is_active` (for filtering active departments)

**Validation Rules**:
- `dept_code` must be uppercase alphanumeric (e.g., 'FIN', 'IT', 'HR')
- `dept_name` must be non-empty
- `dept_code` length between 2-10 characters

---

### 3. PROJECTS

Represents projects or initiatives within departments that have associated forecasts.

**Table Name**: `projects`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| proj_id | NUMBER(38,0) | PRIMARY KEY | Project unique identifier |
| proj_name | VARCHAR(255) | NOT NULL | Project full name |
| proj_code | VARCHAR(50) | NOT NULL, UNIQUE | Project short code |
| dept_id | NUMBER(38,0) | NOT NULL, FOREIGN KEY | Associated department |
| description | TEXT | NULL | Project description |
| status | VARCHAR(50) | NOT NULL DEFAULT 'ACTIVE' | Project status |
| start_date | DATE | NULL | Project start date |
| end_date | DATE | NULL | Project end date |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Project active status |
| created_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Record creation timestamp |
| updated_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Last update timestamp |

**Indexes**:
- Primary Key: `proj_id`
- Unique Index: `proj_code`
- Index: `dept_id` (for department filtering)
- Index: `status` (for status filtering)
- Index: `is_active` (for filtering active projects)

**Validation Rules**:
- `proj_code` must be uppercase alphanumeric (e.g., 'PROJ001', 'CRM-2025')
- `status` must be one of: 'ACTIVE', 'PLANNED', 'ON_HOLD', 'COMPLETED', 'CANCELLED'
- `end_date` must be >= `start_date` if both are provided
- `dept_id` must reference valid department

---

### 4. FORECASTS

Core entity representing spending forecasts for department-project combinations over time periods.

**Table Name**: `forecasts`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| forecast_id | NUMBER(38,0) | PRIMARY KEY | Forecast unique identifier |
| dept_id | NUMBER(38,0) | NOT NULL, FOREIGN KEY | Associated department |
| proj_id | NUMBER(38,0) | NOT NULL, FOREIGN KEY | Associated project |
| created_by_user_id | VARCHAR(36) | NOT NULL, FOREIGN KEY | User who created forecast |
| amount | NUMBER(18,2) | NOT NULL CHECK (amount > 0) | Forecast amount (USD) |
| period_type | VARCHAR(20) | NOT NULL | Time period type |
| period_start_date | DATE | NOT NULL | Period start date |
| period_end_date | DATE | NOT NULL | Period end date |
| description | TEXT | NULL | Optional forecast description |
| status | VARCHAR(50) | NOT NULL DEFAULT 'DRAFT' | Forecast status |
| created_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Record creation timestamp |
| updated_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Last update timestamp |
| updated_by_user_id | VARCHAR(36) | NULL, FOREIGN KEY | User who last updated forecast |

**Indexes**:
- Primary Key: `forecast_id`
- Clustered Index: `(period_start_date, dept_id)` - optimized for date range + department filtering
- Index: `proj_id` (for project filtering)
- Index: `created_by_user_id` (for user's forecasts)
- Index: `period_type` (for period filtering)
- Index: `status` (for status filtering)

**Validation Rules**:
- `amount` must be positive (> 0)
- `period_type` must be one of: 'MONTHLY', 'QUARTERLY', 'YEARLY'
- `period_end_date` must be > `period_start_date`
- `dept_id` must reference valid active department
- `proj_id` must reference valid active project
- `created_by_user_id` must reference valid user
- Period dates must align with period_type:
  - MONTHLY: start = first day of month, end = last day of month
  - QUARTERLY: start = first day of quarter, end = last day of quarter
  - YEARLY: start = Jan 1, end = Dec 31
- `status` must be one of: 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'

**Calculated Fields** (computed in queries, not stored):
- `period_year`: YEAR(period_start_date)
- `period_quarter`: QUARTER(period_start_date)
- `period_month`: MONTH(period_start_date)

---

### 5. FORECAST_AUDIT

Tracks changes to forecasts for basic audit trail (timestamp + user).

**Table Name**: `forecast_audit`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| audit_id | NUMBER(38,0) | PRIMARY KEY | Audit record identifier |
| forecast_id | NUMBER(38,0) | NOT NULL, FOREIGN KEY | Associated forecast |
| user_id | VARCHAR(36) | NOT NULL, FOREIGN KEY | User who made the change |
| action | VARCHAR(50) | NOT NULL | Action performed |
| field_name | VARCHAR(100) | NULL | Field that was changed |
| old_value | TEXT | NULL | Previous value (JSON) |
| new_value | TEXT | NULL | New value (JSON) |
| changed_at | TIMESTAMP_NTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP() | Change timestamp |

**Indexes**:
- Primary Key: `audit_id`
- Index: `forecast_id` (for forecast history)
- Index: `user_id` (for user activity)
- Index: `changed_at` (for time-based queries)

**Validation Rules**:
- `action` must be one of: 'CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED'
- `forecast_id` must reference valid forecast
- `user_id` must reference valid user

---

## Snowflake-Specific Optimizations

### Clustering Strategy

```sql
-- Forecasts table: clustered by date and department for filtering performance
ALTER TABLE forecasts CLUSTER BY (period_start_date, dept_id);

-- Monitor clustering quality
SELECT SYSTEM$CLUSTERING_INFORMATION('forecasts', '(period_start_date, dept_id)');
```

**Rationale**:
- Most common query pattern: filter by date range + department
- Clustering improves partition pruning for these queries
- Reduces data scanned for <2s filter requirement

### Materialized Views for Dashboard

```sql
-- Pre-aggregated monthly summary by department
CREATE MATERIALIZED VIEW forecast_monthly_by_dept AS
SELECT
  DATE_TRUNC('MONTH', period_start_date) AS month,
  dept_id,
  SUM(amount) AS total_amount,
  COUNT(*) AS forecast_count,
  AVG(amount) AS avg_amount,
  MIN(amount) AS min_amount,
  MAX(amount) AS max_amount
FROM forecasts
WHERE status = 'APPROVED'
GROUP BY 1, 2;

-- Pre-aggregated monthly summary by project
CREATE MATERIALIZED VIEW forecast_monthly_by_proj AS
SELECT
  DATE_TRUNC('MONTH', period_start_date) AS month,
  proj_id,
  SUM(amount) AS total_amount,
  COUNT(*) AS forecast_count
FROM forecasts
WHERE status = 'APPROVED'
GROUP BY 1, 2;

-- Pre-aggregated quarterly summary
CREATE MATERIALIZED VIEW forecast_quarterly_summary AS
SELECT
  DATE_TRUNC('QUARTER', period_start_date) AS quarter,
  dept_id,
  proj_id,
  SUM(amount) AS total_amount,
  COUNT(*) AS forecast_count
FROM forecasts
WHERE status = 'APPROVED'
GROUP BY 1, 2, 3;
```

**Benefits**:
- Dashboard queries execute in <1s instead of 3s
- Reduces warehouse load for repetitive dashboard refreshes
- Automatically updated as forecasts change

### Table Structure for Performance

```sql
-- Forecasts table optimized for time-series queries
CREATE TABLE forecasts (
  forecast_id NUMBER(38,0) IDENTITY PRIMARY KEY,
  dept_id NUMBER(38,0) NOT NULL,
  proj_id NUMBER(38,0) NOT NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  amount NUMBER(18,2) NOT NULL CHECK (amount > 0),
  period_type VARCHAR(20) NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by_user_id VARCHAR(36),

  FOREIGN KEY (dept_id) REFERENCES departments(dept_id),
  FOREIGN KEY (proj_id) REFERENCES projects(proj_id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
  FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
)
CLUSTER BY (period_start_date, dept_id);
```

---

## Data Access Patterns

### Common Query Patterns

#### 1. Dashboard: View All Forecasts with Aggregations

```sql
-- Dashboard main view
SELECT
  d.dept_name,
  p.proj_name,
  f.amount,
  f.period_type,
  f.period_start_date,
  f.period_end_date,
  u.full_name AS created_by,
  f.updated_at
FROM forecasts f
  JOIN departments d ON f.dept_id = d.dept_id
  JOIN projects p ON f.proj_id = p.proj_id
  JOIN users u ON f.created_by_user_id = u.user_id
WHERE f.status = 'APPROVED'
  AND f.period_start_date >= '2025-01-01'
ORDER BY f.period_start_date DESC, d.dept_name;

-- Aggregation by department (uses materialized view)
SELECT * FROM forecast_monthly_by_dept
WHERE month >= '2025-01-01'
ORDER BY month, total_amount DESC;
```

#### 2. Filter by Department

```sql
SELECT
  f.forecast_id,
  p.proj_name,
  f.amount,
  f.period_start_date,
  f.period_end_date
FROM forecasts f
  JOIN projects p ON f.proj_id = p.proj_id
WHERE f.dept_id = :dept_id
  AND f.status = 'APPROVED'
  AND f.period_start_date >= :start_date
ORDER BY f.period_start_date DESC;
```

#### 3. Filter by Project

```sql
SELECT
  f.forecast_id,
  d.dept_name,
  f.amount,
  f.period_start_date,
  f.period_end_date,
  f.description
FROM forecasts f
  JOIN departments d ON f.dept_id = d.dept_id
WHERE f.proj_id = :proj_id
  AND f.status = 'APPROVED'
ORDER BY f.period_start_date DESC;
```

#### 4. Create New Forecast

```sql
INSERT INTO forecasts (
  dept_id, proj_id, created_by_user_id,
  amount, period_type, period_start_date, period_end_date,
  description, status
) VALUES (
  :dept_id, :proj_id, :user_id,
  :amount, :period_type, :start_date, :end_date,
  :description, 'DRAFT'
);
```

#### 5. Edit Forecast (User Can Only Edit Their Own)

```sql
UPDATE forecasts
SET
  amount = :new_amount,
  period_type = :new_period_type,
  period_start_date = :new_start_date,
  period_end_date = :new_end_date,
  description = :new_description,
  updated_at = CURRENT_TIMESTAMP(),
  updated_by_user_id = :user_id
WHERE forecast_id = :forecast_id
  AND created_by_user_id = :user_id  -- Can only edit own forecasts
  AND status = 'DRAFT';               -- Can only edit drafts
```

#### 6. Get User's Forecasts

```sql
SELECT
  f.forecast_id,
  d.dept_name,
  p.proj_name,
  f.amount,
  f.period_start_date,
  f.status,
  f.created_at
FROM forecasts f
  JOIN departments d ON f.dept_id = d.dept_id
  JOIN projects p ON f.proj_id = p.proj_id
WHERE f.created_by_user_id = :user_id
ORDER BY f.created_at DESC;
```

---

## Data Validation

### Application-Level Validation

**Forecast Amount**:
- Must be a positive number
- Maximum 18 digits total, 2 decimal places
- Range: $0.01 to $9,999,999,999,999,999.99

**Period Dates**:
- `period_end_date` must be after `period_start_date`
- Dates must align with `period_type`:
  - MONTHLY: Full calendar month
  - QUARTERLY: Full calendar quarter (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
  - YEARLY: Full calendar year (Jan 1 - Dec 31)

**Department/Project References**:
- Must reference active departments and projects
- Project must belong to specified department

**User Permissions**:
- User can only edit forecasts they created
- User can only edit forecasts in 'DRAFT' status

---

## Migration Considerations

### Initial Data Load

1. **Users**: Sync from SSO provider or CSV import
2. **Departments**: Load from organizational hierarchy
3. **Projects**: Load from project management system
4. **Forecasts**: Migrate historical forecasts if available

### Data Retention

- **Forecasts**: Retain indefinitely (financial records)
- **Audit Trail**: Retain for 7 years (compliance requirement)
- **Inactive Departments/Projects**: Soft delete (set `is_active = FALSE`)

---

## Summary

The data model supports:
- ✅ Creating, viewing, editing, and filtering spending forecasts
- ✅ Associating forecasts with departments and projects
- ✅ Aggregating spending by department and project
- ✅ Time period organization (monthly, quarterly, yearly)
- ✅ Basic audit trail (timestamp + user)
- ✅ User permission control (edit only own forecasts)
- ✅ Optimized for Snowflake performance (<3s dashboard, <2s filtering)
- ✅ Scalable to 10,000+ forecast records with 100+ concurrent users
