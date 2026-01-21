# Spending Forecast Tracker - Complete Technical Documentation

**Document Version:** 2.0
**Last Updated:** January 2026
**Status:** Production-Ready Architecture

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What This Application Does](#2-what-this-application-does)
3. [Technical Architecture](#3-technical-architecture)
4. [Design Decisions & Rationale](#4-design-decisions--rationale)
5. [Data Flow & Transformation Layer](#5-data-flow--transformation-layer)
6. [Current Database Schema](#6-current-database-schema)
7. [API Reference](#7-api-reference)
8. [Snowflake Hybrid Table Migration Plan](#8-snowflake-hybrid-table-migration-plan)

---

## 1. Executive Summary

### Application Purpose

The **Spending Forecast Tracker** is a full-stack financial forecasting system designed for Norwegian organizations to create, manage, and approve departmental spending forecasts. It provides a modern web interface for finance teams to track monthly spending across departments and projects with a complete approval workflow.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Target Users** | Finance teams, department managers, project controllers |
| **Localization** | Norwegian language and NOK currency |
| **Scale** | Designed for 100+ concurrent users, 10,000+ forecast records |
| **Database Strategy** | SQLite for development, Snowflake Hybrid Tables for production |
| **Architecture** | Dual-storage model: Snowflake-compatible core data + local UI metadata |

### Technology Stack Summary

```
Frontend:  React 19.2 + TypeScript 5.9 + Vite 7.2 + Ant Design 6.0
Backend:   FastAPI 0.115 + Python 3.12 + SQLAlchemy 2.0 + Pydantic 2.0
Database:  SQLite (demo) / Snowflake Hybrid Tables (production)
Deploy:    Docker + Docker Compose + Nginx reverse proxy
```

---

## 2. What This Application Does

### Core Functionality

#### 2.1 Forecast Management (CRUD)

Users can create, view, edit, and delete financial forecasts. Each forecast represents a budget line with:

- **Identifying Information**: Profit center, WBS (Work Breakdown Structure), account number
- **Organizational Context**: Department, project assignment
- **Financial Data**: Monthly amounts (January through December)
- **Audit Trail**: Created by, creation date, last update

**Example Use Case**: A department manager creates a forecast for IT equipment spending (Account 4210) under Project "Digital Transformation" with monthly budget allocation.

#### 2.2 Department & Project Organization

Forecasts are organized hierarchically:

```
Department (e.g., "Teknologi")
  └── Project (e.g., "Digital Transformasjon")
       └── Forecast Lines (multiple per project)
            ├── IT Equipment (Account 4210)
            ├── Software Licenses (Account 4220)
            └── Consulting Services (Account 5100)
```

#### 2.3 Snapshot Approval Workflow

The system implements a financial approval workflow:

1. **Live Forecasts**: Editable working data
2. **Snapshot Creation**: Freeze point-in-time copies for review
3. **Batch Submission**: Submit multiple forecasts together as a batch
4. **Approval Process**: Authorized users approve/reject batches
5. **Audit Trail**: Complete history of who submitted/approved and when

**Example Flow**:
```
Finance Analyst creates forecasts →
Submits for approval (creates snapshot) →
Department Head reviews batch →
Approves or requests changes
```

#### 2.4 Inline Editing & Real-Time Updates

The frontend provides:
- Direct cell editing in the forecast table
- Yearly sum distribution (divide annual amount across 12 months)
- Instant persistence to database
- Sorting and filtering by department/project

---

## 3. Technical Architecture

### 3.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USERS                                       │
│                    (Web Browsers / Desktop)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    React + TypeScript                            │    │
│  │  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────┐  │    │
│  │  │   Dashboard  │  │ LiveForecasts  │  │  ForecastFormModal  │  │    │
│  │  │   (Page)     │  │   Table        │  │  (Create/Edit)      │  │    │
│  │  └──────────────┘  └────────────────┘  └─────────────────────┘  │    │
│  │  ┌──────────────┐  ┌────────────────┐                           │    │
│  │  │  Snapshots   │  │   API Service  │ ← TanStack Query caching  │    │
│  │  │    Table     │  │   (axios)      │                           │    │
│  │  └──────────────┘  └────────────────┘                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Build: Vite 7.2   UI: Ant Design 6.0   State: TanStack Query 5.90      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP/REST (JSON)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NGINX (Docker)                                   │
│               Port 3000 → /api/* proxy to backend:8000                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     FastAPI + Python                             │    │
│  │                                                                  │    │
│  │  ┌────────────────────────────────────────────────────────────┐ │    │
│  │  │ API ROUTES LAYER                                            │ │    │
│  │  │ /api/forecasts  /api/snapshots  /api/departments  /projects │ │    │
│  │  └────────────────────────────────────────────────────────────┘ │    │
│  │                              │                                   │    │
│  │  ┌────────────────────────────────────────────────────────────┐ │    │
│  │  │ TRANSFORMATION SERVICE                                      │ │    │
│  │  │ forecast_transformation.py                                  │ │    │
│  │  │ • Yearly ↔ Monthly format conversion                        │ │    │
│  │  │ • Composite key generation                                  │ │    │
│  │  │ • Metadata extraction                                       │ │    │
│  │  └────────────────────────────────────────────────────────────┘ │    │
│  │                              │                                   │    │
│  │  ┌────────────────────────────────────────────────────────────┐ │    │
│  │  │ REPOSITORY LAYER                                            │ │    │
│  │  │ forecast_repository.py                                      │ │    │
│  │  │ • ForecastRepository (CRUD for fdwh_forecast + metadata)    │ │    │
│  │  │ • ForecastSnapshotRepository (snapshot operations)          │ │    │
│  │  │ • DepartmentRepository, ProjectRepository (lookups)         │ │    │
│  │  └────────────────────────────────────────────────────────────┘ │    │
│  │                              │                                   │    │
│  │  ┌────────────────────────────────────────────────────────────┐ │    │
│  │  │ ORM MODELS (SQLAlchemy 2.0)                                 │ │    │
│  │  │ FdwhForecast, ForecastMetadata, Departments, Projects       │ │    │
│  │  │ ForecastSnapshotHeader, ForecastSnapshotMonth               │ │    │
│  │  └────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                                   │
│                                                                          │
│   Development: SQLite (forecasts.db)                                     │
│   Production:  Snowflake Hybrid Tables                                   │
│                                                                          │
│   ┌─────────────────────┐    ┌─────────────────────────────────────┐    │
│   │ SNOWFLAKE-SYNCED    │    │ LOCAL ONLY (NOT SYNCED)             │    │
│   │ ─────────────────── │    │ ─────────────────────────────────── │    │
│   │ fdwh_forecast       │    │ forecast_metadata                   │    │
│   │ (12 records/line)   │    │ departments, projects               │    │
│   └─────────────────────┘    │ forecast_snapshot_headers           │    │
│                              │ forecast_snapshot_months            │    │
│                              └─────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Directory Structure

```
forecasting-app-2/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── forecasts.py      # Forecast CRUD endpoints
│   │   │       ├── snapshots.py      # Snapshot/approval endpoints
│   │   │       ├── departments.py    # Department lookup
│   │   │       └── projects.py       # Project lookup
│   │   ├── config/
│   │   │   └── database.py           # Database configuration
│   │   ├── models/
│   │   │   ├── database.py           # SQLAlchemy ORM models
│   │   │   └── schemas.py            # Pydantic validation schemas
│   │   ├── repositories/
│   │   │   └── forecast_repository.py # Data access layer
│   │   ├── services/
│   │   │   └── forecast_transformation.py # Business logic
│   │   ├── main.py                   # FastAPI app entry point
│   │   └── init_db.py                # Database initialization
│   ├── pyproject.toml                # Python dependencies (Poetry)
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── forecasts/
│   │   │       ├── LiveForecastsTable.tsx  # Editable forecast grid
│   │   │       ├── SnapshotsTable.tsx      # Snapshot viewer
│   │   │       └── ForecastFormModal.tsx   # Create/edit modal
│   │   ├── pages/
│   │   │   └── Dashboard.tsx         # Main page component
│   │   ├── services/
│   │   │   └── api.ts                # API client service
│   │   ├── utils/
│   │   │   └── mockData.ts           # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml                # Multi-container orchestration
├── data/                             # SQLite database volume
└── docs/                             # Documentation
```

### 3.3 Component Responsibilities

| Component | File(s) | Responsibility |
|-----------|---------|----------------|
| **Dashboard** | `Dashboard.tsx` | Page orchestration, state management, department filtering |
| **LiveForecastsTable** | `LiveForecastsTable.tsx` | Editable grid, inline editing, yearly sum distribution |
| **SnapshotsTable** | `SnapshotsTable.tsx` | Snapshot display, batch grouping, approval actions |
| **ForecastFormModal** | `ForecastFormModal.tsx` | Create/edit form with React Hook Form |
| **API Service** | `api.ts` | HTTP client, request/response mapping |
| **Forecast Routes** | `forecasts.py` | REST endpoints for forecast CRUD |
| **Snapshot Routes** | `snapshots.py` | REST endpoints for approval workflow |
| **Transformation** | `forecast_transformation.py` | Yearly ↔ monthly conversion |
| **Repository** | `forecast_repository.py` | Database operations, query logic |

---

## 4. Design Decisions & Rationale

### 4.1 Normalized Monthly Storage (12 Records per Forecast)

**Decision**: Store each forecast as 12 separate database records (one per month) rather than a single row with 12 columns.

**Implementation**:
```python
# fdwh_forecast table stores one record per month
class FdwhForecast(Base):
    pk = Column(String, primary_key=True)  # {pc}_{wbs}_{acc}_{year}_{month}
    year = Column(String)
    month = Column(String)  # "01" to "12"
    amount = Column(Float)
    # ... other fields
```

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Snowflake Optimization** | Hybrid Tables perform better with row-oriented patterns; this aligns with their transactional design |
| **Flexible Aggregation** | SQL can aggregate by month, quarter, or custom ranges without parsing column names |
| **Multi-Year Support** | Adding years requires no schema changes - just new records with different `year` values |
| **DBT Compatibility** | Matches Snowflake data warehouse patterns for dbt transformations |
| **Historical Tracking** | Easier to track changes at individual month level |

**Trade-off Accepted**: Requires a transformation layer to convert between API (yearly) and storage (monthly) formats. This overhead is minimal and cleanly encapsulated in `forecast_transformation.py`.

---

### 4.2 Dual Storage Model (Snowflake Core + Local Metadata)

**Decision**: Separate data into two tables - Snowflake-synced core data and local-only UI metadata.

**Implementation**:
```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│       fdwh_forecast         │    │     forecast_metadata       │
│   (Syncs to Snowflake)      │    │    (Local Only)             │
├─────────────────────────────┤    ├─────────────────────────────┤
│ pk (composite)              │    │ forecast_key (composite)    │
│ profitcenter               │    │ department_id (FK)          │
│ wbs                        │    │ project_id (FK)             │
│ account_number             │    │ project_name                │
│ year, month                │    │ created_by                  │
│ amount                     │    │ created_at, updated_at      │
│ source                     │    └─────────────────────────────┘
│ dbt_scd_id, dbt_*          │
│ period                     │
└─────────────────────────────┘
```

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Schema Compliance** | `fdwh_forecast` matches the target Snowflake table exactly - no UI-specific columns |
| **Sync Simplicity** | Only one table needs to sync to Snowflake; no filtering required |
| **UI Flexibility** | UI metadata can change without affecting Snowflake sync |
| **Foreign Keys** | Local metadata maintains referential integrity to departments/projects |
| **Audit Trail** | UI-side audit fields don't pollute warehouse data |

---

### 4.3 Composite Primary Keys

**Decision**: Use composite string keys instead of auto-increment integers.

**Format**: `{profitcenter}_{wbs}_{account_number}_{year}_{month}`

**Example**: `1000_WBS123_4210_2026_03` (March 2026 forecast for PC 1000, WBS123, Account 4210)

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Natural Grouping** | 12 monthly records share a common prefix (without month) |
| **Deterministic** | Same data always produces same key - enables upserts |
| **Snowflake Pattern** | Matches how Snowflake tables are typically keyed in data warehouses |
| **Debugging** | Keys are human-readable and self-documenting |
| **No Sequence Sync** | No need to synchronize auto-increment sequences between SQLite and Snowflake |

---

### 4.4 Repository Pattern for Data Access

**Decision**: All database operations go through repository classes, never directly in route handlers.

**Implementation**:
```python
# Routes use repository
@router.get("/forecasts")
def get_forecasts(db: Session = Depends(get_db)):
    repo = ForecastRepository(db)
    return repo.get_all()  # Never: db.query(FdwhForecast)...

# Repository handles database logic
class ForecastRepository:
    def get_all(self):
        # Query + transform + return
```

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Testability** | Repositories can be mocked for unit testing routes without database |
| **Database Agnosticism** | Switching SQLite → Snowflake requires changes only in repository layer |
| **Single Responsibility** | Routes handle HTTP; repositories handle data |
| **Complex Query Encapsulation** | Repository methods hide 12-record grouping logic from routes |
| **Transaction Boundaries** | Repositories manage transaction scope for multi-table operations |

---

### 4.5 Yearly API Contract

**Decision**: API returns/accepts yearly objects with `jan`, `feb`, ... `dec` fields, regardless of monthly storage.

**API Format**:
```json
{
  "id": "1000_WBS123_4210_2026",
  "profitcenter": 1000,
  "wbs": "WBS123",
  "accountNumber": 4210,
  "year": "2026",
  "jan": 5000, "feb": 5000, "mar": 6000,
  "apr": 5500, "may": 5500, "jun": 5500,
  "jul": 4000, "aug": 4000, "sep": 5000,
  "oct": 6000, "nov": 6000, "dec": 7000,
  "total": 64500,
  "departmentId": 1,
  "projectId": 3
}
```

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Frontend Simplicity** | React components work with one object per forecast line |
| **Intuitive UX** | Users think in terms of yearly budgets, not database records |
| **Backward Compatibility** | Standard format expected by financial UIs |
| **Separation of Concerns** | Storage optimization shouldn't affect API consumers |

---

### 4.6 Snapshot Immutability with Batch Grouping

**Decision**: Snapshots are immutable copies with batch IDs for grouped approval.

**Schema Design**:
```
ForecastSnapshotHeader (1 per forecast submission)
├── forecast_key (reference to source)
├── batch_id (groups multiple submissions)
├── is_approved, submitted_by, approved_by
└── ForecastSnapshotMonth (12 records)
    └── month, amount, period
```

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Audit Compliance** | Financial systems require point-in-time records for audit |
| **Non-Destructive** | Approval doesn't modify live forecasts |
| **Batch Operations** | Department head can approve all department forecasts at once |
| **Clear Accountability** | `submitted_by` and `approved_by` create audit trail |
| **Historical Comparison** | Compare approved snapshot vs current live forecast |

---

### 4.7 DBT SCD (Slowly Changing Dimension) Fields

**Decision**: Include DBT SCD tracking fields in the core forecast table.

**Fields**:
```python
dbt_scd_id = Column(String(32))      # SCD tracking ID
dbt_updated_at = Column(String)       # When DBT last updated
dbt_valid_from = Column(String)       # When this version became valid
dbt_valid_to = Column(String)         # When this version was superseded
```

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Snowflake Integration** | Standard fields for dbt snapshot models |
| **Historical Tracking** | Track every version of every forecast |
| **Data Lineage** | Know exactly when data changed and by which process |
| **Type 2 SCD** | Enable historical analysis with `dbt_valid_from/to` ranges |

**Current Behavior**: Fields are `null` in SQLite; populated by dbt when synced to Snowflake.

---

### 4.8 Norwegian Localization

**Decision**: Norwegian language and NOK currency built into UI and seed data.

**Examples**:
- Departments: "Teknologi", "Markedsføring", "Salg", "Drift", "Økonomi"
- Projects: "Digital Transformasjon", "Skymigrering", "Merkevarebygging"
- Currency: NOK formatting in tables

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Target Market** | Application designed for Norwegian organizations |
| **Realistic Demo** | Seed data demonstrates intended use case |
| **Consistency** | NOK formatting prevents currency confusion |

---

## 5. Data Flow & Transformation Layer

### 5.1 Create Forecast Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. User submits form                                                      │
│    ForecastFormModal → { profitcenter, wbs, accountNumber, jan...dec }   │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. API Service transforms                                                 │
│    mapForecastToAPI() → snake_case for backend                           │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. POST /api/forecasts                                                    │
│    Route validates with Pydantic schema                                  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. Repository.create()                                                    │
│    ├── yearly_forecast_to_monthly_records() → 12 monthly dicts           │
│    ├── extract_metadata_from_yearly() → metadata dict                    │
│    ├── INSERT 12 FdwhForecast records                                    │
│    └── INSERT 1 ForecastMetadata record                                  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. Return transformed result                                              │
│    monthly_records_to_yearly_forecast() → yearly API format              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Key Transformation Functions

**File**: `backend/src/services/forecast_transformation.py`

| Function | Purpose | Input → Output |
|----------|---------|----------------|
| `generate_forecast_key()` | Create composite key without month | (pc, wbs, acc, year) → `"1000_WBS_4210_2026"` |
| `generate_pk()` | Create full primary key | (pc, wbs, acc, year, month) → `"1000_WBS_4210_2026_03"` |
| `yearly_forecast_to_monthly_records()` | Convert yearly to 12 monthly | `{jan: 100, feb: 200...}` → `[{pk, month: "01", amount: 100}, ...]` |
| `monthly_records_to_yearly_forecast()` | Convert 12 monthly to yearly | `[FdwhForecast, ...]` → `{jan: 100, feb: 200, total: ...}` |
| `extract_metadata_from_yearly()` | Extract UI metadata | `{departmentId, projectId...}` → `{forecast_key, department_id...}` |
| `snapshot_header_to_yearly_view()` | Convert snapshot to yearly | `ForecastSnapshotHeader` → `{jan, feb..., isApproved, submittedBy...}` |

### 5.3 Example Transformation

**Input (API Request)**:
```json
{
  "profitcenter": 1000,
  "wbs": "PROJ-A",
  "accountNumber": 4210,
  "year": "2026",
  "jan": 5000, "feb": 5000, "mar": 6000,
  "apr": 5500, "may": 5500, "jun": 5500,
  "jul": 4000, "aug": 4000, "sep": 5000,
  "oct": 6000, "nov": 6000, "dec": 7000,
  "departmentId": 1,
  "projectId": 3
}
```

**Transformed to Database Records**:

`fdwh_forecast` (12 records):
```
pk                           | month | amount | year | profitcenter | wbs    | account_number
1000_PROJ-A_4210_2026_01    | 01    | 5000   | 2026 | 1000         | PROJ-A | 4210
1000_PROJ-A_4210_2026_02    | 02    | 5000   | 2026 | 1000         | PROJ-A | 4210
1000_PROJ-A_4210_2026_03    | 03    | 6000   | 2026 | 1000         | PROJ-A | 4210
... (9 more rows)
```

`forecast_metadata` (1 record):
```
forecast_key              | department_id | project_id | created_by
1000_PROJ-A_4210_2026    | 1             | 3          | System
```

---

## 6. Current Database Schema

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│      departments        │       │       projects          │
├─────────────────────────┤       ├─────────────────────────┤
│ id (PK, INTEGER)        │───┐   │ id (PK, INTEGER)        │
│ name (VARCHAR)          │   │   │ name (VARCHAR)          │
│ code (VARCHAR, UNIQUE)  │   └──►│ department_id (FK)      │
└─────────────────────────┘       │ code (VARCHAR, UNIQUE)  │
         │                        └─────────────────────────┘
         │                                    │
         ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        forecast_metadata                                │
│                  (LOCAL ONLY - UI metadata, not synced)                │
├────────────────────────────────────────────────────────────────────────┤
│ forecast_key (PK, VARCHAR) ── Format: {pc}_{wbs}_{acc}_{year}          │
│ department_id (FK → departments.id)                                     │
│ project_id (FK → projects.id)                                           │
│ project_name (VARCHAR)                                                  │
│ created_by (VARCHAR)                                                    │
│ created_at (DATE)                                                       │
│ updated_at (DATE)                                                       │
└────────────────────────────────────────────────────────────────────────┘
         │ (linked by forecast_key prefix)
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          fdwh_forecast                                  │
│                (SNOWFLAKE-SYNCED - 12 records per forecast)            │
├────────────────────────────────────────────────────────────────────────┤
│ pk (PK, VARCHAR) ───────── Format: {pc}_{wbs}_{acc}_{year}_{month}     │
│ profitcenter (INTEGER)                                                  │
│ wbs (VARCHAR)                                                           │
│ account_number (INTEGER)                                                │
│ year (VARCHAR) ─────────── "2026"                                       │
│ month (VARCHAR) ────────── "01" to "12"                                 │
│ amount (FLOAT)                                                          │
│ source (VARCHAR(7)) ────── "MANUAL" or "IMPORT"                         │
│ load_start_ts (VARCHAR)                                                 │
│ dbt_scd_id (VARCHAR(32)) ─ DBT SCD tracking                            │
│ dbt_updated_at (VARCHAR)                                                │
│ dbt_valid_from (VARCHAR)                                                │
│ dbt_valid_to (VARCHAR)                                                  │
│ period (VARCHAR) ───────── "2026-01" (YYYY-MM)                         │
├────────────────────────────────────────────────────────────────────────┤
│ INDEX idx_forecast_grouping (profitcenter, wbs, account_number, year)  │
│ INDEX idx_forecast_period (period)                                      │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                    forecast_snapshot_headers                            │
│                      (Approval workflow metadata)                       │
├────────────────────────────────────────────────────────────────────────┤
│ id (PK, INTEGER AUTO)                                                   │
│ forecast_key (VARCHAR) ─── Reference to source forecast                 │
│ profitcenter, wbs, account_number, year (denormalized)                  │
│ department_id, project_id, project_name (UI metadata)                   │
│ batch_id (VARCHAR) ─────── Groups snapshots for batch approval          │
│ is_approved (BOOLEAN)                                                   │
│ snapshot_date (DATETIME)                                                │
│ submitted_by (VARCHAR)                                                  │
│ approved_by (VARCHAR)                                                   │
│ approved_at (DATETIME)                                                  │
└────────────────────────────────────────────────────────────────────────┘
         │
         │ 1:12 relationship
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    forecast_snapshot_months                             │
│                    (Frozen monthly amounts)                             │
├────────────────────────────────────────────────────────────────────────┤
│ id (PK, INTEGER AUTO)                                                   │
│ snapshot_header_id (FK → forecast_snapshot_headers.id)                  │
│ month (VARCHAR) ────────── "01" to "12"                                 │
│ amount (FLOAT)                                                          │
│ period (VARCHAR) ───────── "2026-01" (YYYY-MM)                         │
├────────────────────────────────────────────────────────────────────────┤
│ UNIQUE (snapshot_header_id, month)                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| Department → Projects | 1:N | Department has many projects |
| Department → ForecastMetadata | 1:N | Department has many forecast metadata records |
| Project → ForecastMetadata | 1:N | Project has many forecast metadata records |
| ForecastMetadata → FdwhForecast | 1:12 | One metadata links to 12 monthly records (by key prefix) |
| SnapshotHeader → SnapshotMonth | 1:12 | One header has 12 monthly snapshot records |

---

## 7. API Reference

### 7.1 Forecast Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forecasts` | List all forecasts (yearly view) |
| `GET` | `/api/forecasts/{id}` | Get single forecast by composite key |
| `POST` | `/api/forecasts` | Create new forecast (12 records + metadata) |
| `PUT` | `/api/forecasts/{id}` | Update forecast (delete & recreate) |
| `DELETE` | `/api/forecasts/{id}` | Delete forecast (12 records + metadata) |

### 7.2 Snapshot Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/snapshots` | List all snapshots (yearly view, grouped by batch) |
| `GET` | `/api/snapshots/{id}` | Get single snapshot |
| `POST` | `/api/snapshots` | Create snapshot from forecast |
| `POST` | `/api/snapshots/bulk` | Create snapshots for all forecasts in department |
| `POST` | `/api/snapshots/{id}/approve` | Approve snapshot |
| `DELETE` | `/api/snapshots/{id}` | Delete snapshot |

### 7.3 Lookup Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/departments` | List all departments |
| `GET` | `/api/projects` | List all projects |

### 7.4 Request/Response Examples

**Create Forecast**:
```http
POST /api/forecasts
Content-Type: application/json

{
  "profitcenter": 1000,
  "wbs": "PROJ-A",
  "account_number": 4210,
  "year": "2026",
  "source": "MANUAL",
  "jan": 5000, "feb": 5000, "mar": 6000,
  "apr": 5500, "may": 5500, "jun": 5500,
  "jul": 4000, "aug": 4000, "sep": 5000,
  "oct": 6000, "nov": 6000, "dec": 7000,
  "department_id": 1,
  "project_id": 3,
  "project_name": "Digital Transformasjon",
  "created_by": "user@company.no"
}
```

**Response**:
```json
{
  "id": "1000_PROJ-A_4210_2026",
  "profitcenter": 1000,
  "wbs": "PROJ-A",
  "account_number": 4210,
  "year": "2026",
  "jan": 5000, "feb": 5000, "mar": 6000,
  "apr": 5500, "may": 5500, "jun": 5500,
  "jul": 4000, "aug": 4000, "sep": 5000,
  "oct": 6000, "nov": 6000, "dec": 7000,
  "total": 64500,
  "yearly_sum": 64500,
  "source": "MANUAL",
  "department_id": 1,
  "project_id": 3,
  "project_name": "Digital Transformasjon",
  "created_by": "user@company.no",
  "created_at": "2026-01-21",
  "updated_at": "2026-01-21"
}
```

---

## 8. Snowflake Hybrid Table Migration Plan

### 8.1 Why Snowflake Hybrid Tables?

Snowflake Hybrid Tables provide:

| Capability | Benefit for This Application |
|------------|------------------------------|
| **Low-latency CRUD** | Sub-100ms response for single record operations |
| **Row-level locking** | Safe concurrent editing by multiple users |
| **ACID compliance** | Financial data integrity guaranteed |
| **Snowflake ecosystem** | Direct integration with dbt, BI tools, data warehouse |
| **Auto-scaling** | Handles 100+ concurrent users without manual tuning |

### 8.2 Migration Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ARCHITECTURE                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐         ┌─────────────────────┐                │
│  │     APPLICATION     │         │     SNOWFLAKE       │                │
│  │                     │         │                     │                │
│  │  FastAPI Backend    │◄───────►│  Hybrid Tables      │                │
│  │  ┌───────────────┐  │   SQL   │  ┌───────────────┐  │                │
│  │  │ Repository    │  │         │  │ FDWH_FORECAST │  │                │
│  │  │ Layer         │  │         │  │ (Transactional│  │                │
│  │  └───────────────┘  │         │  │  workload)    │  │                │
│  └─────────────────────┘         │  └───────────────┘  │                │
│                                  │         │          │                │
│                                  │         ▼ (DBT)    │                │
│                                  │  ┌───────────────┐  │                │
│                                  │  │ Analytical    │  │                │
│                                  │  │ Tables        │  │                │
│                                  │  │ (Warehouse)   │  │                │
│                                  │  └───────────────┘  │                │
│                                  └─────────────────────┘                │
│                                                                          │
│  LOCAL-ONLY TABLES (remain in application database):                     │
│  - forecast_metadata (UI metadata)                                       │
│  - departments, projects (lookup tables)                                 │
│  - forecast_snapshot_* (approval workflow)                               │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Migration Phases

#### Phase 1: Environment Setup (Day 1)

```sql
-- Create Snowflake resources
CREATE DATABASE FORECASTING_PROD;
CREATE SCHEMA FORECASTING_PROD.OPERATIONAL;

CREATE WAREHOUSE FORECASTING_WH
  WAREHOUSE_SIZE = 'XSMALL'
  WAREHOUSE_TYPE = 'STANDARD'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;

-- Service account with minimal permissions
CREATE ROLE FORECASTING_APP_ROLE;
CREATE USER FORECASTING_APP_SVC
  PASSWORD = '<secure-password-from-secrets-manager>'
  DEFAULT_ROLE = FORECASTING_APP_ROLE
  DEFAULT_WAREHOUSE = FORECASTING_WH;

GRANT USAGE ON DATABASE FORECASTING_PROD TO ROLE FORECASTING_APP_ROLE;
GRANT USAGE ON SCHEMA FORECASTING_PROD.OPERATIONAL TO ROLE FORECASTING_APP_ROLE;
GRANT USAGE ON WAREHOUSE FORECASTING_WH TO ROLE FORECASTING_APP_ROLE;
```

#### Phase 2: Create Hybrid Table (Day 1)

```sql
-- Create Hybrid Table matching current fdwh_forecast schema exactly
CREATE HYBRID TABLE FORECASTING_PROD.OPERATIONAL.FDWH_FORECAST (
    PK VARCHAR(500) NOT NULL PRIMARY KEY,
    PROFITCENTER NUMBER(38,0),
    WBS VARCHAR(500),
    ACCOUNT_NUMBER NUMBER(38,0),
    YEAR VARCHAR(10) NOT NULL,
    MONTH VARCHAR(2) NOT NULL,
    SOURCE VARCHAR(7),
    LOAD_START_TS VARCHAR(50),
    AMOUNT FLOAT,
    DBT_SCD_ID VARCHAR(32),
    DBT_UPDATED_AT VARCHAR(50),
    DBT_VALID_FROM VARCHAR(50),
    DBT_VALID_TO VARCHAR(50),
    PERIOD VARCHAR(10),

    -- Secondary indexes for common query patterns
    INDEX IDX_GROUPING (PROFITCENTER, WBS, ACCOUNT_NUMBER, YEAR),
    INDEX IDX_PERIOD (PERIOD)
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  FORECASTING_PROD.OPERATIONAL.FDWH_FORECAST
  TO ROLE FORECASTING_APP_ROLE;
```

#### Phase 3: Update Backend Configuration (Day 2)

**Updated `database.py`**:

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_TYPE = os.environ.get("DATABASE_TYPE", "sqlite")

if DATABASE_TYPE == "snowflake":
    from snowflake.sqlalchemy import URL

    engine = create_engine(URL(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        database=os.environ.get("SNOWFLAKE_DATABASE", "FORECASTING_PROD"),
        schema=os.environ.get("SNOWFLAKE_SCHEMA", "OPERATIONAL"),
        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "FORECASTING_WH"),
    ))

    # Local SQLite for metadata tables
    local_engine = create_engine("sqlite:///./local_metadata.db")
    LocalSessionLocal = sessionmaker(bind=local_engine)
else:
    DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./forecasts.db")
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Phase 4: Update Repository for Dual-Database (Day 2-3)

**Key Changes to `forecast_repository.py`**:

```python
class ForecastRepository:
    def __init__(self, snowflake_db: Session, local_db: Session = None):
        self.sf_db = snowflake_db
        self.local_db = local_db or snowflake_db  # Same DB in SQLite mode
        self.is_snowflake = os.environ.get("DATABASE_TYPE") == "snowflake"

    def create(self, forecast_data: dict, created_by: str = "System"):
        # Transform to monthly records
        year = forecast_data.get('year', '2026')
        monthly_records = yearly_forecast_to_monthly_records(forecast_data, year)
        metadata = extract_metadata_from_yearly(forecast_data, year)

        # Insert monthly records to Snowflake (or SQLite)
        for record in monthly_records:
            db_record = FdwhForecast(**record)
            self.sf_db.add(db_record)

        # Insert metadata to local database
        metadata['created_by'] = created_by
        db_metadata = ForecastMetadata(**metadata)
        self.local_db.add(db_metadata)

        self.sf_db.commit()
        if self.local_db != self.sf_db:
            self.local_db.commit()

        return self.get_by_id(metadata['forecast_key'])
```

#### Phase 5: Data Migration Script (Day 3)

```python
# scripts/migrate_to_snowflake.py
import snowflake.connector
import sqlite3
from datetime import datetime

def migrate_forecasts():
    """Migrate fdwh_forecast data from SQLite to Snowflake Hybrid Table"""

    # Source: SQLite
    sqlite_conn = sqlite3.connect('backend/forecasts.db')
    sqlite_cursor = sqlite_conn.cursor()

    # Target: Snowflake
    sf_conn = snowflake.connector.connect(
        account=os.environ['SNOWFLAKE_ACCOUNT'],
        user=os.environ['SNOWFLAKE_USER'],
        password=os.environ['SNOWFLAKE_PASSWORD'],
        database='FORECASTING_PROD',
        schema='OPERATIONAL',
        warehouse='FORECASTING_WH'
    )
    sf_cursor = sf_conn.cursor()

    try:
        # Read from SQLite
        sqlite_cursor.execute("""
            SELECT pk, profitcenter, wbs, account_number, year, month,
                   source, load_start_ts, amount, dbt_scd_id,
                   dbt_updated_at, dbt_valid_from, dbt_valid_to, period
            FROM fdwh_forecast
        """)
        records = sqlite_cursor.fetchall()

        print(f"Migrating {len(records)} records...")

        # Batch insert to Snowflake
        sf_cursor.executemany("""
            INSERT INTO FDWH_FORECAST
            (PK, PROFITCENTER, WBS, ACCOUNT_NUMBER, YEAR, MONTH,
             SOURCE, LOAD_START_TS, AMOUNT, DBT_SCD_ID,
             DBT_UPDATED_AT, DBT_VALID_FROM, DBT_VALID_TO, PERIOD)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, records)

        sf_conn.commit()
        print(f"Migration complete: {len(records)} records transferred")

    finally:
        sqlite_conn.close()
        sf_conn.close()

if __name__ == "__main__":
    migrate_forecasts()
```

#### Phase 6: Environment Variables (Day 3)

**.env.production**:
```bash
DATABASE_TYPE=snowflake
SNOWFLAKE_ACCOUNT=your_account.region.aws
SNOWFLAKE_USER=FORECASTING_APP_SVC
SNOWFLAKE_PASSWORD=${SNOWFLAKE_PASSWORD}  # From secrets manager
SNOWFLAKE_DATABASE=FORECASTING_PROD
SNOWFLAKE_SCHEMA=OPERATIONAL
SNOWFLAKE_WAREHOUSE=FORECASTING_WH
```

#### Phase 7: Docker Compose for Production (Day 4)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_TYPE=snowflake
      - SNOWFLAKE_ACCOUNT=${SNOWFLAKE_ACCOUNT}
      - SNOWFLAKE_USER=${SNOWFLAKE_USER}
      - SNOWFLAKE_PASSWORD=${SNOWFLAKE_PASSWORD}
      - SNOWFLAKE_DATABASE=FORECASTING_PROD
      - SNOWFLAKE_SCHEMA=OPERATIONAL
      - SNOWFLAKE_WAREHOUSE=FORECASTING_WH
    volumes:
      - ./data:/app/data  # Local metadata DB
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_BASE_URL=/api
    ports:
      - "3000:80"
    depends_on:
      backend:
        condition: service_healthy
```

### 8.4 Validation Checklist

| Test | Expected Result | Command/Method |
|------|-----------------|----------------|
| Hybrid table exists | 1 table | `SHOW HYBRID TABLES IN OPERATIONAL` |
| Row count matches | Same as SQLite | Compare `SELECT COUNT(*)` |
| CRUD works | 201, 200, 204 status | Run API tests |
| Single read latency | < 100ms | Measure `GET /forecasts/{id}` |
| Batch create | All 12 records inserted | Create forecast, verify |
| Concurrent writes | No errors | Load test with 10 users |

### 8.5 Rollback Plan

If issues occur post-migration:

1. **Immediate**: Set `DATABASE_TYPE=sqlite` and restart
2. **Data sync**: Run reverse migration script (Snowflake → SQLite)
3. **Investigation**: Debug in staging environment

```bash
# Quick rollback
export DATABASE_TYPE=sqlite
docker-compose restart backend
```

### 8.6 Cost Estimate

| Component | Monthly Cost (Est.) |
|-----------|---------------------|
| Hybrid Table storage | ~$50-100 (depends on data size) |
| XSMALL warehouse (on-demand) | ~$200-400 (depends on usage) |
| Snowflake compute credits | ~$2-3 per credit |
| **Total** | **~$300-600/month** |

*Costs can be optimized with auto-suspend (60s) and result caching.*

---

## Summary

This document describes a well-architected financial forecasting application with:

1. **Clear separation of concerns**: Routes → Transformation → Repository → Database
2. **Snowflake-ready schema**: Core data table matches Snowflake exactly
3. **Dual storage model**: Snowflake-synced data + local UI metadata
4. **Approval workflow**: Batch-based snapshot system for financial compliance
5. **Migration path**: Clear plan to move from SQLite to Snowflake Hybrid Tables

The architecture prioritizes:
- **Database portability** (SQLite ↔ Snowflake)
- **Financial compliance** (audit trails, approval workflow)
- **Developer experience** (clear patterns, testability)
- **Production readiness** (containerized, health checks)
