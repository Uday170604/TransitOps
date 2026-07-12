from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.core.security import get_password_hash

def seed_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("Database already has users. Seeding skipped.")
            return

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
                hashed_password=hashed_pwd
            )
            db.add(db_user)
        
        db.commit()
        print("Database seeded successfully with test users!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
