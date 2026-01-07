from datetime import date

from config.database import SessionLocal, engine
from models.database import Base, Department, Forecast, Project

# Create tables
Base.metadata.create_all(bind=engine)


def init_database():
    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(Department).count() > 0:
            print("Database already initialized")
            return

        # Add departments
        departments = [
            Department(id=1, name="Teknologi", code="TEK"),
            Department(id=2, name="Markedsføring", code="MAR"),
            Department(id=3, name="Salg", code="SAL"),
            Department(id=4, name="Drift", code="DRI"),
            Department(id=5, name="Økonomi", code="ØKO"),
        ]
        db.add_all(departments)
        db.commit()

        # Add projects
        projects = [
            Project(id=1, name="Skymigrering", code="P001", department_id=1),
            Project(id=2, name="Mobilapputvikling", code="P002", department_id=1),
            Project(id=3, name="Digital Kampanje K1", code="P003", department_id=2),
            Project(id=4, name="Merkevarefornyelse", code="P004", department_id=2),
            Project(id=5, name="Bedriftssalgsinitiativ", code="P005", department_id=3),
            Project(id=6, name="CRM-implementering", code="P006", department_id=3),
            Project(id=7, name="Prosessautomatisering", code="P007", department_id=4),
            Project(id=8, name="Optimalisering av Forsyningskjede", code="P008", department_id=4),
            Project(id=9, name="Oppgradering av Økonomisystem", code="P009", department_id=5),
            Project(id=10, name="Revisjonsetterlevelse", code="P010", department_id=5),
        ]
        db.add_all(projects)
        db.commit()

        # Add forecasts
        forecasts = [
            Forecast(
                id=1,
                department_id=1,
                project_id=1,
                amount=4500000,
                time_period="2025 K1",
                period_type="quarterly",
                description="Infrastrukturkostnader for skymigrering",
                created_by="Ola Nordmann",
                created_at=date(2025, 1, 15),
                updated_at=date(2025, 1, 15),
            ),
            Forecast(
                id=2,
                department_id=1,
                project_id=2,
                amount=2800000,
                time_period="2025 K1",
                period_type="quarterly",
                description="Utviklingsteam og ressurser",
                created_by="Ola Nordmann",
                created_at=date(2025, 1, 16),
                updated_at=date(2025, 1, 16),
            ),
            Forecast(
                id=3,
                department_id=2,
                project_id=3,
                amount=1250000,
                time_period="2025 K1",
                period_type="quarterly",
                description="Digital annonsering og innholdsproduksjon",
                created_by="Kari Hansen",
                created_at=date(2025, 1, 18),
                updated_at=date(2025, 1, 18),
            ),
            Forecast(
                id=4,
                department_id=2,
                project_id=4,
                amount=850000,
                time_period="2025 K2",
                period_type="quarterly",
                description="Merkevarebyra og materialer",
                created_by="Kari Hansen",
                created_at=date(2025, 1, 20),
                updated_at=date(2025, 1, 20),
            ),
            Forecast(
                id=5,
                department_id=3,
                project_id=5,
                amount=3200000,
                time_period="2025 K1",
                period_type="quarterly",
                description="Utvidelse og opplæring av salgsteam",
                created_by="Per Olsen",
                created_at=date(2025, 1, 22),
                updated_at=date(2025, 1, 22),
            ),
            Forecast(
                id=6,
                department_id=3,
                project_id=6,
                amount=1800000,
                time_period="2025 K2",
                period_type="quarterly",
                description="CRM-programvarelisenser og implementering",
                created_by="Per Olsen",
                created_at=date(2025, 1, 25),
                updated_at=date(2025, 1, 25),
            ),
            Forecast(
                id=7,
                department_id=4,
                project_id=7,
                amount=950000,
                time_period="2025 K1",
                period_type="quarterly",
                description="Automatiseringsverktøy og konsulentbistand",
                created_by="Ingrid Berg",
                created_at=date(2025, 2, 1),
                updated_at=date(2025, 2, 1),
            ),
            Forecast(
                id=8,
                department_id=4,
                project_id=8,
                amount=2100000,
                time_period="2025 K2",
                period_type="quarterly",
                description="Forsyningskjedeprogramvare og optimalisering",
                created_by="Ingrid Berg",
                created_at=date(2025, 2, 3),
                updated_at=date(2025, 2, 3),
            ),
            Forecast(
                id=9,
                department_id=5,
                project_id=9,
                amount=3800000,
                time_period="2025 K1",
                period_type="quarterly",
                description="ERP-systemoppgradering og migrering",
                created_by="Lars Johansen",
                created_at=date(2025, 2, 5),
                updated_at=date(2025, 2, 5),
            ),
            Forecast(
                id=10,
                department_id=5,
                project_id=10,
                amount=750000,
                time_period="2025 K2",
                period_type="quarterly",
                description="Ekstern revisjon og etterlevelseskonsultering",
                created_by="Lars Johansen",
                created_at=date(2025, 2, 8),
                updated_at=date(2025, 2, 8),
            ),
            Forecast(
                id=11,
                department_id=1,
                project_id=1,
                amount=4200000,
                time_period="2025 K2",
                period_type="quarterly",
                description="Fortsatt skymigrering fase 2",
                created_by="Ola Nordmann",
                created_at=date(2025, 2, 10),
                updated_at=date(2025, 2, 10),
            ),
            Forecast(
                id=12,
                department_id=2,
                project_id=3,
                amount=1400000,
                time_period="2025 K2",
                period_type="quarterly",
                description="K2 digital kampanje fortsettelse",
                created_by="Kari Hansen",
                created_at=date(2025, 2, 12),
                updated_at=date(2025, 2, 12),
            ),
        ]
        db.add_all(forecasts)
        db.commit()

        print("Database initialized successfully with Norwegian data!")

    finally:
        db.close()


if __name__ == "__main__":
    init_database()
