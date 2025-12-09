# Quickstart Guide: Spending Forecast Tracker

**Feature**: Spending Forecast Tracker
**Date**: 2025-11-17
**For**: Developers setting up the development environment

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.13+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** and **npm** - [Download](https://nodejs.org/)
- **Poetry 1.7+** - Python dependency management ([Install](https://python-poetry.org/docs/#installation))
- **Docker** - For local database and services ([Install](https://docs.docker.com/get-docker/))
- **Git** - Version control
- **AWS CLI** - For AWS Cognito configuration ([Install](https://aws.amazon.com/cli/))
- **Snowflake Account** - Access credentials for database

## Project Structure

```
spending-forecast-tracker/
├── backend/              # Python FastAPI backend
│   ├── src/
│   ├── tests/
│   ├── pyproject.toml
│   └── README.md
├── frontend/             # React frontend
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── README.md
├── shared/               # Shared types and schemas
├── docs/                 # Documentation
└── docker-compose.yml    # Local development services
```

---

## Quick Start (5 minutes)

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd spending-forecast-tracker

# Setup backend
cd backend
poetry install
poetry shell

# Setup frontend
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```bash
# Snowflake Configuration
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_user
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=forecast_warehouse
SNOWFLAKE_DATABASE=forecast_db
SNOWFLAKE_SCHEMA=public

# AWS Cognito Configuration
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=your_pool_id
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
LOG_LEVEL=INFO
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_BASE_URL=http://localhost:8000/v1
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
```

### 3. Initialize Database

```bash
# From backend directory
poetry run python scripts/init_db.py

# This will:
# - Create tables in Snowflake
# - Set up clustering keys
# - Create materialized views
# - Load sample data (optional)
```

### 4. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
poetry run uvicorn src.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc

---

## Development Workflow

### Backend Development

#### Running Tests

```bash
cd backend

# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=src --cov-report=html

# Run specific test file
poetry run pytest tests/test_forecasts.py

# Run with verbose output
poetry run pytest -v
```

#### Code Quality

```bash
# Format code
poetry run ruff format src tests

# Lint code
poetry run ruff check src tests

# Type checking
poetry run mypy src
```

#### API Development

1. Define Pydantic models in `src/models/`
2. Implement service logic in `src/services/`
3. Create API routes in `src/api/routes/`
4. Write tests in `tests/`
5. FastAPI auto-generates OpenAPI docs at `/docs`

**Example: Adding a new endpoint**

```python
# src/api/routes/forecasts.py
from fastapi import APIRouter, Depends
from src.models.forecast import ForecastCreate, ForecastResponse
from src.services.forecast_service import ForecastService

router = APIRouter(prefix="/forecasts", tags=["forecasts"])

@router.post("/", response_model=ForecastResponse, status_code=201)
async def create_forecast(
    forecast: ForecastCreate,
    service: ForecastService = Depends()
):
    return await service.create_forecast(forecast)
```

### Frontend Development

#### Running Development Server

```bash
cd frontend

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

#### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests with Playwright
npm run test:e2e

# Generate test coverage
npm run test:coverage
```

#### Component Development

```bash
# Generate new component (if using generator)
npm run generate:component ForecastCard

# Project structure for components:
# src/components/forecasts/ForecastCard.jsx
# src/components/forecasts/ForecastCard.test.jsx
```

---

## Common Tasks

### Adding a New Forecast

**cURL Example:**
```bash
curl -X POST http://localhost:8000/v1/forecasts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "dept_id": 1,
    "proj_id": 101,
    "amount": 50000.00,
    "period_type": "QUARTERLY",
    "period_start_date": "2025-01-01",
    "period_end_date": "2025-03-31",
    "description": "Q1 2025 forecast"
  }'
```

**Python Example:**
```python
import requests

response = requests.post(
    "http://localhost:8000/v1/forecasts",
    headers={
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    },
    json={
        "dept_id": 1,
        "proj_id": 101,
        "amount": 50000.00,
        "period_type": "QUARTERLY",
        "period_start_date": "2025-01-01",
        "period_end_date": "2025-03-31",
        "description": "Q1 2025 forecast"
    }
)
print(response.json())
```

### Querying Forecasts

```bash
# Get all forecasts
curl http://localhost:8000/v1/forecasts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by department
curl "http://localhost:8000/v1/forecasts?department_id=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by date range
curl "http://localhost:8000/v1/forecasts?start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get aggregations by department
curl http://localhost:8000/v1/forecasts/aggregations/by-department \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Database Operations

```bash
# Connect to Snowflake
snowsql -a YOUR_ACCOUNT -u YOUR_USER

# Check table stats
SELECT COUNT(*) FROM forecasts;
SELECT COUNT(*) FROM departments;
SELECT COUNT(*) FROM projects;

# Check clustering quality
SELECT SYSTEM$CLUSTERING_INFORMATION('forecasts', '(period_start_date, dept_id)');

# Refresh materialized view
ALTER MATERIALIZED VIEW forecast_monthly_by_dept REFRESH;
```

---

## Authentication Setup

### AWS Cognito Setup

1. **Create User Pool:**
```bash
aws cognito-idp create-user-pool \
  --pool-name forecast-tracker-users \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
  --auto-verified-attributes email
```

2. **Create User Pool Client:**
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id YOUR_USER_POOL_ID \
  --client-name forecast-tracker-client \
  --generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

3. **Create Test User:**
```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username testuser \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

4. **Get JWT Token (for testing):**
```bash
aws cognito-idp admin-initiate-auth \
  --user-pool-id YOUR_USER_POOL_ID \
  --client-id YOUR_CLIENT_ID \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=testuser,PASSWORD=TempPass123!
```

---

## Troubleshooting

### Backend Issues

**Issue: Snowflake connection fails**
```
Solution: Check environment variables and network connectivity
- Verify SNOWFLAKE_* env vars are correct
- Test connection: poetry run python scripts/test_connection.py
- Check firewall/VPN settings
```

**Issue: Import errors**
```
Solution: Ensure Poetry environment is activated
poetry shell
poetry install
```

**Issue: Tests fail with database errors**
```
Solution: Use test database or mocks
- Set TEST_DATABASE in .env.test
- Use pytest fixtures for mocking
```

### Frontend Issues

**Issue: API calls fail with CORS errors**
```
Solution: Ensure backend CORS is configured
- Check backend CORS middleware settings
- Verify VITE_API_BASE_URL in frontend .env
```

**Issue: Build fails with TypeScript errors**
```
Solution: Check type definitions
npm run type-check
# Fix type errors in components
```

**Issue: Cognito authentication fails**
```
Solution: Verify Cognito configuration
- Check VITE_COGNITO_* environment variables
- Verify user pool and client IDs
- Check AWS region matches
```

### Database Issues

**Issue: Slow query performance**
```
Solution: Check clustering and optimization
- Verify clustering keys are set
- Check query profile in Snowflake UI
- Review materialized views are refreshed
```

**Issue: Connection pool exhausted**
```
Solution: Adjust pool settings
- Increase max_size in connection pool config
- Check for connection leaks in code
- Monitor warehouse concurrency
```

---

## Performance Optimization

### Backend Optimization

1. **Connection Pooling:**
```python
# src/config/snowflake.py
pool = SnowflakeConnectionPool(
    min_size=2,
    max_size=10,
    lifetime=3600,  # 1 hour
    timeout=30
)
```

2. **Query Optimization:**
- Use materialized views for dashboard queries
- Filter on clustered columns (period_start_date, dept_id)
- Select only needed columns
- Enable result caching

3. **Async Operations:**
```python
# Use async/await for concurrent operations
async def get_dashboard_data():
    forecasts, departments = await asyncio.gather(
        get_forecasts(),
        get_departments()
    )
    return {"forecasts": forecasts, "departments": departments}
```

### Frontend Optimization

1. **Code Splitting:**
```javascript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateForecast = lazy(() => import('./pages/CreateForecast'));
```

2. **Virtual Scrolling:**
```javascript
// Use TanStack Table virtualization for large datasets
import { useVirtualizer } from '@tanstack/react-virtual';
```

3. **Query Caching:**
```javascript
// Use TanStack Query for API caching
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['forecasts', filters],
  queryFn: () => fetchForecasts(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Next Steps

1. **Read the full documentation:**
   - [Data Model](./data-model.md)
   - [API Specification](./contracts/api-spec.yaml)
   - [Research & Technology Decisions](./research.md)

2. **Explore the code:**
   - Backend: `backend/src/`
   - Frontend: `frontend/src/`
   - Tests: `*/tests/`

3. **Run the test suite:**
   ```bash
   # Backend
   cd backend && poetry run pytest

   # Frontend
   cd frontend && npm run test
   ```

4. **Start development:**
   - Check [Implementation Plan](./plan.md) for phased development approach
   - Review [Tasks](./tasks.md) for specific implementation tasks (after running `/speckit.tasks`)

---

## Support

- **Documentation**: See `/docs` directory
- **API Docs**: http://localhost:8000/docs (when running)
- **Issues**: Report bugs in issue tracker
- **Questions**: Contact the development team

---

**Last Updated**: 2025-11-17
**Version**: 1.0.0
