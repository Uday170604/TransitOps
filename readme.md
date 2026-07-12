# 🚛 TransitOps

TransitOps is a modern, responsive, and secure transport operations management platform. It allows fleet managers, safety officers, financial analysts, and drivers to coordinate vehicles, profiles, trips, maintenance logs, and fuel expenses from a single dynamic workspace.

---

## 👨‍💻 Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS, Lucide icons, Context API (Theme, Auth, and Settings).
*   **Backend:** FastAPI, SQLAlchemy (ORM), Uvicorn, Jose JWT tokens.
*   **Database:** PostgreSQL (with base metrics saved in Standard units: kilometers and INR).

---

## 🚀 Key Features

1.  **Dynamic Database-Driven RBAC**: Permissions are stored in the database for each role (Fleet Manager, Driver, Safety Officer, and Financial Analyst). Role permission changes made in the **Settings** view propagate in real-time to restrict API endpoint access on the backend.
2.  **User-Specific Configuration**: General settings (Depot name, currency, and distance unit) are stored per user. Changing these preferences updates symbols, formats, and converts metrics (Miles vs. Kilometers, USD/EUR vs. INR) throughout the application specifically for that user.
3.  **Real-Time Analytics & SVG Graphs**: The Reports tab computes operational costs, average fuel efficiency, utilization rates, and queries completed trip revenues from the database to render dynamic bar chart graphics.
4.  **License & Fleet Safety Warnings**: Highlights expired licenses, driver suspensions, and vehicle maintenance holds during dispatch validation.

---

## 🛠️ Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Python (v3.8+)
*   PostgreSQL running locally or remotely

---

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create and activate a virtual environment:
    ```bash
    # Windows
    python -m venv .venv
    .\.venv\Scripts\activate

    # macOS/Linux
    python3 -m venv .venv
    source .venv/bin/activate
    ```

3.  Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Configure the Environment Variables:
    Create a `.env` file in the `backend/` directory (or modify the existing one) with the following structure:
    ```ini
    DATABASE_URL=postgresql://postgres:password@localhost:5432/transitops
    SECRET_KEY=randomstring 
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=1440
    ```
    *Ensure the `DATABASE_URL` matches your local PostgreSQL username, password, port, and database name.*

---

### 2. Database Seeding & Initialization

TransitOps comes with a database initialization script that creates the necessary tables (including the `system_settings` and `roles` tables with default RBAC permissions) and populates them with test users, drivers, vehicles, and logs.

Run the seed script from the `backend` directory with:
```bash
# Ensure your virtual environment is active
python -m app.seed
```

This will output:
```text
Dropping existing database tables...
Creating database tables...
Seeding roles...
Seeding initial users...
Database seeded successfully with test users and driver profile!
```

#### Seeded User Credentials
You can log in to the dashboard using any of the following credentials (password for all is `demo1234`):
*   **Fleet Manager (Admin):** `fleet@transitops.dev` (Full access to all modules and permission settings)
*   **Safety Officer:** `safety@transitops.dev` (Manages drivers and lists trips)
*   **Financial Analyst:** `analyst@transitops.dev` (Accesses fuel logs, expenses, and reports)
*   **Driver:** `driver@transitops.dev` (Accesses trips and fuel logs)

---

### 3. Running the Backend Server

Start the FastAPI application with:
```bash
uvicorn app.main:app --reload
```
The documentation will be available at `http://127.0.0.1:8000/docs`.

---

### 4. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Frontend Environment Variables:
    Verify the base API url is set inside `frontend/.env` (or config file) pointing to your backend address:
    ```env
    VITE_API_BASE_URL=http://localhost:8000
    ```

4.  Start the development server:
    ```bash
    npm run dev
    ```
    Vite will start the dev server, typically at `http://localhost:5173/` or `http://localhost:5174/`. Open this URL in your web browser.

---

## 🧪 Running Tests

A full backend test suite is included to verify API security, role-based controls, data isolation, and operational limits.

Run the tests from the `backend/` folder:
```bash
# Make sure virtual environment is active
python -m pytest
```
