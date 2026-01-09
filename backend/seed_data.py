"""
Seed the database with initial department and project data
"""
from sqlalchemy.orm import Session
from src.config.database import engine, SessionLocal
from src.models.database import Base, Department, Project


def seed_database():
    """Seed database with departments and projects"""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        # Check if data already exists
        existing_departments = db.query(Department).count()
        if existing_departments > 0:
            print(f"Database already has {existing_departments} departments. Skipping seed.")
            return

        # Create departments
        departments = [
            Department(id=1, name="Teknologi", code="TECH"),
            Department(id=2, name="Markedsføring", code="MKT"),
            Department(id=3, name="Salg", code="SALES"),
            Department(id=4, name="Drift", code="OPS"),
            Department(id=5, name="Økonomi", code="FIN"),
        ]

        for dept in departments:
            db.add(dept)

        db.commit()
        print(f"Created {len(departments)} departments")

        # Create projects
        projects = [
            # Teknologi projects
            Project(id=1, name="Plattform Oppgradering", code="TECH-001", department_id=1),
            Project(id=2, name="Mobilapp Utvikling", code="TECH-002", department_id=1),
            Project(id=3, name="Infrastruktur Migrering", code="TECH-003", department_id=1),

            # Markedsføring projects
            Project(id=4, name="Merkevare Kampanje Q1", code="MKT-001", department_id=2),
            Project(id=5, name="Digital Markedsføring", code="MKT-002", department_id=2),

            # Salg projects
            Project(id=6, name="Salgs Enablement", code="SALES-001", department_id=3),
            Project(id=7, name="CRM Implementering", code="SALES-002", department_id=3),

            # Drift projects
            Project(id=8, name="Prosess Optimalisering", code="OPS-001", department_id=4),
            Project(id=9, name="Forsyningskjede", code="OPS-002", department_id=4),

            # Økonomi projects
            Project(id=10, name="Finansiell Rapportering", code="FIN-001", department_id=5),
            Project(id=11, name="Budsjett Planlegging", code="FIN-002", department_id=5),
        ]

        for proj in projects:
            db.add(proj)

        db.commit()
        print(f"Created {len(projects)} projects")

        print("Database seeded successfully!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
