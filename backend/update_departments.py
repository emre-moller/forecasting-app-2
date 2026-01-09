"""
Update existing department and project names to Norwegian
"""
from sqlalchemy.orm import Session
from src.config.database import SessionLocal
from src.models.database import Department, Project


def update_data():
    """Update existing department and project names"""
    db: Session = SessionLocal()

    try:
        # Update departments
        dept_updates = {
            "Engineering": "Teknologi",
            "Marketing": "Markedsføring",
            "Sales": "Salg",
            "Operations": "Drift",
            "Finance": "Økonomi",
        }

        for old_name, new_name in dept_updates.items():
            dept = db.query(Department).filter(Department.name == old_name).first()
            if dept:
                dept.name = new_name
                print(f"Updated department: {old_name} -> {new_name}")

        db.commit()
        print("\nDepartments updated successfully!")

    except Exception as e:
        print(f"Error updating data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    update_data()
