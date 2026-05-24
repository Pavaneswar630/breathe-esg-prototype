from rest_framework import serializers
from .models import EmissionActivityRecord

class EmissionRecordSerializer(serializers.ModelSerializer):
    # We use a SerializerMethodField instead to handle the logic safely
    facility_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EmissionActivityRecord
        fields = [
            'id', 'facility_name', 'scope_category', 'ghg_category', 
            'start_date', 'raw_quantity', 'raw_unit', 'status', 'anomaly_reason'
        ]

    def get_facility_name(self, obj):
        # Safely check if the facility exists before trying to get its name
        if obj.facility:
            return obj.facility.name
        return "Unmapped (Needs Action)"