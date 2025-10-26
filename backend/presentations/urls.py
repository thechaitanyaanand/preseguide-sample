from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PresentationViewSet, RecordingViewSet, BadgeViewSet

router = DefaultRouter()
router.register(r'presentations', PresentationViewSet, basename='presentation')
router.register(r'recordings', RecordingViewSet, basename='recording')
router.register(r'badges', BadgeViewSet, basename='badge')

urlpatterns = [
    path('', include(router.urls)),
]
