# Testing Guide: Spending Forecast Application

Comprehensive E2E and API testing documentation for the Spending Forecast Tracker application.

## Table of Contents

1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Prerequisites](#prerequisites)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Writing New Tests](#writing-new-tests)
7. [Continuous Integration](#continuous-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This application has two comprehensive test suites:

1. **E2E Tests (Playwright)** - Tests the full stack from frontend to backend
2. **API Integration Tests (pytest)** - Tests backend API endpoints in isolation

### Testing Philosophy

- **Full Stack Coverage**: E2E tests verify the complete user journey
- **API Contract Testing**: Integration tests ensure API reliability
- **Test Isolation**: Each test runs independently with clean data
- **Real Database**: Tests use in-memory SQLite for speed and isolation

---

## Test Architecture

```
forecasting-app-2/
├── frontend/
│   ├── tests/
│   │   └── e2e/
│   │       ├── forecast-crud.spec.ts           # CRUD operations
│   │       ├── filtering-aggregation.spec.ts   # Filtering & totals
│   │       ├── snapshot-approval.spec.ts       # Approval workflow
│   │       ├── form-validation.spec.ts         # Form validation
│   │       └── utils/
│   │           └── test-helpers.ts             # Shared utilities
│   └── playwright.config.ts                    # Playwright config
└── backend/
    └── tests/
        ├── conftest.py                          # pytest fixtures
        ├── test_forecasts_api.py               # Forecasts endpoints
        ├── test_snapshots_api.py               # Snapshots endpoints
        └── test_departments_projects_api.py    # Dept/Project endpoints
```

---

## Prerequisites

### Frontend E2E Tests

```bash
cd frontend
npm install
npx playwright install chromium
```

### Backend API Tests

```bash
cd backend
poetry install
```

Or if using pip:

```bash
cd backend
pip install -r requirements.txt
```

---

## Running Tests

### E2E Tests (Playwright)

#### Run all E2E tests (headless)
```bash
cd frontend
npm test
```

#### Run tests with UI mode (interactive)
```bash
cd frontend
npm run test:ui
```

#### Run tests in headed mode (see browser)
```bash
cd frontend
npm run test:headed
```

#### Debug a specific test
```bash
cd frontend
npm run test:debug
```

#### Run specific test file
```bash
cd frontend
npx playwright test tests/e2e/forecast-crud.spec.ts
```

#### Run tests matching a pattern
```bash
cd frontend
npx playwright test --grep "should create"
```

#### View HTML test report
```bash
cd frontend
npm run test:report
```

### Backend API Tests (pytest)

#### Run all API tests
```bash
cd backend
poetry run pytest
```

#### Run with coverage report
```bash
cd backend
poetry run pytest --cov=src --cov-report=html
```

#### Run specific test file
```bash
cd backend
poetry run pytest tests/test_forecasts_api.py
```

#### Run specific test
```bash
cd backend
poetry run pytest tests/test_forecasts_api.py::TestForecastsAPI::test_create_forecast
```

#### Run with verbose output
```bash
cd backend
poetry run pytest -v
```

#### Run with print statements visible
```bash
cd backend
poetry run pytest -s
```

---

## Test Coverage

### E2E Test Coverage

#### 1. Forecast CRUD Operations (`forecast-crud.spec.ts`)

- ✅ Display dashboard with statistics
- ✅ Create new forecast with monthly values
- ✅ Edit existing forecast
- ✅ Delete forecast with confirmation
- ✅ Display all 12 monthly columns
- ✅ Calculate totals and yearly sums
- ✅ Show empty state
- ✅ Persist data after page reload

#### 2. Filtering and Aggregation (`filtering-aggregation.spec.ts`)

- ✅ Filter forecasts by department
- ✅ Filter forecasts by project
- ✅ Reset filters
- ✅ Update project dropdown based on department
- ✅ Display correct department/project counts
- ✅ Calculate total forecast amount
- ✅ Update totals when filtering
- ✅ Maintain filter state during operations
- ✅ Handle empty filter results

#### 3. Snapshot and Approval Workflow (`snapshot-approval.spec.ts`)

- ✅ Submit forecast for approval (create snapshot)
- ✅ Display snapshot with correct data
- ✅ Approve a snapshot
- ✅ Delete a snapshot
- ✅ Create multiple snapshots from same forecast
- ✅ Preserve snapshot data when forecast is edited
- ✅ Show snapshot timestamps and user info
- ✅ Complete approval workflow
- ✅ Preserve monthly values in snapshots
- ✅ Handle rapid submit/approve actions

#### 4. Form Validation (`form-validation.spec.ts`)

- ✅ Open/close forecast form modal
- ✅ Validate required fields
- ✅ Accept numeric input for monthly values
- ✅ Handle decimal/negative/zero values
- ✅ Reject non-numeric input
- ✅ Update project dropdown on department selection
- ✅ Handle special characters and long text
- ✅ Preserve form data between fields
- ✅ Show loading states during API calls
- ✅ Handle API errors gracefully

### Backend API Test Coverage

#### 1. Forecasts API (`test_forecasts_api.py`)

- ✅ Create forecast
- ✅ Get all forecasts
- ✅ Get forecast by ID
- ✅ Update forecast
- ✅ Delete forecast
- ✅ Handle non-existent forecasts
- ✅ Validate required fields
- ✅ Validate foreign keys
- ✅ Persist all 12 monthly values
- ✅ Calculate totals correctly
- ✅ Create multiple forecasts
- ✅ Set timestamps correctly
- ✅ Filter by department

#### 2. Snapshots API (`test_snapshots_api.py`)

- ✅ Create snapshot from forecast
- ✅ Get all snapshots
- ✅ Get snapshot by ID
- ✅ Approve snapshot
- ✅ Delete snapshot
- ✅ Preserve forecast data in snapshot
- ✅ Ensure snapshot immutability
- ✅ Create multiple snapshots from same forecast
- ✅ Complete approval workflow
- ✅ Handle timestamps correctly
- ✅ Delete approved snapshots

#### 3. Departments/Projects API (`test_departments_projects_api.py`)

- ✅ Get all departments
- ✅ Get department by ID
- ✅ Get all projects
- ✅ Get project by ID
- ✅ Verify department-project relationships
- ✅ Filter projects by department

---

## Writing New Tests

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';
import { waitForDashboardLoad, cleanupTestForecasts } from './utils/test-helpers';

test.describe('My Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestForecasts();
    await page.goto('/');
    await waitForDashboardLoad(page);
  });

  test.afterEach(async () => {
    await cleanupTestForecasts();
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.locator('button:has-text("Ny Prognose")').click();

    // Act
    await page.locator('input[placeholder="Prosjektnavn"]').fill('Test');

    // Assert
    await expect(page.locator('input[placeholder="Prosjektnavn"]')).toHaveValue('Test');
  });
});
```

### API Test Template

```python
def test_my_api_feature(client, sample_forecast):
    """Test description"""
    # Arrange
    payload = {"field": "value"}

    # Act
    response = client.post("/api/endpoint", json=payload)

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["field"] == "value"
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Install Playwright
        run: cd frontend && npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: cd frontend && npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/

  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install Poetry
        run: curl -sSL https://install.python-poetry.org | python3 -
      - name: Install dependencies
        run: cd backend && poetry install
      - name: Run API tests
        run: cd backend && poetry run pytest
