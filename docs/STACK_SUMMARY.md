# Spending Forecast Tracker - Stack Summary

**Quick reference for architecture, design choices, and Snowflake integration**

---

## Technology Stack

| Layer | Technology | Why Chosen |
|-------|------------|------------|
| **Frontend** | React 19 + TypeScript + Ant Design | Modern, type-safe, enterprise-ready UI library |
| **Build** | Vite | Fast builds, excellent developer experience |
| **Backend** | FastAPI (Python 3.12) | High performance async API, auto-generated OpenAPI docs |
| **ORM** | SQLAlchemy 2.0 | Database-agnostic, works with SQLite and Snowflake |
| **Validation** | Pydantic | Runtime type validation, API schema generation |
| **Database (Dev)** | SQLite | Zero setup, portable, excellent for development |
| **Database (Prod)** | Snowflake Hybrid Tables | Low-latency CRUD with data warehouse integration |
| **Deployment** | Docker + Nginx | Containerized, portable, production-ready |

---

## Key Design Choices & Rationale

### 1. Monthly Record Storage (12 rows per forecast)
**Why?** Snowflake Hybrid Tables are optimized for row-oriented patterns. This enables:
- Flexible SQL aggregation (month, quarter, custom ranges)
- Multi-year support without schema changes
- Direct compatibility with dbt transformation models

### 2. Unified LIVE + SNAPSHOT Table
**Why?** All data (working forecasts + approval snapshots) lives in one `fdwh_forecast` table:
- Single Snowflake sync covers all data
- Historical snapshots preserved for audit compliance
- Simpler architecture, no dual-table operations

### 3. Composite Primary Keys
**Format:** `{profitcenter}_{wbs}_{account}_{year}_{month}_{record_type}_{snapshot_id}`

**Why?**
- Human-readable, self-documenting keys
- Deterministic - same data = same key (enables upserts)
- No auto-increment sequence sync needed between SQLite and Snowflake

### 4. Embedded UI Metadata
**Why?** Department, project, audit fields stored directly in forecast records:
- All data survives container restarts (persists to Snowflake)
- No local-only state that could be lost
- Full audit trail available in data warehouse

### 5. Repository Pattern
**Why?** All database operations go through repository classes:
- Easy to swap SQLite ↔ Snowflake
- Encapsulates complex 12-record grouping logic
- Enables unit testing without database

### 6. Yearly API ↔ Monthly Storage
**Why?** API uses yearly view (jan, feb... dec), storage uses monthly rows:
- Frontend works with intuitive yearly objects
- Storage optimized for Snowflake queries
- Clean separation - storage changes don't affect API consumers

---

## UI Metadata: How It's Handled

The application requires UI-specific fields that are **not part of the original fdwh_forecast schema**:

| Field | Purpose |
|-------|---------|
| `department_id` | Links forecast to department for filtering |
| `project_id` | Links forecast to project |
| `project_name` | Denormalized for display |
| `created_by` | Audit: who created the forecast |
| `created_at` / `updated_at` | Audit timestamps |
| `submitted_by` / `approved_by` | Snapshot approval workflow |
| `batch_id` / `is_approved` | Batch approval tracking |

### Two Approaches

#### Option A: Embed in fdwh_forecast (Current Implementation)

```
fdwh_forecast (modified)
├── pk, profitcenter, wbs, account_number   ← Original fields
├── year, month, amount, source, period     ← Original fields
├── dbt_scd_id, dbt_valid_from, ...         ← Original fields
├── department_id, project_id               ← UI metadata (added)
├── created_by, created_at, updated_at      ← UI metadata (added)
└── batch_id, is_approved, submitted_by     ← UI metadata (added)
```

| Pros | Cons |
|------|------|
| Single table sync to Snowflake | Requires modifying existing Snowflake table |
| All data survives container restarts | UI fields duplicated across 12 monthly rows |
| No JOINs needed for queries | Schema differs from source system |
| Simpler reporting queries | Need coordination with data warehouse team |

#### Option B: Separate Metadata Table (Alternative)

```
fdwh_forecast (unchanged)              forecast_ui_metadata (new Snowflake table)
├── pk                                 ├── forecast_key (PK) ─────────────────┐
├── profitcenter, wbs                  ├── department_id                      │
├── account_number, year, month        ├── project_id, project_name           │
├── amount, source, period             ├── created_by, created_at             │
└── dbt_* fields                       └── updated_at                         │
         │                                                                    │
         └── JOIN ON forecast_key = {pc}_{wbs}_{acc}_{year} ─────────────────┘
```

| Pros | Cons |
|------|------|
| Original fdwh_forecast unchanged | Requires JOIN for full forecast data |
| No duplication (1 metadata row per forecast) | Two tables to sync to Snowflake |
| Clean separation of concerns | More complex repository logic |
| Warehouse team doesn't touch existing table | Both tables must be Hybrid Tables for persistence |

### Why Option A Was Chosen

**Primary driver: Container persistence without complexity**

