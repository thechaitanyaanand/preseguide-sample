from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from .models import Presentation, Recording
from .serializers import PresentationSerializer, RecordingSerializer
from .services.audio_analyzer import AudioAnalyzer
from .services.ai_coach import AICoach
import os


class PresentationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing presentations.
    """
    queryset = Presentation.objects.all()
    serializer_class = PresentationSerializer

    def create(self, request, *args, **kwargs):
        """Create a new presentation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )


class RecordingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing recordings and audio analysis.
    """
    queryset = Recording.objects.all()
    serializer_class = RecordingSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def create(self, request, *args, **kwargs):
        """
        Upload a new recording and trigger analysis.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recording = serializer.save()

        # Trigger async analysis (for now, synchronous)
        self._analyze_recording(recording)

        # Refresh from DB to get updated data
        recording.refresh_from_db()

        return Response(
            self.get_serializer(recording).data,
            status=status.HTTP_201_CREATED
        )

    def _analyze_recording(self, recording: Recording):
        """
        Analyze the uploaded recording.
        This runs synchronously for the MVP. In production, use Celery.
        """
        try:
            recording.status = 'processing'
            recording.save()

            # Get the audio file path
            audio_path = recording.audio_file.path

            print(f"Starting analysis for recording {recording.id}...")

            # Step 1: Audio Analysis (Whisper + custom logic)
            analyzer = AudioAnalyzer()
            analysis_result = analyzer.analyze_audio(audio_path)

            if not analysis_result.get('success'):
                raise Exception(analysis_result.get('error', 'Unknown error'))

            # Step 2: Save analysis results
            recording.transcription = analysis_result['transcription']
            recording.duration_seconds = analysis_result['duration_seconds']
            recording.total_words = analysis_result['total_words']
            recording.filler_words_list = analysis_result['filler_words_list']
            recording.filler_word_count = analysis_result['filler_word_count']
            recording.words_per_minute = analysis_result['words_per_minute']
            recording.pacing_score = analysis_result['pacing_score']
            recording.clarity_score = analysis_result['clarity_score']
            recording.overall_score = analysis_result['overall_score']

            # Step 3: Generate AI Feedback using LangChain + Gemini
            print("Generating AI feedback...")
            try:
                coach = AICoach()
                ai_feedback = coach.generate_feedback(analysis_result)
                recording.ai_feedback = ai_feedback
            except Exception as e:
                print(f"AI feedback generation failed: {str(e)}")
                recording.ai_feedback = f"Analysis complete but AI feedback unavailable. Error: {str(e)}"

            recording.status = 'completed'
            recording.save()

            print(f"Analysis completed for recording {recording.id}!")

        except Exception as e:
            print(f"Analysis failed: {str(e)}")
            recording.status = 'failed'
            recording.error_message = str(e)
            recording.save()

    @action(detail=True, methods=['get'])
    def reanalyze(self, request, pk=None):
        """
        Re-analyze an existing recording.
        """
        recording = self.get_object()
        
        if not recording.audio_file:
            return Response(
                {'error': 'No audio file associated with this recording'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Run analysis
        self._analyze_recording(recording)

        # Refresh and return
        recording.refresh_from_db()
        return Response(self.get_serializer(recording).data)
