from django.contrib import admin
from .models import Tenant, Facility, RawIngestionJob, EmissionActivityRecord, AuditTrail

admin.site.register(Tenant)
admin.site.register(Facility)
admin.site.register(RawIngestionJob)
admin.site.register(EmissionActivityRecord)
admin.site.register(AuditTrail)