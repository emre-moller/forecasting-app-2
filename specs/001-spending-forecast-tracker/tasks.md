# Tasks: Spending Forecast Tracker

**Input**: Design documents from `/specs/001-spending-forecast-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-spec.yaml

**Tests**: Tests are OPTIONAL and not included in this task list as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a **web application** with separate frontend and backend:
- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Shared types: `shared/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for both backend and frontend

- [ ] T001 [P] Initialize backend Python project with Poetry in backend/ directory
- [ ] T002 [P] Initialize frontend React project with Vite in frontend/ directory
- [ ] T003 [P] Create backend directory structure per plan.md: src/models/, src/services/, src/repositories/, src/api/, src/config/, src/utils/
- [ ] T004 [P] Create frontend directory structure per plan.md: src/components/, src/pages/, src/services/, src/hooks/, src/contexts/, src/utils/
- [ ] T005 [P] Install backend dependencies: FastAPI 0.115+, SQLAlchemy 2.0+, Pydantic 2.x, snowflake-connector-python 3.12+, pytest 8.x
- [ ] T006 [P] Install frontend dependencies: React 18.x, Ant Design 5.x, TanStack Table 8.x, React Hook Form 7.x, Axios, React Router
- [ ] T007 [P] Configure backend linting and formatting: Ruff, mypy
- [ ] T008 [P] Configure frontend linting: ESLint, Prettier
- [ ] T009 [P] Create shared TypeScript types directory in shared/types/
- [ ] T010 [P] Setup docker-compose.yml for local development environment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Configuration

- [ ] T011 Create Snowflake connection pool configuration in backend/src/config/snowflake.py with connection pooling (min_size=2, max_size=10, lifetime=3600)
- [ ] T012 [P] Create AWS Cognito SSO configuration in backend/src/config/sso.py
- [ ] T013 [P] Create environment configuration management in backend/src/config/settings.py using Pydantic BaseSettings
- [ ] T014 Create Snowflake database schema initialization script in backend/scripts/init_db.py

### Authentication & Security

- [ ] T015 Implement JWT token validation middleware in backend/src/api/middleware/auth.py
- [ ] T016 [P] Implement request validation middleware in backend/src/api/middleware/validation.py
- [ ] T017 [P] Create authentication context in frontend/src/contexts/AuthContext.jsx for AWS Cognito
- [ ] T018 [P] Implement useAuth hook in frontend/src/hooks/useAuth.js for SSO integration

### Base Infrastructure

- [ ] T019 Create base Snowflake repository class in backend/src/repositories/snowflake_repository.py with connection pool management
- [ ] T020 [P] Create base API client in frontend/src/services/api.js with Axios configuration and JWT token handling
- [ ] T021 [P] Implement error handling utilities in backend/src/utils/errors.py
- [ ] T022 [P] Implement error handling utilities in frontend/src/utils/errors.js
- [ ] T023 [P] Create validation utilities in backend/src/utils/validators.py
- [ ] T024 [P] Create formatting utilities in frontend/src/utils/formatters.js (currency, dates)
- [ ] T025 [P] Create constants file in frontend/src/utils/constants.js (period types, statuses)

### Shared Data Models

- [ ] T026 [P] Create User Pydantic model in backend/src/models/user.py
- [ ] T027 [P] Create Department Pydantic model in backend/src/models/department.py
- [ ] T028 [P] Create Project Pydantic model in backend/src/models/project.py
- [ ] T029 [P] Create Forecast Pydantic model in backend/src/models/forecast.py
- [ ] T030 [P] Create TypeScript user types in shared/types/user.types.ts
- [ ] T031 [P] Create TypeScript department types in shared/types/department.types.ts
- [ ] T032 [P] Create TypeScript project types in shared/types/project.types.ts
- [ ] T033 [P] Create TypeScript forecast types in shared/types/forecast.types.ts

### Database Tables

- [ ] T034 Create USERS table schema in Snowflake via backend/scripts/init_db.py
- [ ] T035 Create DEPARTMENTS table schema in Snowflake via backend/scripts/init_db.py
- [ ] T036 Create PROJECTS table schema in Snowflake via backend/scripts/init_db.py
- [ ] T037 Create FORECASTS table schema in Snowflake with clustering by (period_start_date, dept_id) via backend/scripts/init_db.py
- [ ] T038 Create FORECAST_AUDIT table schema in Snowflake via backend/scripts/init_db.py
- [ ] T039 [P] Load seed data for departments in backend/scripts/seed_data.py
- [ ] T040 [P] Load seed data for projects in backend/scripts/seed_data.py

