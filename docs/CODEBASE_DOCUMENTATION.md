# Spending Forecast Tracker - Complete Technical Documentation

**Document Version:** 2.3
**Last Updated:** January 2026
**Status:** Production-Ready Architecture (Unified Storage Model + Docker Seeding)

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
9. [Docker Containerization](#9-docker-containerization)
   - [9.13 Database Seeding](#913-database-seeding)

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
| **Architecture** | Unified storage model: All data (including UI metadata) syncs to Snowflake |

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
│  │  │ FdwhForecast (with embedded UI metadata)                     │ │    │
│  │  │ Departments, Projects (lookup tables)                       │ │    │
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
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │ SNOWFLAKE-SYNCED                                               │    │
│   │ fdwh_forecast (LIVE + SNAP records with embedded UI metadata)  │    │
│   └───────────────────────────────────────────────────────────────┘    │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │ LOCAL ONLY (lookup tables)                                     │    │
│   │ departments, projects                                          │    │
│   └───────────────────────────────────────────────────────────────┘    │
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

**Decision**: Store each forecast as 12 separate database records (one per month) rather than a single row with 12 columns. Both LIVE forecasts and SNAPshots use the same table.

**Implementation**:
```python
# fdwh_forecast table stores one record per month for both LIVE and SNAP
class FdwhForecast(Base):
    pk = Column(String, primary_key=True)  # {pc}_{wbs}_{acc}_{year}_{month}_{record_type}_{snapshot_id}
    year = Column(String)
    month = Column(String)  # "01" to "12"
    amount = Column(Float)
    record_type = Column(String)  # "LIVE" or "SNAP"
    snapshot_id = Column(String)  # "0" for LIVE, UUID for SNAP
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
| **Unified Storage** | Both LIVE and SNAP records in same table enables single-query Snowflake sync |

**Trade-off Accepted**: Requires a transformation layer to convert between API (yearly) and storage (monthly) formats. This overhead is minimal and cleanly encapsulated in `forecast_transformation.py`.

---

### 4.2 Unified Storage Model (All Data in Snowflake-Synced Table)

**Decision**: Embed all UI metadata directly in the `fdwh_forecast` table so all data syncs to Snowflake. This ensures data persistence across container restarts.

**Implementation**:
```
┌─────────────────────────────────────────────────────────────────┐
│                       fdwh_forecast                              │
│              (Syncs to Snowflake - includes UI metadata)         │
├─────────────────────────────────────────────────────────────────┤
│ pk (composite)              │ Core identifying fields            │
│ profitcenter, wbs           │                                    │
│ account_number              │                                    │
│ year, month, amount         │                                    │
│ source, period              │                                    │
│ dbt_scd_id, dbt_*           │ DBT SCD tracking                   │
│ record_type, snapshot_id    │ LIVE vs SNAP discrimination        │
│ batch_id, is_approved, ...  │ Snapshot/approval fields           │
├─────────────────────────────┼────────────────────────────────────┤
│ department_id               │ UI metadata (embedded)             │
│ project_id, project_name    │                                    │
│ created_by                  │                                    │
│ created_at, updated_at      │                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Container Persistence** | All data survives container restarts - no local-only state |
| **Snowflake Sync** | Single table sync includes all data needed for reporting |
| **Simplified Architecture** | No separate metadata table, no dual-database operations |
| **Data Consistency** | Metadata is always present with forecast data |
| **Audit in Snowflake** | Audit fields (`created_by`, etc.) are available for warehouse reporting |

**Trade-off Accepted**: Metadata is duplicated across 12 monthly records per forecast. This minor denormalization is acceptable for the benefits of unified storage and container persistence.

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

### 4.6 Unified Storage for LIVE and SNAP Records

**Decision**: Store both LIVE forecasts and SNAP (snapshot) copies in the same `fdwh_forecast` table, differentiated by `record_type` and `snapshot_id`.

**Schema Design**:
```
fdwh_forecast (unified table)
├── Core fields: profitcenter, wbs, account_number, year, month, amount
├── Record discrimination:
│   ├── record_type: 'LIVE' or 'SNAP'
│   └── snapshot_id: '0' for LIVE, UUID for SNAP
├── Snapshot-specific fields (NULL for LIVE):
│   ├── batch_id, is_approved, snapshot_date
│   ├── submitted_by, approved_by, approved_at
│   └── source_forecast_key (links back to source)
└── PK format: {pc}_{wbs}_{acc}_{year}_{month}_{record_type}_{snapshot_id}
```

**Why This Design**:

| Reason | Explanation |
|--------|-------------|
| **Snowflake Sync** | Both LIVE and SNAP records sync to Snowflake in a single table |
| **Audit Compliance** | Financial systems require point-in-time records for audit |
| **Non-Destructive** | Approval doesn't modify live forecasts |
| **Batch Operations** | Department head can approve all department forecasts at once |
| **Clear Accountability** | `submitted_by` and `approved_by` create audit trail |
| **Historical Comparison** | Compare approved snapshot vs current live forecast |
| **Simplified Schema** | No separate snapshot tables - single table for all forecast data |

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
│    │   (includes embedded UI metadata: department_id, project_id, etc.)  │
│    └── INSERT 12 FdwhForecast records (with metadata in each record)     │
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
| `generate_pk()` | Create full primary key | (pc, wbs, acc, year, month, type, snap_id) → `"1000_WBS_4210_2026_03_LIVE_0"` |
| `yearly_forecast_to_monthly_records()` | Convert yearly to 12 monthly (with metadata) | `{jan: 100, feb: 200, department_id: 1...}` → `[{pk, month: "01", amount: 100, department_id: 1}, ...]` |
| `monthly_records_to_yearly_forecast()` | Convert 12 monthly to yearly | `[FdwhForecast, ...]` → `{jan: 100, feb: 200, total: ..., department_id: 1}` |
| `monthly_records_to_snapshot_view()` | Convert SNAP records to yearly | `[FdwhForecast(SNAP), ...]` → `{jan, feb..., isApproved, submittedBy...}` |

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

`fdwh_forecast` (12 records with embedded metadata):
```
pk                                  | month | amount | profitcenter | wbs    | account_number | department_id | project_id | created_by
1000_PROJ-A_4210_2026_01_LIVE_0    | 01    | 5000   | 1000         | PROJ-A | 4210           | 1             | 3          | System
1000_PROJ-A_4210_2026_02_LIVE_0    | 02    | 5000   | 1000         | PROJ-A | 4210           | 1             | 3          | System
1000_PROJ-A_4210_2026_03_LIVE_0    | 03    | 6000   | 1000         | PROJ-A | 4210           | 1             | 3          | System
... (9 more rows, all with same metadata)
```

Note: UI metadata (`department_id`, `project_id`, `project_name`, `created_by`, `created_at`, `updated_at`) is duplicated across all 12 monthly records. This ensures metadata persists with the forecast data when synced to Snowflake.

---

## 6. Current Database Schema

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│      departments        │       │       projects          │
│    (Lookup table)       │       │    (Lookup table)       │
├─────────────────────────┤       ├─────────────────────────┤
│ id (PK, INTEGER)        │───┐   │ id (PK, INTEGER)        │
│ name (VARCHAR)          │   │   │ name (VARCHAR)          │
│ code (VARCHAR, UNIQUE)  │   └──►│ department_id (FK)      │
└─────────────────────────┘       │ code (VARCHAR, UNIQUE)  │
                                  └─────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                          fdwh_forecast                                  │
│     (SNOWFLAKE-SYNCED - Unified storage for LIVE and SNAP)             │
│     (UI metadata embedded directly for container persistence)           │
├────────────────────────────────────────────────────────────────────────┤
│ pk (PK, VARCHAR) ───────── Format: {pc}_{wbs}_{acc}_{year}_{month}     │
│                            _{record_type}_{snapshot_id}                 │
│ ─── Core Identifying Fields ───                                         │
│ profitcenter (INTEGER)                                                  │
│ wbs (VARCHAR)                                                           │
│ account_number (INTEGER)                                                │
│ year (VARCHAR) ─────────── "2026"                                       │
│ month (VARCHAR) ────────── "01" to "12"                                 │
│ amount (FLOAT)                                                          │
│ source (VARCHAR(7)) ────── "MANUAL" or "IMPORT"                         │
│ load_start_ts (VARCHAR)                                                 │
│ period (VARCHAR) ───────── "2026-01" (YYYY-MM)                         │
│                                                                         │
│ ─── DBT SCD Tracking ───                                                │
│ dbt_scd_id (VARCHAR(32))                                                │
│ dbt_updated_at (VARCHAR)                                                │
│ dbt_valid_from (VARCHAR)                                                │
│ dbt_valid_to (VARCHAR)                                                  │
│                                                                         │
│ ─── Record Type Discrimination ───                                      │
│ record_type (VARCHAR) ──── "LIVE" or "SNAP"                            │
│ snapshot_id (VARCHAR) ──── "0" for LIVE, UUID for SNAP                 │
│                                                                         │
│ ─── Snapshot-specific fields (NULL for LIVE) ───                       │
│ batch_id (VARCHAR) ─────── Groups snapshots for batch approval          │
│ is_approved (BOOLEAN)                                                   │
│ snapshot_date (DATETIME)                                                │
│ submitted_by (VARCHAR)                                                  │
│ approved_by (VARCHAR)                                                   │
│ approved_at (DATETIME)                                                  │
│ source_forecast_key ────── Links snapshot to original LIVE forecast     │
│                                                                         │
│ ─── UI Metadata (embedded for Snowflake persistence) ───               │
│ department_id (INTEGER) ── References departments.id                    │
│ project_id (INTEGER) ───── References projects.id                       │
│ project_name (VARCHAR)                                                  │
│ created_by (VARCHAR)                                                    │
│ created_at (DATE)                                                       │
│ updated_at (DATE)                                                       │
├────────────────────────────────────────────────────────────────────────┤
│ INDEX idx_forecast_grouping (profitcenter, wbs, account_number, year)  │
│ INDEX idx_forecast_period (period)                                      │
│ INDEX idx_forecast_record_type (record_type)                            │
│ INDEX idx_forecast_snapshot_id (snapshot_id)                            │
│ INDEX idx_forecast_batch (batch_id)                                     │
└────────────────────────────────────────────────────────────────────────┘
```

**Note**: The `forecast_metadata` table has been removed. UI metadata is now embedded directly in `fdwh_forecast` records to ensure persistence across container restarts and Snowflake sync.

### 6.2 Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| Department → Projects | 1:N | Department has many projects |
| FdwhForecast grouping | 12:1 | 12 monthly records share same (profitcenter, wbs, account_number, year) |
| FdwhForecast (LIVE) → FdwhForecast (SNAP) | 1:N | One LIVE forecast can have multiple snapshots (via source_forecast_key) |
| Snapshot (by snapshot_id) | 1:12 | One snapshot_id groups 12 monthly SNAP records |

**Note**: `department_id` and `project_id` in `fdwh_forecast` are denormalized references (not foreign keys) to maintain Snowflake compatibility and avoid cross-table joins during sync.

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
│  │  │ Layer         │  │         │  │ ┌───────────┐ │  │                │
│  │  └───────────────┘  │         │  │ │LIVE + SNAP│ │  │                │
│  └─────────────────────┘         │  │ │ records   │ │  │                │
│                                  │  │ └───────────┘ │  │                │
│                                  │  └───────────────┘  │                │
│                                  │         │          │                │
│                                  │         ▼ (DBT)    │                │
│                                  │  ┌───────────────┐  │                │
│                                  │  │ Analytical    │  │                │
│                                  │  │ Tables        │  │                │
│                                  │  │ (Warehouse)   │  │                │
│                                  │  └───────────────┘  │                │
│                                  └─────────────────────┘                │
│                                                                          │
│  SYNCED TO SNOWFLAKE (fdwh_forecast):                                    │
│  - LIVE forecasts (record_type='LIVE') with embedded UI metadata         │
│  - SNAP forecasts (record_type='SNAP') with approval + UI metadata       │
│                                                                          │
│  LOCAL-ONLY TABLES (lookup tables, not synced):                          │
│  - departments, projects                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key Benefit**: Both LIVE and SNAP records are now in a single `fdwh_forecast` table, enabling unified Snowflake sync. Queries like `SELECT * FROM fdwh_forecast WHERE record_type='SNAP' AND is_approved=true` can retrieve all approved snapshots for reporting.

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
-- Includes embedded UI metadata for container persistence
CREATE HYBRID TABLE FORECASTING_PROD.OPERATIONAL.FDWH_FORECAST (
    PK VARCHAR(500) NOT NULL PRIMARY KEY,
    -- Core identifying fields
    PROFITCENTER NUMBER(38,0),
    WBS VARCHAR(500),
    ACCOUNT_NUMBER NUMBER(38,0),
    YEAR VARCHAR(10) NOT NULL,
    MONTH VARCHAR(2) NOT NULL,
    SOURCE VARCHAR(7),
    LOAD_START_TS VARCHAR(50),
    AMOUNT FLOAT,
    PERIOD VARCHAR(10),
    -- DBT SCD tracking
    DBT_SCD_ID VARCHAR(32),
    DBT_UPDATED_AT VARCHAR(50),
    DBT_VALID_FROM VARCHAR(50),
    DBT_VALID_TO VARCHAR(50),
    -- Record type discrimination
    RECORD_TYPE VARCHAR(10) NOT NULL DEFAULT 'LIVE',
    SNAPSHOT_ID VARCHAR(50) NOT NULL DEFAULT '0',
    -- Snapshot-specific fields (NULL for LIVE)
    BATCH_ID VARCHAR(100),
    IS_APPROVED BOOLEAN DEFAULT FALSE,
    SNAPSHOT_DATE TIMESTAMP_NTZ,
    SUBMITTED_BY VARCHAR(100),
    APPROVED_BY VARCHAR(100),
    APPROVED_AT TIMESTAMP_NTZ,
    SOURCE_FORECAST_KEY VARCHAR(500),
    -- UI metadata (embedded for persistence)
    DEPARTMENT_ID NUMBER(38,0),
    PROJECT_ID NUMBER(38,0),
    PROJECT_NAME VARCHAR(200),
    CREATED_BY VARCHAR(100),
    CREATED_AT DATE,
    UPDATED_AT DATE,

    -- Secondary indexes for common query patterns
    INDEX IDX_GROUPING (PROFITCENTER, WBS, ACCOUNT_NUMBER, YEAR),
    INDEX IDX_PERIOD (PERIOD),
    INDEX IDX_RECORD_TYPE (RECORD_TYPE),
    INDEX IDX_SNAPSHOT_ID (SNAPSHOT_ID),
    INDEX IDX_BATCH (BATCH_ID),
    INDEX IDX_DEPARTMENT (DEPARTMENT_ID)
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

#### Phase 4: Update Repository (Day 2-3)

**Key Changes to `forecast_repository.py`**:

With embedded metadata, the repository is simplified - no dual-database operations needed:

```python
class ForecastRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, forecast_data: dict, created_by: str = "System"):
        # Transform to monthly records with embedded UI metadata
        year = forecast_data.get('year', '2026')
        ui_metadata = {
            'created_by': created_by,
            'created_at': date.today(),
            'updated_at': date.today(),
        }
        monthly_records = yearly_forecast_to_monthly_records(
            forecast_data, year=year, ui_metadata=ui_metadata
        )

        # Insert monthly records (metadata is embedded in each record)
        for record in monthly_records:
            db_record = FdwhForecast(**record)
            self.db.add(db_record)

        self.db.commit()

        forecast_key = generate_forecast_key(
            forecast_data.get('profitcenter'),
            forecast_data.get('wbs'),
            forecast_data.get('account_number'),
            year
        )
        return self.get_by_id(forecast_key)
```

**Note**: The repository no longer needs separate `ForecastMetadata` operations. All metadata is embedded in the `FdwhForecast` records.

#### Phase 5: Data Migration Script (Day 3)

```python
# scripts/migrate_to_snowflake.py
import snowflake.connector
import sqlite3
import os

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
        # Read from SQLite (including embedded metadata columns)
        sqlite_cursor.execute("""
            SELECT pk, profitcenter, wbs, account_number, year, month,
                   source, load_start_ts, amount, period,
                   dbt_scd_id, dbt_updated_at, dbt_valid_from, dbt_valid_to,
                   record_type, snapshot_id,
                   batch_id, is_approved, snapshot_date, submitted_by,
                   approved_by, approved_at, source_forecast_key,
                   department_id, project_id, project_name,
                   created_by, created_at, updated_at
            FROM fdwh_forecast
        """)
        records = sqlite_cursor.fetchall()

        print(f"Migrating {len(records)} records...")

        # Batch insert to Snowflake (all columns including metadata)
        sf_cursor.executemany("""
            INSERT INTO FDWH_FORECAST
            (PK, PROFITCENTER, WBS, ACCOUNT_NUMBER, YEAR, MONTH,
             SOURCE, LOAD_START_TS, AMOUNT, PERIOD,
             DBT_SCD_ID, DBT_UPDATED_AT, DBT_VALID_FROM, DBT_VALID_TO,
             RECORD_TYPE, SNAPSHOT_ID,
             BATCH_ID, IS_APPROVED, SNAPSHOT_DATE, SUBMITTED_BY,
             APPROVED_BY, APPROVED_AT, SOURCE_FORECAST_KEY,
             DEPARTMENT_ID, PROJECT_ID, PROJECT_NAME,
             CREATED_BY, CREATED_AT, UPDATED_AT)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
2. **Snowflake-ready schema**: Single table with all data (including UI metadata)
3. **Unified storage model**: All data syncs to Snowflake for container persistence
4. **Approval workflow**: Batch-based snapshot system for financial compliance
5. **Migration path**: Clear plan to move from SQLite to Snowflake Hybrid Tables

The architecture prioritizes:
- **Container persistence** (all data survives restarts via Snowflake sync)
- **Database portability** (SQLite ↔ Snowflake)
- **Financial compliance** (audit trails, approval workflow)
- **Developer experience** (clear patterns, testability)
- **Production readiness** (containerized, health checks)

---

## 9. Docker Containerization

### 9.1 Overview

The application is fully containerized using Docker with a two-container architecture:

| Container | Technology | Internal Port | External Port |
|-----------|------------|---------------|---------------|
| **Backend** | FastAPI + Python 3.12 | 8000 | 8000 |
| **Frontend** | React + Nginx | 80 | 3000 |

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DOCKER COMPOSE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────┐      ┌─────────────────────────┐          │
│   │       FRONTEND          │      │        BACKEND          │          │
│   │     (Port 3000:80)      │      │     (Port 8000:8000)    │          │
│   ├─────────────────────────┤      ├─────────────────────────┤          │
│   │  nginx:alpine           │      │  python:3.12-slim       │          │
│   │  ┌───────────────────┐  │      │  ┌───────────────────┐  │          │
│   │  │ React Build (Vite)│  │      │  │ FastAPI + Uvicorn │  │          │
│   │  └───────────────────┘  │      │  └───────────────────┘  │          │
│   │                         │      │                         │          │
│   │  /api/* ────────────────┼─────►│  /api/*                 │          │
│   │  (proxy to backend)     │      │  (REST endpoints)       │          │
│   └─────────────────────────┘      └───────────┬─────────────┘          │
│                                                │                         │
│                                    ┌───────────▼─────────────┐          │
│                                    │      VOLUME: ./data     │          │
│                                    │   (SQLite persistence)  │          │
│                                    └─────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Prerequisites

Before running the application with Docker, ensure you have:

1. **Docker Desktop** installed and running
2. **Docker Compose** (included with Docker Desktop)

Verify installation:
```bash
docker --version        # Should show Docker version
docker compose version  # Should show Docker Compose version
```

### 9.3 Quick Start

**Start the application:**
```bash
# Navigate to project root
cd C:\Dev\forecasting-app-2

# Build and start containers (first time or after code changes)
docker compose up --build

# Or run in detached mode (background)
docker compose up --build -d

# With test data seeding (idempotent - won't duplicate if data exists)
SEED_DB=true docker compose up --build                    # Linux/macOS/Git Bash
set SEED_DB=true && docker compose up --build             # Windows CMD
$env:SEED_DB="true"; docker compose up --build            # Windows PowerShell

# Fresh reset (drops all tables, then seeds with test data)
SEED_DB=true RESET_DB=true docker compose up --build      # Linux/macOS/Git Bash
set SEED_DB=true && set RESET_DB=true && docker compose up --build  # Windows CMD
```

**Access the application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/health

**Stop the application:**
```bash
# Stop containers (keeps data)
docker compose down

# Stop and remove volumes (removes all data)
docker compose down -v
```

### 9.4 Docker Compose Configuration

**File**: `docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      # Persist SQLite database between container restarts
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:////app/data/forecasts.db
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        # Nginx proxies /api to backend, so we use relative path
        VITE_API_BASE_URL: /api
    ports:
      - "3000:80"
    depends_on:
      - backend
```

**Key Configuration Points:**

| Setting | Purpose |
|---------|---------|
| `volumes: ./data:/app/data` | Persists SQLite database on host machine |
| `VITE_API_BASE_URL: /api` | Frontend uses relative URL, Nginx proxies to backend |
| `depends_on: backend` | Frontend waits for backend to start |
| `healthcheck` | Docker monitors backend health |

### 9.5 Backend Dockerfile

**File**: `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies required for snowflake-connector-python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev libssl-dev && rm -rf /var/lib/apt/lists/*

# Install Poetry for dependency management
RUN pip install poetry

# Copy dependency files first (for Docker layer caching)
COPY pyproject.toml poetry.lock* ./

# Configure Poetry to not create virtual env (we're in a container)
RUN poetry config virtualenvs.create false

# Install production dependencies only
RUN poetry install --no-interaction --no-ansi --only main --no-root

# Copy application code
COPY src/ ./src/

# Copy and prepare entrypoint script (handles optional database seeding)
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 8000

# Use entrypoint for optional seeding, then run the application
ENTRYPOINT ["./entrypoint.sh"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build Process:**
1. Uses Python 3.12 slim image (~150MB base)
2. Installs system dependencies for Snowflake connector
3. Installs Poetry for dependency management
4. Copies and installs only production dependencies (no dev/test)
5. Copies application source code
6. Copies entrypoint script that handles optional database seeding
7. Creates data directory for SQLite persistence
8. Uses entrypoint script + Uvicorn ASGI server

**Entrypoint Script** (`backend/entrypoint.sh`):
```bash
#!/bin/bash
set -e

# Optional database seeding on startup
if [ "$SEED_DB" = "true" ]; then
    echo "=== Seeding database with test data ==="
    python src/init_db.py
    echo "=== Database seeding complete ==="
fi

# Execute the main command (uvicorn)
exec "$@"
```

### 9.6 Frontend Dockerfile

**File**: `frontend/Dockerfile`

```dockerfile
# Build stage - compiles TypeScript and bundles React
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build argument allows API URL configuration at build time
ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Production stage - serves static files with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Multi-Stage Build Benefits:**
- Build stage: Node.js for compiling TypeScript + Vite bundling
- Production stage: Nginx (~25MB) serves static files
- Final image is ~30MB instead of ~400MB with Node.js

### 9.7 Nginx Configuration

**File**: `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression for faster loading
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets for 1 year
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend container
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Nginx Features:**
- **SPA Routing**: All routes serve `index.html` (React Router handles client-side routing)
- **API Proxy**: `/api/*` requests are forwarded to `backend:8000`
- **Gzip**: Compresses text-based assets for faster transfer
- **Caching**: Static assets cached for 1 year with immutable header

### 9.8 Common Commands

| Command | Description |
|---------|-------------|
| `docker compose up --build` | Build images and start containers |
| `docker compose up -d` | Start containers in background |
| `SEED_DB=true docker compose up --build` | Start with database seeding (Linux/macOS) |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop, remove containers and volumes |
| `docker compose logs -f` | Follow container logs |
| `docker compose logs backend` | View backend logs only |
| `docker compose logs frontend` | View frontend logs only |
| `docker compose ps` | List running containers |
| `docker compose exec backend bash` | Shell into backend container |
| `docker compose build --no-cache` | Rebuild without cache |

### 9.9 Data Persistence

The SQLite database is persisted on the host machine:

```
forecasting-app-2/
└── data/
    └── forecasts.db    # SQLite database (persisted)
```

**Important**: The `./data` directory is mounted as a volume. Database changes survive container restarts. To reset the database, delete the `data/forecasts.db` file.

### 9.10 Troubleshooting

**Container won't start:**
```bash
# Check container logs
docker compose logs backend
docker compose logs frontend

# Verify port availability
netstat -an | findstr 3000
netstat -an | findstr 8000
```

**Database connection issues:**
```bash
# Verify volume mount
docker compose exec backend ls -la /app/data

# Check database file permissions
docker compose exec backend cat /app/data/forecasts.db
```

**Rebuild after code changes:**
```bash
# Force rebuild without cache
docker compose build --no-cache
docker compose up
```

**Network issues between containers:**
```bash
# Test backend connectivity from frontend
docker compose exec frontend ping backend
docker compose exec frontend curl http://backend:8000/health
```

### 9.11 Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| **Start Command** | `docker compose up --build` | `docker compose -f docker-compose.prod.yml up -d` |
| **Database** | SQLite (local file) | Snowflake Hybrid Tables |
| **Hot Reload** | Not enabled | Not applicable |
| **Debug Logging** | Enabled | Reduced |
| **SSL/TLS** | Not configured | Required |

For local development with hot reload, you may prefer running services directly:

```bash
# Terminal 1: Backend with hot reload
cd backend
poetry install
uvicorn src.main:app --reload --port 8000

# Terminal 2: Frontend with hot reload
cd frontend
npm install
npm run dev
```

### 9.12 Environment Variables

**Backend Environment:**

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:////app/data/forecasts.db` | Database connection string |
| `DATABASE_TYPE` | `sqlite` | Database type (`sqlite` or `snowflake`) |
| `SEED_DB` | `false` | Set to `true` to seed database with test data on startup |
| `RESET_DB` | `false` | Set to `true` to drop all tables before seeding (use with `SEED_DB=true`) |

**Frontend Build Args:**

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api` | API endpoint URL (baked into build) |

To override at build time:
```bash
docker compose build --build-arg VITE_API_BASE_URL=https://api.example.com
```

### 9.13 Database Seeding

The application supports optional database seeding with test data via environment variables. This is useful for development, testing, and demos.

**Seeding Options:**

| Mode | Command | Behavior |
|------|---------|----------|
| **Normal** | `docker compose up --build` | No seeding, empty database (tables created) |
| **Seed** | `SEED_DB=true docker compose up --build` | Seeds if database is empty, skips if data exists |
| **Reset + Seed** | `SEED_DB=true RESET_DB=true docker compose up --build` | Drops all tables, recreates, and seeds fresh data |

**Test Data Created:**

When seeding, the following test data is created:
- **5 Departments**: Teknologi, Markedsføring, Salg, Drift, Økonomi
- **10 Projects**: Linked to departments (2 per department)
- **8 Forecasts**: With realistic monthly amounts (96 total monthly records)

**Platform-Specific Commands:**

```bash
# Linux / macOS / Git Bash
SEED_DB=true docker compose up --build
SEED_DB=true RESET_DB=true docker compose up --build

# Windows CMD
set SEED_DB=true && docker compose up --build
set SEED_DB=true && set RESET_DB=true && docker compose up --build

# Windows PowerShell
$env:SEED_DB="true"; docker compose up --build
$env:SEED_DB="true"; $env:RESET_DB="true"; docker compose up --build
```

**Manual Seeding (without Docker):**

```bash
cd backend
python src/init_db.py           # Seed only (idempotent)
python src/init_db.py --reset   # Drop tables and reseed
RESET_DB=true python src/init_db.py  # Same as --reset
```
