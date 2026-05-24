# Architectural & Engineering Decisions

During the 4-day sprint, the following key engineering decisions were made to prioritize robustness, realism, and user experience:

### 1. Decoupled Architecture (Django API + React/Vite)
Instead of using Django Templates, the application was split into a REST API backend and a separate React frontend. This mirrors modern enterprise architectures, allows for better UI state management during asynchronous uploads, and enables future mobile-app integrations.

### 2. State Machine for Data Ingestion
ESG data requires human oversight. Instead of a direct ETL pipeline that writes straight to a final reporting table, a state machine was implemented (`RAW` -> `FLAGGED` -> `APPROVED`). This allows the system to catch anomalies without blocking the entire file upload, empowering the analyst to review edge cases individually.

### 3. Graceful Handling of Unmapped Data
When an SAP file contains an unknown Plant Code, the system does not crash or reject the row. Instead, it assigns a `null` facility, flags the row as `Unmapped (Needs Action)`, and allows the analyst to update the facility mapping in the database. Subsequent uploads will automatically map the previously unknown codes.

### 4. UTF-8-SIG Decoding
Enterprise CSV exports (especially from Microsoft Excel) frequently contain hidden Byte Order Marks (BOM). The `UtilityParserService` was explicitly configured to read files using `utf-8-sig` to safely strip these invisible characters and prevent silent `KeyError` crashes on the `Start_Date` column.

### 5. Haversine Formula for Missing Distances
For Scope 3 travel data, the Concur API often provides only IATA airport codes (e.g., JFK to LHR) without distances. The `ConcurParserService` was built with an internal coordinate dictionary and utilizes the Haversine formula to mathematically calculate flight distances dynamically during ingestion.
