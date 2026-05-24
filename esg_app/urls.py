from django.urls import path
from .views import (
    SAPUploadView, 
    UtilityUploadView, 
    ConcurUploadView, 
    RecordListView, 
    RecordApproveView
)

urlpatterns = [
    # Phase 3: SAP Upload
    path('api/upload/sap/', SAPUploadView.as_view(), name='sap-upload'),
    
    # Phase 5: Utility Upload
    path('api/upload/utility/', UtilityUploadView.as_view(), name='utility-upload'),
    
    # Phase 6: Concur (Travel) Upload
    path('api/upload/concur/', ConcurUploadView.as_view(), name='concur-upload'),
    
    # Phase 4: Dashboard endpoints
    path('api/records/', RecordListView.as_view(), name='record-list'),
    path('api/records/<uuid:pk>/approve/', RecordApproveView.as_view(), name='record-approve'),
]