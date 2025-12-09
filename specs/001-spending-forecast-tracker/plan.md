# Implementation Plan: Spending Forecast Tracker

**Branch**: `001-spending-forecast-tracker` | **Date**: 2025-11-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-spending-forecast-tracker/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a web application that enables users to view and register forecasted spending across departments and projects. The system will use a React frontend for the user interface, Snowflake for data storage, and SSO (Single Sign-On) for secure authentication. Users can create, view, edit, and filter spending forecasts with aggregations by department and project, organized by time periods (monthly, quarterly, yearly).

## Technical Context

**Language/Version**:
- Frontend: JavaScript/TypeScript with React 18.x
- Backend: Python 3.13

**Primary Dependencies**:
- Frontend: React 18.x, React Router, Axios, Ant Design 5.x, TanStack Table 8.x, React Hook Form 7.x
- Backend: FastAPI 0.115+, SQLAlchemy 2.0+ (async), Pydantic 2.x
- Authentication: Azure AD / Microsoft Entra ID (JWT tokens via OAuth 2.0 / OpenID Connect)
- Database: snowflake-connector-python 3.12+

**Storage**: Snowflake (cloud data warehouse)

**Testing**:
- Frontend: Jest, React Testing Library
- Backend: Pytest 8.x, pytest-asyncio
- E2E: Playwright 1.40+

**Target Platform**: Web application (desktop-focused, mobile-responsive)

**Project Type**: Web (frontend + backend)

**Performance Goals**:
- Dashboard load time: <3 seconds for 10,000 forecast records
- Filter operations: <2 seconds response time
- Form submission: <1 second round trip
- Support 100+ concurrent users

**Constraints**:
- Must integrate with existing SSO infrastructure
- Snowflake connection security and best practices
- Single-organization deployment (not multi-tenant)
- Currency in single denomination (USD)

**Scale/Scope**:
- Expected: 10,000+ forecast records
- Users: 50-500 concurrent users
- Departments: ~20-50
- Projects: ~100-500

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check (Before Phase 0)**: ✅ PASSED

**Note**: The constitution file is currently a template. This section evaluates the design against standard web application best practices:

- ✅ Clear separation of concerns (frontend/backend)
- ✅ RESTful API design following OpenAPI 3.0 specification
- ✅ Testable architecture with pytest and Playwright
- ✅ Security-first approach (AWS Cognito SSO integration)
- ✅ Scalable data access patterns (Snowflake connection pooling, materialized views)

**Re-evaluation After Phase 1 Design**: ✅ PASSED

Design artifacts reviewed:
- ✅ **Data Model** ([data-model.md](./data-model.md)): Normalized schema with appropriate indexes and clustering
- ✅ **API Contracts** ([api-spec.yaml](./contracts/api-spec.yaml)): RESTful design with proper validation and error handling
- ✅ **Technology Stack** ([research.md](./research.md)): Research-backed decisions for all technology choices
- ✅ **Performance Optimization**: Snowflake clustering, materialized views, connection pooling
- ✅ **Security**: JWT authentication, minimal privilege database roles, secrets management

**Architecture Compliance**:
- ✅ Backend: Python 3.13 + FastAPI (async, type-safe, auto-documented)
- ✅ Frontend: React 18.x + Ant Design (component-based, enterprise-ready)
- ✅ Database: Snowflake (optimized with clustering keys and materialized views)
- ✅ Testing: Multi-tier strategy (unit, integration, E2E)
- ✅ Authentication: Azure AD / Microsoft Entra ID (enterprise-grade SSO)

No constitutional violations identified. Design follows industry best practices for scalable web applications.

## Project Structure

### Documentation (this feature)

```text
specs/001-spending-forecast-tracker/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-spec.yaml    # OpenAPI specification
│   └── schemas/         # JSON schemas for validation
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/          # Data models and schemas
│   ├── services/        # Business logic layer
│   │   ├── forecast.service.js
│   │   ├── department.service.js
│   │   ├── project.service.js
│   │   └── auth.service.js
│   ├── repositories/    # Data access layer (Snowflake)
│   │   └── snowflake.repository.js
│   ├── api/             # REST API endpoints
│   │   ├── routes/
│   │   │   ├── forecasts.routes.js
│   │   │   ├── departments.routes.js
│   │   │   └── projects.routes.js
│   │   └── middleware/
│   │       ├── auth.middleware.js
│   │       └── validation.middleware.js
│   ├── config/          # Configuration files
│   │   ├── snowflake.config.js
│   │   └── sso.config.js
│   └── utils/           # Utility functions
│       ├── validators.js
│       └── formatters.js
└── tests/
    ├── integration/     # API integration tests
    ├── unit/            # Unit tests for services
    └── fixtures/        # Test data

frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── common/      # Shared components (Button, Input, etc.)
│   │   ├── forecasts/   # Forecast-specific components
│   │   │   ├── ForecastList.jsx
│   │   │   ├── ForecastForm.jsx
│   │   │   ├── ForecastFilters.jsx
│   │   │   └── ForecastCard.jsx
│   │   └── layout/      # Layout components (Header, Sidebar, etc.)
│   ├── pages/           # Page-level components
│   │   ├── Dashboard.jsx
│   │   ├── CreateForecast.jsx
│   │   └── EditForecast.jsx
│   ├── services/        # API client services
│   │   ├── api.js       # Base API configuration
│   │   ├── forecastService.js
│   │   ├── departmentService.js
│   │   └── projectService.js
│   ├── hooks/           # Custom React hooks
│   │   ├── useForecast.js
│   │   └── useAuth.js
│   ├── contexts/        # React contexts
│   │   └── AuthContext.jsx
│   ├── utils/           # Utility functions
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   └── constants.js
│   └── App.jsx          # Main application component
└── tests/
    ├── components/      # Component tests
    ├── integration/     # Integration tests
    └── e2e/             # End-to-end tests

shared/
└── types/               # Shared TypeScript types/interfaces
    ├── forecast.types.ts
    ├── department.types.ts
    └── project.types.ts
```

**Structure Decision**: Selected web application structure (Option 2) with separate frontend and backend directories. This separation enables:
- Independent deployment of frontend and backend
- Clear API contract boundaries
- Team specialization (frontend/backend developers)
- Easier testing and development workflows
- Scalability for future microservices if needed

## Complexity Tracking

No constitutional violations identified at this stage. Standard web application architecture with clear separation of concerns.
