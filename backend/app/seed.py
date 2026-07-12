from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance import MaintenanceLog
from app.models.fuel_log import FuelLog
from app.models.expense import Expense
from app.models.role import Role
from app.models.document import VehicleDocument
from app.core.security import get_password_hash
from datetime import date, timedelta

def seed_db():
    print("Dropping existing database tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("Database already has users. Seeding skipped.")
            return

        print("Seeding roles...")
        roles_map = {}
        for role_name in ["fleet_manager", "driver", "safety_officer", "financial_analyst"]:
            db_role = Role(name=role_name)
            db.add(db_role)
            db.flush()
            roles_map[role_name] = db_role.id

        print("Seeding initial users...")
        
        users_to_seed = [
            {
                "email": "fleet@transitops.dev",
                "name": "Priya Shah",
                "role": "fleet_manager",
                "password": "demo1234"
            },
            {
                "email": "driver@transitops.dev",
                "name": "John Doe",
                "role": "driver",
                "password": "demo1234"
            },
            {
                "email": "safety@transitops.dev",
                "name": "Sarah Connor",
                "role": "safety_officer",
                "password": "demo1234"
            },
            {
                "email": "analyst@transitops.dev",
                "name": "Alan Turing",
                "role": "financial_analyst",
                "password": "demo1234"
            }
        ]

        for user_data in users_to_seed:
            hashed_pwd = get_password_hash(user_data["password"])
            db_user = User(
                email=user_data["email"],
                name=user_data["name"],
                role=user_data["role"],
                role_id=roles_map[user_data["role"]],
                hashed_password=hashed_pwd
            )
            db.add(db_user)
            
        # Seed a default Driver profile for driver@transitops.dev
        driver_profile = Driver(
            name="John Doe",
            email="driver@transitops.dev",
            license_number="DL-DRV123",
            license_category="Class A CDL",
            license_expiry_date=date.today() + timedelta(days=365),
            contact_number="+15550001",
            safety_score=100.0,
            status="Available"
        )
        db.add(driver_profile)
        
        db.commit()
        print("Database seeded successfully with test users and driver profile!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