```

---

## Troubleshooting

### E2E Tests

#### Issue: Tests timeout or fail to start servers

**Solution**: Increase timeout in `playwright.config.ts`:

```typescript
webServer: [
  {
    timeout: 180 * 1000, // 3 minutes
    // ...
  }
]
```

#### Issue: Tests fail because data already exists

**Solution**: Ensure cleanup functions are called in `beforeEach` and `afterEach`:

```typescript
test.beforeEach(async () => {
  await cleanupTestSnapshots();
  await cleanupTestForecasts();
});
```

#### Issue: Can't see what's happening in tests

**Solution**: Run in headed mode:

```bash
npm run test:headed
```

Or use debug mode:

```bash
npm run test:debug
```

### Backend Tests

#### Issue: Tests fail with database errors

**Solution**: Ensure test database is properly set up in `conftest.py`. Check that fixtures are creating/dropping tables correctly.

#### Issue: Tests pass individually but fail when run together

**Solution**: Add `scope="function"` to fixtures to ensure isolation:

```python
@pytest.fixture(scope="function")
def test_db():
    # ...
```

#### Issue: Want to see SQL queries during tests

**Solution**: Enable SQLAlchemy logging:

```python
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

---

## Best Practices

### E2E Tests

1. **Always clean up test data** in `beforeEach` and `afterEach`
2. **Use descriptive test names** that explain what is being tested
3. **Wait for elements** using Playwright's auto-waiting (don't use arbitrary timeouts)
4. **Use test helpers** from `utils/test-helpers.ts` for common operations
5. **Test user flows**, not implementation details
6. **Keep tests isolated** - each test should run independently

### API Tests

1. **Use fixtures** for common setup (departments, projects, forecasts)
2. **Test edge cases** (non-existent IDs, invalid data, etc.)
3. **Verify status codes** AND response data
4. **Test the API contract**, not implementation
5. **Clean database** between tests using `scope="function"`
6. **Use descriptive docstrings** for each test

---

## Test Metrics

### Current Coverage

- **E2E Tests**: ~40 test cases across 4 test files
- **API Tests**: ~45 test cases across 3 test files
- **Total**: ~85 comprehensive tests

### Test Execution Time (Approximate)

- E2E Tests: ~3-5 minutes (headless)
- API Tests: ~5-10 seconds
- Total: ~3-5 minutes

---

## Next Steps

### Recommended Additional Tests

1. **Performance Tests**
   - Load testing with large datasets
   - Concurrent user operations
   - Database query optimization

2. **Security Tests**
   - SQL injection attempts
   - XSS prevention
   - CSRF protection (when auth is added)

3. **Accessibility Tests**
   - ARIA labels
   - Keyboard navigation
   - Screen reader compatibility

4. **Integration Tests**
   - Database migration testing
   - Snowflake integration (when implemented)
   - Authentication flow (when implemented)

5. **Visual Regression Tests**
   - Playwright visual comparisons
   - Component screenshot testing

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Ant Design Testing](https://ant.design/docs/react/testing)

---

## Support

For questions or issues with the test suite:

1. Check this documentation
2. Review existing test files for examples
3. Check Playwright/pytest documentation
4. Open an issue in the project repository

---

**Last Updated**: 2026-01-08

**Test Suite Version**: 1.0.0
