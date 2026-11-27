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

## 📐 Architecture & Workflow

### 🏗️ System Architecture

```mermaid
flowchart LR
    %% Styles
    classDef client fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef gateway fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef auth fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff;
    classDef service fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff;
    classDef db fill:#06b6d4,stroke:#0891b2,stroke-width:2px,color:#fff;

    subgraph ClientLayer["🖥️ Frontend Application"]
        Users["👥 Operators & Drivers"]:::client
        SPA["⚛️ React UI (Vite + Tailwind)"]:::client
        Ctx["🔐 Auth & Settings Context"]:::client
        Users -->|Browse / Actions| SPA
        SPA -->|User Prefs & Token| Ctx
    end

    subgraph BackendLayer["⚡ FastAPI Backend Core"]
        GW["🌐 Uvicorn API Gateway (:8000)"]:::gateway
        Auth["🛡️ Jose JWT Auth & Dynamic RBAC"]:::auth
        FleetSvc["🚚 Fleet & Trips Service"]:::service
        OpsSvc["🔧 Maintenance & Fuel Logs"]:::service
        Analytics["📊 Analytics & SVG Generator"]:::service
        ORM["🗄️ SQLAlchemy ORM"]:::service

        SPA -->|REST API + Bearer Token| GW
        GW -->|Verify Permissions| Auth
        GW -->|Dispatch / Tracking| FleetSvc
        GW -->|Fuel & Repairs| OpsSvc
        GW -->|Reports & Conversions| Analytics

        FleetSvc --> ORM
        OpsSvc --> ORM
        Analytics --> ORM
    end

    subgraph StorageLayer["💾 Database"]
        PG[("🐘 PostgreSQL (:5432)")]:::db
        ORM -->|SQL Queries| PG
    end
```

### 🔄 Trip Dispatch & Safety Validation Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Dispatcher as 👨‍💼 Fleet Manager
    participant UI as ⚛️ TransitOps UI
    participant API as ⚡ FastAPI Backend
    participant RBAC as 🛡️ RBAC & Safety Guard
    participant DB as 🐘 PostgreSQL

    Dispatcher->>UI: Create Trip Dispatch Request
    UI->>API: POST /api/v1/trips (Vehicle ID, Driver ID)
    API->>RBAC: Check Role Permissions & Token
    RBAC-->>API: Authorized
    API->>DB: Query Driver License & Vehicle Status
    DB-->>API: Driver License & Vehicle Hold Info
    
    alt Safety Violation (Expired License or Vehicle Hold)
        API-->>UI: ⚠️ 400 Warning: Safety Hold / License Expired
        UI-->>Dispatcher: Display Warning & Block Dispatch
    else Passed Safety Checks
        API->>DB: Save Scheduled Trip
        DB-->>API: Trip Confirmed
        API-->>UI: 200 OK (Trip Scheduled)
        UI-->>Dispatcher: Show Confirmation & Real-time Route
    end
```

<p align="center">
  <a href="https://Uday170604.github.io/TransitOps/architecture.html">
    <b>✨ Open Live Interactive & Animated Diagram ✨</b>
  </a>
</p>

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
