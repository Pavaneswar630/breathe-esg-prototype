# Tradeoffs & Future Iterations

Given the strict 4-day timeline for this prototype, several calculated tradeoffs were made. In a true production environment, these areas would be the immediate next focus:

### 1. Database (SQLite vs. PostgreSQL)
- **Tradeoff:** SQLite was used for rapid prototyping and ease of local testing.
- **Production Fix:** Migrate to PostgreSQL to support advanced JSONB querying (for the `RawIngestionJob` payload), better concurrent write performance during large CSV uploads, and robust backup capabilities.

### 2. File Storage (Database JSON vs. S3)
- **Tradeoff:** Raw file payloads are currently stored directly in the `RawIngestionJob` database table.
- **Production Fix:** Integrate AWS S3 (or equivalent) using `django-storages`. The database should only hold a URL reference to the raw CSV/JSON file to prevent database bloat.

### 3. Authentication & Authorization
- **Tradeoff:** Basic session handling was utilized for the prototype, and the default tenant is hardcoded for the single-user experience.
- **Production Fix:** Implement a full JWT (JSON Web Token) flow or OAuth integration. Build robust Role-Based Access Control (RBAC) so "Analysts" can upload data, but only "Auditors" or "Managers" can approve flagged anomalies.

### 4. Facility Mapping UI
- **Tradeoff:** To fix an "Unmapped" SAP plant code, the user currently utilizes the native Django Admin panel to add the facility.
- **Production Fix:** Build a dedicated "Data Mapping" screen in the React frontend, allowing analysts to visually link unknown string codes to existing facilities without leaving the portal.
