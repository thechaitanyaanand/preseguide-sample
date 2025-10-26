from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PresentationViewSet, RecordingViewSet

router = DefaultRouter()
router.register(r'presentations', PresentationViewSet, basename='presentation')
router.register(r'recordings', RecordingViewSet, basename='recording')

urlpatterns = [
    path('', include(router.urls)),
]