### API Framework

- [ ] T041 Create FastAPI app instance with CORS middleware in backend/src/main.py
- [ ] T042 [P] Setup API router structure in backend/src/api/routes/__init__.py
- [ ] T043 [P] Create health check endpoint in backend/src/api/routes/health.py
- [ ] T044 [P] Create common layout components in frontend/src/components/layout/ (Header, Sidebar, MainLayout)
- [ ] T045 [P] Setup React Router configuration in frontend/src/App.jsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View All Spending Forecasts (Priority: P1) 🎯 MVP

**Goal**: Enable finance managers to view all forecasted spending across the organization with aggregations by department and project, organized by time period

**Independent Test**: Create sample forecast data, log in as a finance manager, navigate to the dashboard, and verify all forecasts are displayed with correct amounts, departments, projects, and aggregated totals by department and project

### Backend Implementation for US1

- [ ] T046 [P] [US1] Implement ForecastService.get_all() in backend/src/services/forecast_service.py to fetch forecasts with joins to departments and projects
- [ ] T047 [P] [US1] Implement DepartmentService.get_all() in backend/src/services/department_service.py
- [ ] T048 [P] [US1] Implement ProjectService.get_all() in backend/src/services/project_service.py
- [ ] T049 [US1] Implement GET /v1/forecasts endpoint in backend/src/api/routes/forecasts.py with pagination and basic filtering
- [ ] T050 [US1] Implement GET /v1/departments endpoint in backend/src/api/routes/departments.py
- [ ] T051 [US1] Implement GET /v1/projects endpoint in backend/src/api/routes/projects.py
- [ ] T052 [US1] Create materialized view for department aggregations in Snowflake: forecast_monthly_by_dept
- [ ] T053 [US1] Create materialized view for project aggregations in Snowflake: forecast_monthly_by_proj
- [ ] T054 [US1] Implement GET /v1/forecasts/aggregations/by-department endpoint in backend/src/api/routes/forecasts.py using materialized view
- [ ] T055 [US1] Implement GET /v1/forecasts/aggregations/by-project endpoint in backend/src/api/routes/forecasts.py using materialized view

### Frontend Implementation for US1

- [ ] T056 [P] [US1] Create ForecastService API client in frontend/src/services/forecastService.js with fetchForecasts(), getAggregationsByDepartment(), getAggregationsByProject()
- [ ] T057 [P] [US1] Create DepartmentService API client in frontend/src/services/departmentService.js
- [ ] T058 [P] [US1] Create ProjectService API client in frontend/src/services/projectService.js
- [ ] T059 [P] [US1] Create useForecast custom hook in frontend/src/hooks/useForecast.js with TanStack Query for caching
- [ ] T060 [US1] Create ForecastList component in frontend/src/components/forecasts/ForecastList.jsx using TanStack Table with virtual scrolling for 10,000+ records
- [ ] T061 [P] [US1] Create ForecastCard component in frontend/src/components/forecasts/ForecastCard.jsx to display individual forecast details
- [ ] T062 [P] [US1] Create DepartmentAggregation component in frontend/src/components/forecasts/DepartmentAggregation.jsx to display total spending per department
- [ ] T063 [P] [US1] Create ProjectAggregation component in frontend/src/components/forecasts/ProjectAggregation.jsx to display total spending per project
- [ ] T064 [US1] Create Dashboard page in frontend/src/pages/Dashboard.jsx integrating ForecastList, DepartmentAggregation, and ProjectAggregation components
- [ ] T065 [US1] Add routing for Dashboard page in frontend/src/App.jsx

**Checkpoint**: At this point, User Story 1 should be fully functional - users can view all forecasts with aggregations

---

## Phase 4: User Story 2 - Register New Spending Forecast (Priority: P2)

**Goal**: Enable department managers to create new spending forecasts by providing department, project, amount, time period, and description

**Independent Test**: Log in as a department manager, click "Register New Forecast", fill out the form with valid data, submit, and verify the forecast appears in the forecast list with correct details

### Backend Implementation for US2

- [ ] T066 [US2] Implement ForecastService.create() in backend/src/services/forecast_service.py with validation (positive amount, required fields, period alignment)
- [ ] T067 [US2] Implement POST /v1/forecasts endpoint in backend/src/api/routes/forecasts.py with authentication and validation
- [ ] T068 [US2] Add audit trail logging to ForecastService.create() to record creation in FORECAST_AUDIT table
- [ ] T069 [US2] Implement request validation schemas for CreateForecastRequest in backend/src/models/forecast.py

