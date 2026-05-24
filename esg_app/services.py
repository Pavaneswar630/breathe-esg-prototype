import csv
import io
from datetime import datetime
from decimal import Decimal
from .models import Tenant, Facility, RawIngestionJob, EmissionActivityRecord

class SAPParserService:
    def __init__(self, tenant_id, user_id=None):
        self.tenant = Tenant.objects.get(id=tenant_id)
        self.user_id = user_id
        # Pre-fetch facilities to avoid hitting the DB in a loop
        self.facility_map = {f.internal_sap_code: f for f in Facility.objects.filter(tenant=self.tenant)}

    def process_csv_file(self, file_content_str):
        # 1. Create the immutable Raw Ingestion Job for the audit trail
        job = RawIngestionJob.objects.create(
            tenant=self.tenant,
            source_type='SAP',
            uploaded_by_id=self.user_id,
            raw_payload={"filename": "sap_export.csv", "content": file_content_str}
        )

        reader = csv.DictReader(io.StringIO(file_content_str))
        records_created = 0

        for row in reader:
            # Parse European Date (DD.MM.YYYY to YYYY-MM-DD)
            raw_date_str = row.get('BUDAT', '')
            try:
                parsed_date = datetime.strptime(raw_date_str, '%d.%m.%Y').date()
            except ValueError:
                parsed_date = None # We will flag this below

            plant_code = row.get('WERKS')
            facility = self.facility_map.get(plant_code)
            raw_qty = Decimal(row.get('MENGE', '0'))
            
            # Determine initial status
            status = 'RAW'
            anomaly_notes = []

            if not facility:
                status = 'FLAGGED'
                anomaly_notes.append(f"Unmapped SAP Plant Code: {plant_code}")
            
            if raw_qty < 0:
                status = 'FLAGGED'
                anomaly_notes.append("Negative quantity detected (possible SAP correction).")
                
            if not parsed_date:
                status = 'FLAGGED'
                anomaly_notes.append("Invalid date format in BUDAT.")

            # Create the ledger entry
            EmissionActivityRecord.objects.create(
                tenant=self.tenant,
                job=job,
                facility=facility,
                scope_category='SCOPE_1',
                ghg_category='Stationary Combustion',
                start_date=parsed_date or datetime.now().date(), # Fallback for DB constraints
                end_date=parsed_date or datetime.now().date(),
                raw_quantity=raw_qty,
                raw_unit=row.get('MEINS', 'UNKNOWN'),
                status=status,
                anomaly_reason=" | ".join(anomaly_notes) if anomaly_notes else None
            )
            records_created += 1

        return {"job_id": job.id, "records_processed": records_created}

class UtilityParserService:
    def __init__(self, tenant_id, user_id=None):
        self.tenant = Tenant.objects.get(id=tenant_id)
        self.user_id = user_id
        # In reality, you'd map meters to facilities. For this prototype, we'll assign to the first facility.
        self.default_facility = Facility.objects.filter(tenant=self.tenant).first()

    def process_csv_file(self, file_content_str):
        job = RawIngestionJob.objects.create(
            tenant=self.tenant,
            source_type='UTILITY',
            uploaded_by_id=self.user_id,
            raw_payload={"filename": "utility_export.csv", "content": file_content_str}
        )

        reader = csv.DictReader(io.StringIO(file_content_str))
        records_created = 0

        for row in reader:
            try:
                start_date = datetime.strptime(row['Start_Date'], '%Y-%m-%d').date()
                end_date = datetime.strptime(row['End_Date'], '%Y-%m-%d').date()
            except ValueError:
                continue # Skip completely invalid date rows for safety

            raw_qty = Decimal(row.get('Consumption', '0'))
            raw_unit = row.get('Unit', 'kWh').strip()
            
            status = 'RAW'
            anomaly_notes = []

            # 1. Unit Normalization to standard kWh
            normalized_kwh = raw_qty
            if raw_unit.upper() == 'MWH':
                normalized_kwh = raw_qty * Decimal('1000')
            elif raw_unit.upper() != 'KWH':
                status = 'FLAGGED'
                anomaly_notes.append(f"Unrecognized unit: {raw_unit}. Assumed 1:1 kWh.")

            # 2. Billing Cycle Anomaly Detection
            billing_days = (end_date - start_date).days
            if billing_days < 25 or billing_days > 35:
                status = 'FLAGGED'
                anomaly_notes.append(f"Irregular billing cycle: {billing_days} days. Review required.")

            EmissionActivityRecord.objects.create(
                tenant=self.tenant,
                job=job,
                facility=self.default_facility,
                scope_category='SCOPE_2',
                ghg_category='Purchased Electricity',
                start_date=start_date,
                end_date=end_date,
                raw_quantity=raw_qty,
                raw_unit=raw_unit,
                normalized_quantity_kwh=normalized_kwh,
                status=status,
                anomaly_reason=" | ".join(anomaly_notes) if anomaly_notes else None
            )
            records_created += 1

        return {"job_id": job.id, "records_processed": records_created}
import json
import math

class ConcurParserService:
    def __init__(self, tenant_id, user_id=None):
        self.tenant = Tenant.objects.get(id=tenant_id)
        self.user_id = user_id
        
        # Mini internal database of IATA coordinates (Lat, Lon)
        self.airport_db = {
            "JFK": (40.6413, -73.7781),
            "LHR": (51.4700, -0.4543),
            "SFO": (37.6213, -122.3790),
            "LAX": (33.9416, -118.4085)
        }

    def _haversine(self, coord1, coord2):
        """Calculates distance between two lat/lon points in kilometers."""
        R = 6371.0 # Earth radius in km
        lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
        lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def process_json_payload(self, file_content_str):
        job = RawIngestionJob.objects.create(
            tenant=self.tenant,
            source_type='CONCUR',
            uploaded_by_id=self.user_id,
            raw_payload={"filename": "concur_payload.json", "content": file_content_str}
        )

        try:
            payload = json.loads(file_content_str)
            trips = payload.get("trips", [])
        except json.JSONDecodeError:
            return {"error": "Invalid JSON format."}

        records_created = 0

        for trip in trips:
            trip_date = trip.get("date")
            for segment in trip.get("segments", []):
                origin = segment.get("origin")
                dest = segment.get("destination")
                
                status = 'RAW'
                anomaly_notes = []
                distance_km = Decimal('0')

                # Calculate distance
                if origin in self.airport_db and dest in self.airport_db:
                    dist = self._haversine(self.airport_db[origin], self.airport_db[dest])
                    distance_km = Decimal(str(round(dist, 2)))
                else:
                    status = 'FLAGGED'
                    anomaly_notes.append(f"Unknown IATA code in segment {origin}-{dest}. Distance calculation failed.")

                EmissionActivityRecord.objects.create(
                    tenant=self.tenant,
                    job=job,
                    facility=None, # Travel isn't tied to a specific facility building
                    scope_category='SCOPE_3',
                    ghg_category='Business Travel (Category 6)',
                    start_date=trip_date,
                    end_date=trip_date,
                    raw_quantity=distance_km,
                    raw_unit='km',
                    status=status,
                    anomaly_reason=" | ".join(anomaly_notes) if anomaly_notes else None
                )
                records_created += 1

        return {"job_id": job.id, "records_processed": records_created}