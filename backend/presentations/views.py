from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from .models import Presentation, Recording, Badge
from .serializers import PresentationSerializer, RecordingSerializer, BadgeSerializer
from .services.audio_analyzer import AudioAnalyzer
from .services.ai_coach import AICoach
from .services.document_processor import DocumentProcessor
from .services.qa_generator import QAGenerator
from .services.gamification import GamificationService
import os


class PresentationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing presentations.
    """
    queryset = Presentation.objects.all()
    serializer_class = PresentationSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def create(self, request, *args, **kwargs):
        """Create a new presentation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        presentation = serializer.save()
        
        # Process document if uploaded
        if 'document_file' in request.FILES:
            self._process_document(presentation)
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """Update a presentation."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Process document if newly uploaded
        if 'document_file' in request.FILES:
            self._process_document(instance)
        
        return Response(serializer.data)
    
    def _process_document(self, presentation: Presentation):
        """Process uploaded document to extract text and key points."""
        try:
            processor = DocumentProcessor()
            result = processor.process_document(presentation.document_file.path)
            
            if result.get('success'):
                presentation.document_extracted_text = result['full_text']
                presentation.document_key_points = result['key_points']
                presentation.save()
                
                # Award XP for document upload
                gamification = GamificationService()
                gamification.award_xp(presentation, 'document_upload')
                
                print(f"Document processed: {result['total_pages']} pages, {result['total_words']} words")
            else:
                print(f"Document processing failed: {result.get('error')}")
                
        except Exception as e:
            print(f"Error processing document: {str(e)}")
    
    @action(detail=True, methods=['post'])
    def generate_qa(self, request, pk=None):
        """
        Generate Q&A for the presentation.
        """
        presentation = self.get_object()
        
        try:
            generator = QAGenerator()
            
            presentation_data = {
                'title': presentation.title,
                'description': presentation.description or '',
                'document_text': presentation.document_extracted_text or ''
            }
            
            questions = generator.generate_questions(presentation_data)
            
            # Save questions to presentation
            presentation.generated_questions = questions
            presentation.save()
            
            return Response({
                'success': True,
                'questions': questions,
                'count': len(questions)
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Get progress statistics for the presentation.
        """
        presentation = self.get_object()
        recordings = presentation.recordings.filter(status='completed')
        
        if recordings.count() == 0:
            return Response({
                'has_recordings': False,
                'message': 'No completed recordings yet'
            })
        
        # Calculate progress metrics
        scores = [r.overall_score for r in recordings if r.overall_score is not None]
        
        progress_data = {
            'has_recordings': True,
            'total_recordings': recordings.count(),
            'current_iteration': recordings.order_by('-iteration_number').first().iteration_number,
            'average_score': round(sum(scores) / len(scores), 1) if scores else 0,
            'best_score': round(max(scores), 1) if scores else 0,
            'latest_score': scores[-1] if scores else 0,
            'improvement_trend': self._calculate_trend(recordings),
            'scores_history': [
                {
                    'iteration': r.iteration_number,
                    'score': r.overall_score,
                    'date': r.created_at
                }
                for r in recordings
            ]
        }
        
        return Response(progress_data)
    
    def _calculate_trend(self, recordings):
        """Calculate if scores are trending up, down, or stable."""
        if recordings.count() < 2:
            return 'insufficient_data'
        
        last_three = recordings.order_by('-created_at')[:3]
        scores = [r.overall_score for r in last_three if r.overall_score is not None]
        
        if len(scores) < 2:
            return 'insufficient_data'
        
        # Simple trend: compare first and last
        if scores[-1] > scores[0] + 5:
            return 'improving'
        elif scores[-1] < scores[0] - 5:
            return 'declining'
        else:
            return 'stable'


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
        
        # Award XP for first recording
        if recording.iteration_number == 1:
            gamification = GamificationService()
            gamification.award_xp(recording.presentation, 'first_recording')
        else:
            gamification = GamificationService()
            gamification.award_xp(recording.presentation, 'recording_upload')
        
        # Trigger analysis
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

            # Step 2: Save basic analysis results
            recording.transcription = analysis_result['transcription']
            recording.duration_seconds = analysis_result['duration_seconds']
            recording.total_words = analysis_result['total_words']
            recording.filler_words_list = analysis_result['filler_words_list']
            recording.filler_word_count = analysis_result['filler_word_count']
            recording.words_per_minute = analysis_result['words_per_minute']
            recording.pacing_score = analysis_result['pacing_score']
            recording.clarity_score = analysis_result['clarity_score']
            recording.overall_score = analysis_result['overall_score']

            # Step 3: Content Coverage Analysis (if document exists)
            if recording.presentation.document_key_points:
                processor = DocumentProcessor()
                coverage_result = processor.calculate_content_coverage(
                    recording.transcription,
                    recording.presentation.document_key_points
                )
                recording.content_coverage_score = coverage_result['coverage_score']
                recording.missed_key_points = coverage_result['missed_points']
                
                # Adjust overall score to include content coverage
                recording.overall_score = (
                    recording.overall_score * 0.7 + 
                    coverage_result['coverage_score'] * 0.3
                )

            # Step 4: Calculate Improvement from Previous
            gamification = GamificationService()
            improvement = gamification.calculate_improvement(recording)
            recording.improvement_from_previous = improvement

            # Step 5: Generate AI Feedback using LangChain + Gemini
            print("Generating AI feedback...")
            try:
                coach = AICoach()
                
                # Enhanced analysis data with document context
                enhanced_data = {
                    **analysis_result,
                    'iteration_number': recording.iteration_number,
                    'improvement': improvement,
                    'has_document': bool(recording.presentation.document_file),
                    'content_coverage_score': recording.content_coverage_score,
                    'missed_key_points': recording.missed_key_points
                }
                
                ai_feedback = coach.generate_feedback(enhanced_data)
                recording.ai_feedback = ai_feedback
            except Exception as e:
                print(f"AI feedback generation failed: {str(e)}")
                recording.ai_feedback = f"Analysis complete but AI feedback unavailable. Error: {str(e)}"

            recording.status = 'completed'
            recording.save()

            # Step 6: Award XP and Badges
            gamification_result = gamification.award_xp(
                recording.presentation,
                'completion',
                {'overall_score': recording.overall_score}
            )
            
            # Check for high score badges
            if recording.overall_score >= 90:
                gamification.award_xp(
                    recording.presentation,
                    'high_score_90',
                    {'overall_score': recording.overall_score}
                )
            
            if recording.overall_score >= 95:
                gamification.award_xp(
                    recording.presentation,
                    'high_score_95',
                    {'overall_score': recording.overall_score}
                )
            
            # Award improvement XP if improved
            if improvement > 0:
                gamification.award_xp(recording.presentation, 'improvement')

            print(f"Analysis completed for recording {recording.id}!")
            print(f"Gamification: {gamification_result}")

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


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing badges.
    """
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    
    @action(detail=False, methods=['get'])
    def by_presentation(self, request):
        """Get all badges for a specific presentation."""
        presentation_id = request.query_params.get('presentation_id')
        
        if not presentation_id:
            return Response(
                {'error': 'presentation_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        badges = Badge.objects.filter(presentation_id=presentation_id)
        serializer = self.get_serializer(badges, many=True)
        
        return Response(serializer.data)