### Frontend Implementation for US2

- [ ] T070 [P] [US2] Create ForecastForm component in frontend/src/components/forecasts/ForecastForm.jsx using React Hook Form with Ant Design form components
- [ ] T071 [P] [US2] Implement form validation in ForecastForm: positive amount, required fields (department, project, amount, period dates), period alignment validation
- [ ] T072 [P] [US2] Implement department dropdown in ForecastForm fetching from DepartmentService
- [ ] T073 [P] [US2] Implement project dropdown in ForecastForm fetching from ProjectService (filtered by selected department)
- [ ] T074 [P] [US2] Implement period type selector in ForecastForm (MONTHLY, QUARTERLY, YEARLY)
- [ ] T075 [P] [US2] Implement date range picker in ForecastForm with validation against period type
- [ ] T076 [P] [US2] Implement amount input in ForecastForm with currency formatting
- [ ] T077 [US2] Create CreateForecast page in frontend/src/pages/CreateForecast.jsx with ForecastForm component
- [ ] T078 [US2] Add routing for CreateForecast page in frontend/src/App.jsx
- [ ] T079 [US2] Add "Register New Forecast" button to Dashboard page linking to CreateForecast
- [ ] T080 [US2] Implement success notification and redirect to Dashboard after forecast creation
- [ ] T081 [US2] Implement error handling and display validation errors in ForecastForm

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can view and create forecasts

---

## Phase 5: User Story 3 - Filter Forecasts by Department or Project (Priority: P3)

**Goal**: Enable project managers to filter forecasts by department or project to focus on relevant budget information

**Independent Test**: Create forecasts for multiple departments and projects, apply a filter for a specific department, verify only that department's forecasts are displayed, then apply project filter and verify results

### Backend Implementation for US3

- [ ] T082 [US3] Enhance ForecastService.get_all() in backend/src/services/forecast_service.py to support department_id and project_id filters
- [ ] T083 [US3] Update GET /v1/forecasts endpoint in backend/src/api/routes/forecasts.py to accept department_id and project_id query parameters
- [ ] T084 [US3] Add optimized Snowflake queries using clustering keys for fast filtering by department and project
- [ ] T085 [US3] Update aggregation endpoints to support filtering before aggregation

### Frontend Implementation for US3

- [ ] T086 [P] [US3] Create ForecastFilters component in frontend/src/components/forecasts/ForecastFilters.jsx with Ant Design Select components
- [ ] T087 [P] [US3] Implement department filter dropdown in ForecastFilters
- [ ] T088 [P] [US3] Implement project filter dropdown in ForecastFilters
- [ ] T089 [P] [US3] Implement "Clear Filters" button in ForecastFilters
- [ ] T090 [US3] Integrate ForecastFilters into Dashboard page in frontend/src/pages/Dashboard.jsx
- [ ] T091 [US3] Update useForecast hook to support filter parameters and refetch on filter change
- [ ] T092 [US3] Ensure filtered forecasts update aggregations (department and project totals)
- [ ] T093 [US3] Add URL query parameters for filters to enable bookmarking and sharing filtered views

**Checkpoint**: All three user stories (US1, US2, US3) should now be independently functional

---

## Phase 6: User Story 4 - Edit Existing Forecast (Priority: P3)

**Goal**: Enable department managers to update previously entered forecasts to maintain accurate budget projections (users can only edit forecasts they created)

**Independent Test**: Create a forecast, click "Edit" on that forecast, modify values, save, and verify the changes are reflected in the forecast list and the update timestamp + user are recorded

### Backend Implementation for US4

- [ ] T094 [US4] Implement ForecastService.update() in backend/src/services/forecast_service.py with permission check (user can only edit their own forecasts)
- [ ] T095 [US4] Implement PUT /v1/forecasts/{forecastId} endpoint in backend/src/api/routes/forecasts.py with authentication and ownership validation
- [ ] T096 [US4] Implement GET /v1/forecasts/{forecastId} endpoint in backend/src/api/routes/forecasts.py to fetch single forecast for editing
- [ ] T097 [US4] Add audit trail logging to ForecastService.update() to record changes in FORECAST_AUDIT table (timestamp, user, old/new values)
- [ ] T098 [US4] Implement UpdateForecastRequest validation schema in backend/src/models/forecast.py

### Frontend Implementation for US4

