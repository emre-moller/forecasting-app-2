from datetime import date

from src.config.database import SessionLocal, engine
from src.models.database import Base, Department, ForecastMonth, Project

# Drop and recreate tables (start fresh per user requirement)
Base.metadata.drop_all(bind=engine)
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

        # Add forecasts with normalized monthly data structure
        # Each forecast becomes 12 monthly records (8 forecasts * 12 months = 96 records)

        forecast_configs = [
            {
                'department_id': 1,
                'project_id': 1,
                'project_name': 'Cloud Migration Phase 1',
                'profit_center': 'PC-TEK-001',
                'wbs': 'WBS-CM-2026',
                'account': '6100-IT-INFRA',
                'monthly_amounts': [350000, 380000, 420000, 450000, 390000, 410000,
                                   400000, 370000, 390000, 420000, 440000, 480000],
                'created_by': 'Ola Nordmann',
                'created_at': date(2025, 1, 15)
            },
            {
                'department_id': 1,
                'project_id': 2,
                'project_name': 'Mobile App Development',
                'profit_center': 'PC-TEK-002',
                'wbs': 'WBS-MAD-2026',
                'account': '6100-IT-DEV',
                'monthly_amounts': [220000, 240000, 260000, 250000, 230000, 240000,
                                   250000, 260000, 270000, 280000, 270000, 290000],
                'created_by': 'Ola Nordmann',
                'created_at': date(2025, 1, 16)
            },
            {
                'department_id': 2,
                'project_id': 3,
                'project_name': 'Digital Campaign Q1-Q2',
                'profit_center': 'PC-MAR-001',
                'wbs': 'WBS-DC-2026',
                'account': '6200-MKT-DIGITAL',
                'monthly_amounts': [95000, 105000, 120000, 130000, 125000, 135000,
                                   90000, 95000, 100000, 110000, 115000, 130000],
                'created_by': 'Kari Hansen',
                'created_at': date(2025, 1, 18)
            },
            {
                'department_id': 2,
                'project_id': 4,
                'project_name': 'Brand Refresh Initiative',
                'profit_center': 'PC-MAR-002',
                'wbs': 'WBS-BR-2026',
                'account': '6200-MKT-BRAND',
                'monthly_amounts': [60000, 65000, 70000, 75000, 80000, 85000,
                                   75000, 70000, 65000, 70000, 75000, 80000],
                'created_by': 'Kari Hansen',
                'created_at': date(2025, 1, 20)
            },
            {
                'department_id': 3,
                'project_id': 5,
                'project_name': 'Enterprise Sales Expansion',
                'profit_center': 'PC-SAL-001',
                'wbs': 'WBS-ESE-2026',
                'account': '6300-SALES-TEAM',
                'monthly_amounts': [250000, 270000, 280000, 290000, 280000, 290000,
                                   300000, 310000, 320000, 330000, 340000, 350000],
                'created_by': 'Per Olsen',
                'created_at': date(2025, 1, 22)
            },
            {
                'department_id': 3,
                'project_id': 6,
                'project_name': 'CRM System Implementation',
                'profit_center': 'PC-SAL-002',
                'wbs': 'WBS-CRM-2026',
                'account': '6300-SALES-TECH',
                'monthly_amounts': [140000, 150000, 160000, 170000, 165000, 175000,
                                   160000, 155000, 150000, 145000, 140000, 135000],
                'created_by': 'Per Olsen',
                'created_at': date(2025, 1, 25)
            },
            {
                'department_id': 4,
                'project_id': 7,
                'project_name': 'Process Automation Suite',
                'profit_center': 'PC-DRI-001',
                'wbs': 'WBS-PA-2026',
                'account': '6400-OPS-AUTO',
                'monthly_amounts': [75000, 80000, 85000, 90000, 88000, 92000,
                                   95000, 93000, 90000, 88000, 85000, 82000],
                'created_by': 'Ingrid Berg',
                'created_at': date(2025, 2, 1)
            },
            {
                'department_id': 4,
                'project_id': 8,
                'project_name': 'Supply Chain Optimization',
                'profit_center': 'PC-DRI-002',
                'wbs': 'WBS-SCO-2026',
                'account': '6400-OPS-SUPPLY',
                'monthly_amounts': [165000, 175000, 185000, 190000, 195000, 200000,
                                   195000, 190000, 185000, 180000, 175000, 170000],
                'created_by': 'Ingrid Berg',
                'created_at': date(2025, 2, 3)
            },
        ]

        # Create 12 monthly records for each forecast configuration
        for config in forecast_configs:
            for month in range(1, 13):  # months 1-12
                forecast_month = ForecastMonth(
                    department_id=config['department_id'],
                    project_id=config['project_id'],
                    year=2026,
                    month=month,
                    amount=config['monthly_amounts'][month - 1],
                    project_name=config['project_name'],
                    profit_center=config['profit_center'],
                    wbs=config['wbs'],
                    account=config['account'],
                    created_by=config['created_by'],
                    created_at=config['created_at'],
                    updated_at=config['created_at']
                )
                db.add(forecast_month)

        db.commit()

        print("Database initialized successfully!")
        print(f"Created {len(forecast_configs)} forecasts with 12 monthly records each (96 total monthly records)")

    finally:
        db.close()


if __name__ == "__main__":
    init_database()
