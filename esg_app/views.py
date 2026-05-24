from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from .services import SAPParserService
from .models import Tenant
from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import EmissionActivityRecord, AuditTrail
from .serializers import EmissionRecordSerializer

class SAPUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        # For this prototype, we will just grab the first tenant in the database
        tenant = Tenant.objects.first()
        if not tenant:
            # Auto-create a tenant if database is empty
            tenant = Tenant.objects.create(name="Default Prototype Client")

        # Read and decode the file
        file_content = file_obj.read().decode('utf-8')

        # Run the Service
        service = SAPParserService(tenant_id=tenant.id, user_id=request.user.id if request.user.is_authenticated else None)
        result = service.process_csv_file(file_content)

        return Response(result, status=status.HTTP_201_CREATED)
class RecordListView(ListAPIView):
    """Fetches all records so the analyst can review them."""
    queryset = EmissionActivityRecord.objects.all().order_by('-updated_at')
    serializer_class = EmissionRecordSerializer

class RecordApproveView(APIView):
    """Handles the state change and writes to the Audit Ledger."""
    def post(self, request, pk, format=None):
        record = get_object_or_404(EmissionActivityRecord, pk=pk)
        
        if record.status == 'APPROVED':
            return Response({"error": "Record already approved."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = record.status
        record.status = 'APPROVED'
        record.save()

        # Write the strict audit trail!
        AuditTrail.objects.create(
            record=record,
            user=request.user if request.user.is_authenticated else None,
            action=f"Analyst approved record. Status changed from {old_status} to APPROVED.",
        )

        return Response({"message": "Record approved and locked for audit."}, status=status.HTTP_200_OK)
from .services import UtilityParserService

class UtilityUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        tenant = Tenant.objects.first()
        file_content = file_obj.read().decode('utf-8')

        service = UtilityParserService(tenant_id=tenant.id, user_id=request.user.id if request.user.is_authenticated else None)
        result = service.process_csv_file(file_content)

        return Response(result, status=status.HTTP_201_CREATED)
from .services import ConcurParserService


from .services import ConcurParserService

class ConcurUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request, format=None):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        tenant = Tenant.objects.first()
        file_content = file_obj.read().decode('utf-8')

        service = ConcurParserService(tenant_id=tenant.id, user_id=request.user.id if request.user.is_authenticated else None)
        result = service.process_json_payload(file_content)

        return Response(result, status=status.HTTP_201_CREATED)