- [ ] T099 [P] [US4] Add "Edit" button to ForecastCard component for forecasts created by current user
- [ ] T100 [P] [US4] Create EditForecast page in frontend/src/pages/EditForecast.jsx reusing ForecastForm component
- [ ] T101 [P] [US4] Implement forecast loading in EditForecast page to pre-populate form with existing values
- [ ] T102 [P] [US4] Update ForecastForm to support edit mode (pre-filled values, update vs create)
- [ ] T103 [US4] Add routing for EditForecast page with forecast ID parameter in frontend/src/App.jsx
- [ ] T104 [US4] Implement update API call in forecastService.js: updateForecast(id, data)
- [ ] T105 [US4] Implement success notification and redirect to Dashboard after forecast update
- [ ] T106 [US4] Display edit restrictions (user can only edit their own forecasts) in UI
- [ ] T107 [US4] Show last updated timestamp and user on ForecastCard component

**Checkpoint**: All user stories should now be independently functional - full CRUD capability achieved

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

### Performance Optimization

- [ ] T108 [P] Verify Snowflake clustering keys are applied to FORECASTS table on (period_start_date, dept_id)
- [ ] T109 [P] Verify materialized views are refreshed and performing well
- [ ] T110 [P] Implement frontend bundle optimization: code splitting for routes
- [ ] T111 [P] Implement TanStack Query caching strategy: 5-minute stale time for forecasts
- [ ] T112 [P] Add loading states and skeletons to all data-fetching components

### Error Handling & UX

- [ ] T113 [P] Implement comprehensive error handling for network failures in frontend
- [ ] T114 [P] Add user-friendly error messages for all validation failures
- [ ] T115 [P] Implement retry logic for failed API calls
- [ ] T116 [P] Add confirmation dialogs for destructive actions (future delete functionality)
- [ ] T117 [P] Implement optimistic updates for create/edit operations

### Security Hardening

- [ ] T118 [P] Review and harden JWT token validation in backend
- [ ] T119 [P] Implement CSRF protection if needed
- [ ] T120 [P] Add rate limiting to API endpoints
- [ ] T121 [P] Setup secrets management for production (AWS Secrets Manager)
- [ ] T122 [P] Verify minimal privilege Snowflake role is configured per data-model.md

### Documentation & Developer Experience

- [ ] T123 [P] Update quickstart.md with actual setup steps based on implementation
- [ ] T124 [P] Add inline code documentation (docstrings for Python, JSDoc for JavaScript)
- [ ] T125 [P] Create API documentation using FastAPI's automatic docs (/docs, /redoc)
- [ ] T126 [P] Document environment variables in .env.example files
- [ ] T127 [P] Create troubleshooting guide for common setup issues

### Deployment Readiness

- [ ] T128 [P] Create production Dockerfile for backend
- [ ] T129 [P] Create production Dockerfile for frontend
- [ ] T130 [P] Update docker-compose.yml for production configuration
- [ ] T131 [P] Create CI/CD pipeline configuration (GitHub Actions or similar)
- [ ] T132 [P] Setup logging and monitoring configuration
- [ ] T133 [P] Run security audit on dependencies (poetry audit, npm audit)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P3)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (but integrates with US1 dashboard)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1 viewing capability but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Requires US2 form component for reuse but independently testable

### Within Each User Story

- Backend services before API endpoints
- API endpoints before frontend services
- Frontend services before UI components
- UI components before page integration
- Core implementation before edge cases and polish

### Parallel Opportunities

**Within Setup (Phase 1)**:
- All T001-T010 can run in parallel (different projects/directories)

**Within Foundational (Phase 2)**:
- Configuration tasks T011-T013 can run in parallel
- Middleware tasks T015-T016 can run in parallel
- Frontend context/hooks T017-T018 can run in parallel
- Repository and API client T019-T020 can run in parallel
- Utility tasks T021-T025 can run in parallel
- All Pydantic models T026-T029 can run in parallel
- All TypeScript types T030-T033 can run in parallel
- Seed data tasks T039-T040 can run in parallel
- API framework tasks T041-T045 can run in parallel

**Within User Story 1 (Phase 3)**:
- Backend services T046-T048 can run in parallel
- API endpoints T049-T051 can run in parallel (after services complete)
- Frontend service clients T056-T058 can run in parallel
- Frontend components T060-T063 can run in parallel (after hook T059)

**Within User Story 2 (Phase 4)**:
- Frontend form components T070-T077 can run in parallel

