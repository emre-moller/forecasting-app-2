# Spending Forecast Tracker

A full-stack application for tracking spending forecasts with Norwegian localization.

## Architecture

- **Frontend**: React + TypeScript + Vite + Ant Design
- **Backend**: FastAPI (Python)
- **Database**: SQLite (easily migrates to Snowflake later)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   python3 -m pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings --user
   ```

3. Initialize the database (if not already done):
   ```bash
   cd src
   python3 init_db.py
   cd ..
   ```

4. Start the backend server:
   ```bash
   # On Linux/Mac:
   ./start.sh

   # On Windows:
   start.bat
   ```

   The API will be available at `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/health`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Features

- ✅ Norwegian language interface
- ✅ NOK currency formatting
- ✅ Full CRUD operations for forecasts
- ✅ Department and project management
- ✅ Real-time data persistence
- ✅ Filtering by department and project
- ✅ Responsive table with sorting

## API Endpoints

- `GET /api/forecasts` - Get all forecasts
- `POST /api/forecasts` - Create a new forecast
- `PUT /api/forecasts/{id}` - Update a forecast
- `DELETE /api/forecasts/{id}` - Delete a forecast
- `GET /api/departments` - Get all departments
- `GET /api/projects` - Get all projects

## Future Migration to Snowflake

To migrate from SQLite to Snowflake:

1. Update `backend/src/config/database.py`:
   ```python
   DATABASE_URL = "snowflake://user:pass@account/database/schema"
   ```

2. Install Snowflake connector:
   ```bash
   pip install snowflake-sqlalchemy
   ```

3. Update the engine configuration for Snowflake-specific settings

That's it! The rest of the code remains the same.

## Development

- Backend uses SQLAlchemy ORM for database abstraction
- Frontend uses React hooks for state management
- API client in `frontend/src/services/api.ts` handles all backend communication
