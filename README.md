# Breathe ESG - Analyst Portal (Data Ingestion Engine)

🟢 **Live Demo:** [Click here to view the deployed application](https://breathe-esg-prototype-1.onrender.com/)
*(Note: The backend is hosted on a free Render tier and may take 30-50 seconds to spin up on the first upload).*

This repository contains the prototype for a multi-tenant ESG (Environmental, Social, and Governance) data ingestion engine, built as a technical assessment for Breathe ESG. 

The system allows ESG analysts to upload raw corporate data from disparate sources, normalizes it into standard GHG Protocol scopes, and utilizes a state machine (`RAW` -> `FLAGGED` -> `APPROVED`) to catch business-logic anomalies before the data enters the immutable emissions ledger.

## 🚀 Key Features
* **Decoupled Architecture:** Django REST Framework API backend paired with a React (Vite) frontend.
* **Multi-Format Parsing:** Native handlers for CSVs (SAP, Utilities) and JSON payloads (Concur API).
* **Automated Anomaly Detection:** Flags unmapped facilities, negative quantities, non-standard billing cycles, and invalid IATA airport codes.
* **State Machine & Audit Trail:** Records are locked upon approval, with all state changes logged for compliance.
* **Dynamic Frontend Analytics:** Real-time calculation of approval rates, processing metrics, and ledger counts directly from the database.

## 📚 Architectural Documentation
To understand the engineering choices behind this prototype, please review the following documents:
* [MODEL.md](./MODEL.md) - Database schema and relational design.
* [DECISIONS.md](./DECISIONS.md) - Key architectural and product choices.
* [SOURCES.md](./SOURCES.md) - Specific logic and anomaly detection for SAP, Utility, and Travel data.
* [TRADEOFFS.md](./TRADEOFFS.md) - Known limitations and future production iterations.

## 🛠️ Tech Stack
* **Backend:** Python, Django, Django REST Framework, SQLite (Local prototype database)
* **Frontend:** React 18, Vite, Axios, Lucide Icons
* **Data Processing:** Python `csv`, `json`, and custom Haversine math logic.

---

## 💻 Local Setup Instructions

If you wish to run this application locally, you will need two terminal windows to run the backend and frontend simultaneously.

### 1. Backend (Django)
```bash
# Navigate to the root directory
cd breathe-esg-prototype

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Start the server (runs on port 8000)
python manage.py runserver
```

### 2. Frontend (React)
```bash
# Open a second terminal window
# Navigate to the root directory
cd breathe-esg-prototype

# Install Node dependencies
npm install

# Start the Vite development server (runs on port 5173)
npm run dev
```

## 🧪 Testing the Engine
A `sample_data/` folder is included in this repository. You can use these files in the React frontend to trigger the automated anomaly detection:
1. **`sap_al11_export.csv`** (Triggers "Unmapped Facility" and "Negative Quantity" flags).
2. **`utility_portal_export.csv`** (Triggers "Irregular 45-day Billing Cycle" flag).
3. **`concur_api_mock.json`** (Triggers "Unknown IATA Code" flag while calculating valid flight distances).