**Within User Story 3 (Phase 5)**:
- Frontend filter components T086-T089 can run in parallel

**Within User Story 4 (Phase 6)**:
- Frontend UI enhancements T099-T102 can run in parallel

**Within Polish (Phase 7)**:
- Most tasks T108-T133 can run in parallel as they affect different areas

**Across User Stories** (if team capacity allows):
- After Foundational phase completes, ALL user stories (US1, US2, US3, US4) can be worked on in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# After Foundational Phase completes, launch these US1 backend tasks together:
Task T046: "Implement ForecastService.get_all() in backend/src/services/forecast_service.py"
Task T047: "Implement DepartmentService.get_all() in backend/src/services/department_service.py"
Task T048: "Implement ProjectService.get_all() in backend/src/services/project_service.py"

# After backend services complete, launch these US1 API endpoints together:
Task T049: "Implement GET /v1/forecasts endpoint"
Task T050: "Implement GET /v1/departments endpoint"
Task T051: "Implement GET /v1/projects endpoint"

# After API endpoints complete, launch these US1 frontend services together:
Task T056: "Create ForecastService API client"
Task T057: "Create DepartmentService API client"
Task T058: "Create ProjectService API client"

# After hook T059 completes, launch these US1 components together:
Task T060: "Create ForecastList component"
Task T061: "Create ForecastCard component"
Task T062: "Create DepartmentAggregation component"
Task T063: "Create ProjectAggregation component"
```

---

## Parallel Example: Multiple User Stories

```bash
# After Foundational Phase completes, assign to different developers:

Developer A: Complete User Story 1 (T046-T065)
Developer B: Complete User Story 2 (T066-T081)
Developer C: Complete User Story 3 (T082-T093)
Developer D: Complete User Story 4 (T094-T107)

# Each developer works independently on their story
# Stories integrate naturally through shared foundation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T045) - CRITICAL checkpoint
3. Complete Phase 3: User Story 1 (T046-T065)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Create seed forecast data
   - Log in and view dashboard
   - Verify forecasts display correctly
   - Verify aggregations by department and project
   - Test with 1,000+ records for performance
5. Deploy/demo MVP if ready

### Incremental Delivery

1. Complete Setup (Phase 1) → Project structure ready
2. Complete Foundational (Phase 2) → Foundation ready for all stories
3. Add User Story 1 (Phase 3) → Test independently → Deploy/Demo **MVP!**
4. Add User Story 2 (Phase 4) → Test independently → Deploy/Demo (View + Create)
5. Add User Story 3 (Phase 5) → Test independently → Deploy/Demo (View + Create + Filter)
6. Add User Story 4 (Phase 6) → Test independently → Deploy/Demo (Full CRUD)
7. Polish (Phase 7) → Production-ready

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. **Week 1**: Team completes Setup + Foundational together
2. **Week 2-3**: Once Foundational is done:
   - Developer A: User Story 1 (P1) - MVP
   - Developer B: User Story 2 (P2) - Create
   - Developer C: User Story 3 (P3) - Filter
   - Developer D: User Story 4 (P3) - Edit
3. **Week 4**: Stories complete and integrate independently
4. **Week 5**: Team polishes together (Phase 7)

---

## Task Count Summary

- **Phase 1 (Setup)**: 10 tasks
- **Phase 2 (Foundational)**: 35 tasks (T011-T045)
- **Phase 3 (US1 - View)**: 20 tasks (T046-T065)
- **Phase 4 (US2 - Create)**: 16 tasks (T066-T081)
- **Phase 5 (US3 - Filter)**: 12 tasks (T082-T093)
- **Phase 6 (US4 - Edit)**: 14 tasks (T094-T107)
- **Phase 7 (Polish)**: 26 tasks (T108-T133)

**Total**: 133 tasks

**By User Story**:
- Setup & Foundational: 45 tasks (foundation for all stories)
- User Story 1: 20 tasks
- User Story 2: 16 tasks
- User Story 3: 12 tasks
- User Story 4: 14 tasks
- Polish: 26 tasks

**Parallel Opportunities**: 60+ tasks marked [P] can run in parallel within their phase

**Suggested MVP Scope**: Setup + Foundational + User Story 1 = 65 tasks

---

## Notes

- [P] tasks = different files/areas, no dependencies, can run concurrently
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Frontend uses Ant Design 5.x + TanStack Table for enterprise UI
- Backend uses FastAPI + Snowflake with connection pooling
- Authentication via AWS Cognito with JWT tokens
- All file paths are exact and match plan.md structure
