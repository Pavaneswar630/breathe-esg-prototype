# Data Source Handlers

The ingestion engine features three distinct parser services, each tailored to handle specific business logic and anomalies for its data type.

### 1. SAP Procurement (Source: `.csv`)
- **Handler:** `SAPParserService`
- **Logic:** Reads AL11 exports. It maps German column headers (e.g., `Menge` to Quantity) to our English schema. 
- **Anomaly Detection:** - Flags rows where the `Plant_Code` does not exist in the `Facility` database.
  - Flags negative quantities, which often indicate an ERP correction or reversal, requiring human verification before entering the ledger.

### 2. Utility Portal (Source: `.csv`)
- **Handler:** `UtilityParserService`
- **Logic:** Reads electricity consumption data. Normalizes disparate units (e.g., converting `MWh` to `kWh` by multiplying by 1000) so the final ledger maintains a standard unit.
- **Anomaly Detection:** Calculates the `timedelta` between the `Start_Date` and `End_Date`. If the billing cycle is less than 25 days or greater than 35 days (e.g., a 45-day staggered bill), it flags the row to prevent emissions from being disproportionately allocated to a single month.

### 3. Concur Travel (Source: `.json`)
- **Handler:** `ConcurParserService`
- **Logic:** Simulates processing a webhook/API payload. It iterates through nested JSON arrays (Trips -> Segments).
- **Anomaly Detection:** It attempts to map the `origin` and `destination` to an internal dictionary of IATA coordinates to calculate the flight distance. If an unknown airport code is provided (e.g., `XYZ`), the distance calculation aborts, and the row is flagged for manual review.
