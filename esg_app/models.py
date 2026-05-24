import uuid
from django.db import models
from django.contrib.auth.models import User

class Tenant(models.Model):
    """Represents the client company (e.g., 'Acme Corp'). Multi-tenancy is a strict requirement."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Facility(models.Model):
    """Maps custom SAP plant codes to real physical locations for Scope 2 calculations."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    internal_sap_code = models.CharField(max_length=50, blank=True, null=True)
    name = models.CharField(max_length=255)
    region_grid_factor = models.CharField(max_length=50) # e.g., 'eGRID_SRSO'

    def __str__(self):
        return f"{self.name} ({self.internal_sap_code})"

class RawIngestionJob(models.Model):
    """Stores the exact, messy payload before we touch it. Essential for the audit trail."""
    SOURCE_CHOICES = [
        ('SAP', 'SAP Procurement'),
        ('UTILITY', 'Utility Portal Export'),
        ('CONCUR', 'SAP Concur API')
    ]
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    raw_payload = models.JSONField() # Holds the unparsed file/API data
    created_at = models.DateTimeField(auto_now_add=True)

class EmissionActivityRecord(models.Model):
    """The normalized ledger where analysts review the data."""
    SCOPE_CHOICES = [
        ('SCOPE_1', 'Scope 1: Direct'),
        ('SCOPE_2', 'Scope 2: Indirect (Electricity)'),
        ('SCOPE_3', 'Scope 3: Indirect (Value Chain)')
    ]
    STATUS_CHOICES = [
        ('RAW', 'Raw Ingested'),
        ('FLAGGED', 'Flagged for Review'),
        ('APPROVED', 'Analyst Approved'),
        ('AUDIT_LOCKED', 'Locked for Audit')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    facility = models.ForeignKey(Facility, on_delete=models.SET_NULL, null=True, blank=True)
    job = models.ForeignKey(RawIngestionJob, on_delete=models.PROTECT)
    
    # ESG Attributes
    scope_category = models.CharField(max_length=10, choices=SCOPE_CHOICES)
    ghg_category = models.CharField(max_length=100) 
    
    # Temporal alignment
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Normalized Data
    raw_quantity = models.DecimalField(max_digits=18, decimal_places=4)
    raw_unit = models.CharField(max_length=20) 
    normalized_quantity_kwh = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    
    # State Machine
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='RAW')
    anomaly_reason = models.TextField(blank=True, null=True)
    
    updated_at = models.DateTimeField(auto_now=True)

class AuditTrail(models.Model):
    """Immutable log of who changed what and when."""
    record = models.ForeignKey(EmissionActivityRecord, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    changes_json = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)