- If metadata table were local-only (not in Snowflake), container restarts would lose all department assignments and audit trails
- If metadata table syncs to Snowflake, we have two-table sync complexity anyway
- Embedding avoids JOIN overhead on every read operation
- Financial audit fields (created_by, approved_by) are available directly in warehouse queries

### When to Use Option B Instead

Choose the separate table approach if:
- The existing `fdwh_forecast` table is **owned by another team** and cannot be modified
- There's a strict requirement to keep the **source schema unchanged**
- The warehouse team has concerns about **schema drift** from upstream systems

**Implementation note:** If Option B is needed, the `forecast_ui_metadata` table must also be a Snowflake Hybrid Table (not local SQLite) to ensure data persistence.

---

## Snowflake Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA WRITE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User creates/updates forecast in UI                                    │
│                    │                                                     │
│                    ▼                                                     │
│   Frontend sends yearly object: { jan: 5000, feb: 6000, ... dec: 7000 } │
│                    │                                                     │
│                    ▼                                                     │
│   Backend transformation layer converts to 12 monthly records            │
│   └── yearly_forecast_to_monthly_records()                              │
│                    │                                                     │
│                    ▼                                                     │
│   Repository inserts/updates 12 rows in fdwh_forecast table              │
│   └── Each row: pk, month, amount, + all metadata fields                │
│                    │                                                     │
│                    ▼                                                     │
│   Snowflake Hybrid Table receives rows (low-latency CRUD)               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA READ FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Frontend requests forecasts for department                             │
│                    │                                                     │
│                    ▼                                                     │
│   Repository queries: SELECT * FROM fdwh_forecast                       │
│                       WHERE record_type='LIVE'                          │
│                       AND department_id = ?                              │
│                    │                                                     │
│                    ▼                                                     │
│   Groups 12 monthly records by (profitcenter, wbs, account, year)        │
│                    │                                                     │
│                    ▼                                                     │
│   Transformation layer converts to yearly view                           │
│   └── monthly_records_to_yearly_forecast()                              │
│                    │                                                     │
│                    ▼                                                     │
│   Returns: { id, jan, feb, ... dec, total, departmentId, ... }          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Snowflake Table Structure

```sql
FDWH_FORECAST (Hybrid Table)
├── pk (PRIMARY KEY)           -- Composite key
├── profitcenter, wbs, account_number, year, month
├── amount                     -- Monthly amount
├── record_type                -- 'LIVE' or 'SNAP'
├── snapshot_id                -- '0' for LIVE, UUID for SNAP
├── batch_id, is_approved      -- Approval workflow
├── department_id, project_id  -- Organizational context
├── created_by, created_at     -- Audit fields
└── dbt_scd_id, dbt_valid_from -- DBT SCD tracking (for warehouse)
```

---

## Common Client Questions

| Question | Answer |
|----------|--------|
| **"How is data persisted?"** | All data stored in Snowflake Hybrid Tables. SQLite used only for local development. |
| **"What happens if container restarts?"** | All data is safe - stored in Snowflake, not container. |
| **"How are approvals tracked?"** | Snapshots created from live forecasts with full audit trail (who, when). |
| **"Can multiple users edit simultaneously?"** | Yes - Snowflake Hybrid Tables support row-level locking. |
| **"How does it integrate with existing data warehouse?"** | fdwh_forecast table includes dbt SCD fields for direct warehouse integration. |
| **"What's the API response time?"** | Hybrid Tables provide <100ms latency for single-record operations. |
| **"How is security handled?"** | CORS restricted to allowed origins. Auth middleware ready (JWT + Passlib installed). |
| **"Can we run reports on approved forecasts?"** | Yes - query `WHERE record_type='SNAP' AND is_approved=true` in Snowflake. |
| **"How do we add a new department?"** | Add to departments lookup table. Forecasts reference via department_id. |
| **"What if we need multi-year forecasts?"** | Supported - just change year value. No schema changes needed. |

---

## Quick Reference: Key Files

| Purpose | File Location |
|---------|---------------|
| **Database models** | `backend/src/models/database.py` |
| **Transformation logic** | `backend/src/services/forecast_transformation.py` |
| **Forecast CRUD** | `backend/src/repositories/forecast_repository.py` |
| **API endpoints** | `backend/src/api/routes/forecasts.py` |
| **Frontend state** | `frontend/src/pages/Dashboard.tsx` |
| **API client** | `frontend/src/services/api.ts` |
| **Docker config** | `docker-compose.yml` |
| **Full documentation** | `docs/CODEBASE_DOCUMENTATION.md` |

---

## Environment Quick Reference

```bash
# Start application (development)
docker compose up --build

# Start with test data
SEED_DB=true docker compose up --build

# Reset and reseed database
SEED_DB=true RESET_DB=true docker compose up --build

# Access points
Frontend:    http://localhost:3000
API:         http://localhost:8000/api
Health:      http://localhost:8000/health
```

---

**For detailed technical documentation, see:** `docs/CODEBASE_DOCUMENTATION.md`
