# Data Model Architecture

The Breathe ESG ingestion engine uses a relational database model designed for multi-tenancy, data integrity, and strict auditability. The core philosophy is to never mutate raw data, but rather extract, normalize, and track the state of the data as it moves through the approval pipeline.

## Core Entities

1. **`Tenant`**
   - The root entity for multi-tenancy. All subsequent records are linked to a tenant to ensure strict data isolation between enterprise clients.

2. **`Facility`**
   - Represents physical locations (e.g., "Berlin Manufacturing Hub").
   - Contains `internal_sap_code` for automatic mapping during ingestion.

3. **`RawIngestionJob`**
   - **Purpose:** Acts as the immutable "Source of Truth."
   - **Fields:** Stores the `source_type` (SAP, UTILITY, CONCUR) and the exact `raw_payload` (JSON or CSV content) uploaded by the user. 
   - **Why:** If the parsing engine logic is ever updated, we can replay these raw jobs to regenerate the ledger without asking the client to re-upload files.

4. **`EmissionActivityRecord`**
   - **Purpose:** The normalized ledger entry.
   - **Fields:** Maps disparate data to standard GHG Protocol categories (`scope_category`, `ghg_category`). It stores both the `raw_quantity`/`raw_unit` and a `normalized_quantity` (e.g., converting all utility readings to `kWh`).
   - **State Machine:** Uses a `status` field (`RAW`, `FLAGGED`, `APPROVED`) and stores an `anomaly_reason` if the parsing engine detects business logic errors.

5. **`AuditTrail`**
   - **Purpose:** Compliance and traceability.
   - **Fields:** Logs every state change of an `EmissionActivityRecord` (e.g., when a user transitions a record from `FLAGGED` to `APPROVED`), recording the user, timestamp, and a description of the action.
