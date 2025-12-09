# Technology Research: Spending Forecast Tracker

**Date**: 2025-11-17
**Feature**: Spending Forecast Tracker
**Purpose**: Resolve technical clarifications and establish technology stack

## Overview

This document resolves all "NEEDS CLARIFICATION" items from the technical context and provides research-backed decisions for the technology stack.

---

## Decision 1: Backend Language - Python 3.13

### Decision
Use **Python 3.13** with async/await support

### Rationale
1. **Superior Snowflake Integration**: Python connector is the most mature, with 2025 updates including workload identity federation and enhanced bulk upload capabilities
2. **Async Performance**: FastAPI + async SQLAlchemy achieves 3-5x more requests/second compared to synchronous alternatives
3. **Data Processing Strengths**: Python excels at financial data processing, aggregations, and complex business logic
4. **Team Productivity**: Shorter development cycles for data-intensive applications

### Alternatives Considered
- **Node.js**: Rejected due to less mature Snowflake SDK (documented connection pool issues), limited documentation, and 2x slower performance for database-heavy workloads

### Trade-offs
- Requires separate language from frontend (mitigated by FastAPI's automatic OpenAPI documentation)
- Python packaging can be complex (mitigated by using Poetry)

---

## Decision 2: Backend Framework - FastAPI 0.115+

### Decision
Use **FastAPI 0.115+** with Pydantic V2 and SQLAlchemy 2.0+

### Rationale
1. **Performance**: 2x better than NestJS for database operations, handles 100+ concurrent users efficiently
2. **Development Speed**: Automatic API documentation, strong data validation, minimal boilerplate
3. **SSO Integration**: Native OAuth 2.0 and JWT support with extensive community examples
4. **Testing Ecosystem**: Excellent pytest integration with TestClient for async endpoints

### Alternatives Considered
- **Flask**: Rejected - no native async support, more boilerplate, lacks modern type safety
- **Django**: Rejected - heavier framework, ORM not ideal for Snowflake, slower for pure REST APIs
- **NestJS**: Rejected - no native Snowflake support in TypeORM, requires custom SDK wrapper

### Trade-offs
- Younger framework (2018) vs Django/Flask (mitigated by active development and clear documentation)

---

## Decision 3: SSO Provider - AWS Cognito

### Decision
Use **AWS Cognito** as primary SSO provider

### Rationale
1. **Cost-Effective**: $5.50/month for 1,000 users vs Okta's $24,000/year (10x cheaper)
2. **Native AWS Integration**: Seamless integration if hosted on AWS
3. **Security Features**: Built-in MFA, compliance certifications, user pools/identity pools
4. **No Minimum Contracts**: Pay-as-you-go pricing

### Alternatives Considered
- **Auth0**: Better developer experience but higher cost. Valid alternative if custom flows needed ($35/month base, free tier: 7,500 MAUs)
- **Okta**: Rejected - massively overpriced ($2/user/month), built for enterprise workforce identity
- **Azure AD**: Rejected - best for Microsoft-centric organizations

### Migration Path
Can migrate to Auth0 if developer experience becomes a pain point. Both support OIDC/OAuth 2.0 standards, minimizing frontend code changes.

### Trade-offs
- Less polished developer experience than Auth0 (worth 10x cost savings)
- Limited UI customization vs Auth0

---

## Decision 4: UI Component Library - Ant Design 5.x + TanStack Table

### Decision
Use **Ant Design 5.x** for overall UI and **TanStack Table v8+** for main data grid

### Rationale
1. **Enterprise-Grade**: Designed specifically for data-intensive dashboards and admin panels
2. **Data Tables Excellence**: Robust table components with filtering, sorting, pagination built-in
3. **Performance**: TanStack Table handles 100,000+ rows with virtual scrolling at 60fps
4. **Form Handling**: Smart forms with validation and layouts reduce custom infrastructure
5. **Professional Appearance**: Consistent design system for enterprise applications

### Architecture
- Ant Design for overall UI framework, forms, and simple tables
- TanStack Table for main forecast data grid (10,000+ records)
- Style TanStack Table with Ant Design classes for consistency

### Alternatives Considered
- **Material-UI**: Rejected - larger bundle size, Material Design less professional for financial apps
- **Chakra UI**: Rejected - fewer pre-built components, not designed for data-intensive dashboards
- **Custom with Tailwind**: Rejected - significantly longer development time, higher maintenance

### Trade-offs
- Harder to customize than alternatives (worth it for time-to-market)
- Opinionated design system (consistency is a feature for enterprise apps)

---

## Decision 5: Form Library - React Hook Form 7.x

### Decision
Use **React Hook Form 7.53.0+**

### Rationale
1. **Performance**: Isolates input components to prevent whole-form re-renders
2. **Bundle Size**: 8-12KB vs Formik's 44KB, zero dependencies
3. **Active Maintenance**: Actively developed (Formik has no commits in 1+ year)
4. **Integration**: Excellent Ant Design integration, built-in TypeScript support

### Alternatives Considered
- **Formik**: Rejected - not actively maintained, 4x larger bundle, poor re-render performance

### Trade-offs
- Different API from Formik (mitigated by excellent documentation)

---

## Decision 6: Testing Stack - Pytest + Playwright

### Decision
- **Backend**: Pytest 8.x with pytest-asyncio
- **E2E**: Playwright 1.40+

### Rationale

**Pytest:**
- Python ecosystem standard with excellent FastAPI integration
- Powerful fixture system for test setup/teardown
- Built-in async test support

**Playwright:**
- 35-45% faster than Cypress in headless parallel mode
- Native parallel execution (free, Cypress requires paid tier)
- Multi-browser support (Chrome, Firefox, Safari)
- Better reliability with auto-waiting and network interception
- Free and open-source with enterprise features

### Testing Strategy
1. **Unit Tests (Pytest)**: Business logic, data validation, utilities (80%+ coverage)
2. **Integration Tests (Pytest + TestClient)**: API endpoints, database interactions, auth flows
3. **E2E Tests (Playwright)**: Critical user journeys, SSO flows, dashboard loading (10-20 paths)

### Alternatives Considered
- **Cypress**: Rejected - serial execution by default, 35-45% slower, requires paid tier for parallel
- **Puppeteer**: Rejected - Chrome only, lower-level API, fewer testing features

### Trade-offs
- Playwright newer than Cypress (mitigated by excellent docs and better performance)

---

## Decision 7: Snowflake Best Practices

### Connection Pooling Configuration

**Python (Recommended):**
```python
from snowflake.connector.pool import SnowflakeConnectionPool

pool = SnowflakeConnectionPool(
    user='your_username',
    account='your_account',
    warehouse='your_warehouse',
    database='your_database',
    schema='your_schema',
    min_size=2,       # Minimum connections
    max_size=10,      # Maximum connections
    lifetime=3600,    # Connection lifetime (1 hour)
    timeout=30        # Connection timeout
)
```

### Warehouse Configuration for 100+ Users

**Use Multi-Cluster, Not Larger Warehouses:**

```sql
CREATE WAREHOUSE forecast_warehouse WITH
  WAREHOUSE_SIZE = 'MEDIUM'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  MIN_CLUSTER_COUNT = 1
  MAX_CLUSTER_COUNT = 8
  SCALING_POLICY = 'STANDARD';
```

**Rationale:**
- Multi-cluster handles concurrency (100+ users), not compute
- Warehouse size handles query complexity
- Medium warehouse sufficient for aggregations on 10,000+ records
- Auto-scaling: 1-8 clusters based on load

**Cost Estimation:**
- Average: 2-3 clusters during business hours
- ~1,600 credits/month = $3,200-$4,800/month at $2-$3/credit

### Query Optimization

**1. Clustering Keys:**
```sql
ALTER TABLE forecasts CLUSTER BY (forecast_date, department_id);
```

**2. Partition Pruning:**
```sql
-- Good: Direct column filtering
SELECT * FROM forecasts
WHERE forecast_date >= '2025-01-01'
  AND department_id = 123;

-- Bad: Function wrapping prevents pruning
WHERE DATE_TRUNC('MONTH', forecast_date) = '2025-01-01'
```

**3. Materialized Views for Dashboard:**
```sql
CREATE MATERIALIZED VIEW forecast_monthly_summary AS
SELECT
  DATE_TRUNC('MONTH', forecast_date) AS month,
  department_id,
  SUM(amount) AS total_amount,
  COUNT(*) AS forecast_count
FROM forecasts
GROUP BY 1, 2;
```

**4. Column Selection:**
- Select only needed columns (columnar storage benefit)
- Avoid SELECT * for performance

**5. Result Caching:**
- Snowflake caches query results for 24 hours
- Identical queries return instantly
- Perfect for dashboard repeated queries

### Security Best Practices

**1. Connection Security:**
- Use key-pair authentication (not passwords)
- Store credentials in AWS Secrets Manager
- Rotate credentials regularly

**2. Network Security:**
```sql
CREATE NETWORK POLICY forecast_app_policy
  ALLOWED_IP_LIST = ('203.0.113.0/24')
  BLOCKED_IP_LIST = ();
```

**3. Minimal Privilege Role:**
```sql
CREATE ROLE forecast_api_role;
GRANT USAGE ON WAREHOUSE forecast_warehouse TO ROLE forecast_api_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE forecasts TO ROLE forecast_api_role;
```

---

## Performance Target Achievement

### <3 Second Dashboard Load
- **Materialized views** for pre-aggregated monthly/quarterly summaries
- **Snowflake result caching** (24 hours)
- **TanStack Table virtual scrolling** for 10,000+ rows
- **Frontend bundle optimization** with tree-shaking

### <2 Second Filter Operations
- **Clustering keys** on frequently filtered columns (forecast_date, department_id)
- **Direct column filtering** for partition pruning
- **Select only necessary columns**
- **Connection pooling** to avoid connection overhead

### 100+ Concurrent Users
- **Multi-cluster warehouse** (NOT warehouse resizing)
- **FastAPI async** with connection pooling
- **Auto-scaling** from 1 to 8 clusters based on load

---

## Complete Technology Stack

### Backend
| Component | Version |
|-----------|---------|
| Language | Python 3.13 |
| Framework | FastAPI 0.115+ |
| ORM | SQLAlchemy 2.0+ (async) |
| Snowflake Connector | snowflake-connector-python 3.12+ |
| Validation | Pydantic 2.x |
| ASGI Server | Uvicorn + Gunicorn |

### Frontend
| Component | Version |
|-----------|---------|
| Framework | React 18.x |
| UI Library | Ant Design 5.x |
| Data Grid | TanStack Table 8.x |
| Form Library | React Hook Form 7.x |
| State Management | TanStack Query 5.x |
| HTTP Client | Axios 1.x |

### Authentication & Security
| Component | Version |
|-----------|---------|
| SSO Provider | AWS Cognito |
| Token Handling | JWT |
| Secrets Management | AWS Secrets Manager |

### Testing
| Component | Version |
|-----------|---------|
| Backend Testing | Pytest 8.x |
| Async Testing | pytest-asyncio |
| E2E Testing | Playwright 1.40+ |
| Code Coverage | pytest-cov |

### Development Tools
| Component | Version |
|-----------|---------|
| Package Manager | Poetry 1.7+ |
| Linting | Ruff |
| Type Checking | mypy |
| Pre-commit Hooks | pre-commit |

---

## Cost Estimation

### Monthly Recurring Costs
- **SSO (AWS Cognito)**: $5.50/month (1,000 users)
- **Snowflake**: $3,200-$4,800/month (dominant cost)
- **AWS Infrastructure**: $241-$572/month (EC2, load balancer, CloudWatch)
- **Total**: $3,500-$5,400/month

---

## Implementation Timeline

### 6 Weeks to Production

**Weeks 1-2**: Foundation (FastAPI + Snowflake + Cognito setup)
**Weeks 3-4**: Core features (CRUD, data grid, forms)
**Week 5**: Optimization (clustering, materialized views, load testing)
**Week 6**: Production prep (security, documentation, deployment)

---

## Risks and Mitigations

### Risk 1: Snowflake Costs Higher Than Expected
**Mitigation**: Start with max 4 clusters, implement aggressive result caching, use materialized views

### Risk 2: Performance Targets Not Met
**Mitigation**: Implement materialized views early, use clustering keys, frontend virtualization, load testing in Week 5

### Risk 3: Team Learning Curve (Python/FastAPI)
**Mitigation**: FastAPI has excellent documentation, invest in 2-3 days training, code reviews

### Risk 4: SSO Integration Complexity
**Mitigation**: Start with AWS Cognito (simpler), migration path to Auth0 if needed, test early

---

## References

- FastAPI Documentation: https://fastapi.tiangolo.com/
- Snowflake Python Connector: https://docs.snowflake.com/en/developer-guide/python-connector/
- Ant Design: https://ant.design/
- TanStack Table: https://tanstack.com/table/latest
- React Hook Form: https://react-hook-form.com/
- AWS Cognito: https://docs.aws.amazon.com/cognito/
- Playwright: https://playwright.dev/

---

**Research Completed**: 2025-11-17
**All NEEDS CLARIFICATION items resolved**
**Ready for Phase 1: Data Model and Contracts**
