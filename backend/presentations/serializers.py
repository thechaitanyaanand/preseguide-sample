from rest_framework import serializers
from .models import Presentation, Recording, Badge


class BadgeSerializer(serializers.ModelSerializer):
    badge_name = serializers.CharField(source='get_badge_type_display', read_only=True)
    
    class Meta:
        model = Badge
        fields = ['id', 'badge_type', 'badge_name', 'earned_at', 'metadata']
        read_only_fields = ['id', 'earned_at']


class RecordingSerializer(serializers.ModelSerializer):
    audio_file_url = serializers.SerializerMethodField()
    improvement_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Recording
        fields = [
            'id', 'presentation', 'audio_file', 'audio_file_url', 'status',
            'created_at', 'iteration_number', 'transcription', 'duration_seconds',
            'filler_word_count', 'filler_words_list', 'words_per_minute',
            'total_words', 'ai_feedback', 'clarity_score', 'pacing_score',
            'overall_score', 'content_coverage_score', 'missed_key_points',
            'improvement_from_previous', 'improvement_percentage', 'error_message'
        ]
        read_only_fields = [
            'id', 'status', 'created_at', 'iteration_number', 'transcription',
            'duration_seconds', 'filler_word_count', 'filler_words_list',
            'words_per_minute', 'total_words', 'ai_feedback', 'clarity_score',
            'pacing_score', 'overall_score', 'content_coverage_score',
            'missed_key_points', 'improvement_from_previous', 'error_message'
        ]

    def get_audio_file_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
        return None
    
    def get_improvement_percentage(self, obj):
        if obj.improvement_from_previous is not None:
            return f"{obj.improvement_from_previous:+.1f}%"
        return "N/A"


class PresentationSerializer(serializers.ModelSerializer):
    recordings = RecordingSerializer(many=True, read_only=True)
    badges = BadgeSerializer(many=True, read_only=True)
    recordings_count = serializers.SerializerMethodField()
    latest_recording = serializers.SerializerMethodField()
    level_name = serializers.CharField(source='get_level_name', read_only=True)
    xp_to_next_level = serializers.IntegerField(source='xp_for_next_level', read_only=True)
    document_file_url = serializers.SerializerMethodField()
    has_document = serializers.SerializerMethodField()

    class Meta:
        model = Presentation
        fields = [
            'id', 'title', 'description', 'created_at', 'updated_at',
            'document_file', 'document_file_url', 'has_document',
            'document_key_points', 'total_xp', 'current_level', 'level_name',
            'xp_to_next_level', 'generated_questions', 'recordings',
            'recordings_count', 'latest_recording', 'badges'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'document_extracted_text',
            'document_key_points', 'total_xp', 'current_level',
            'generated_questions'
        ]

    def get_recordings_count(self, obj):
        return obj.recordings.count()

    def get_latest_recording(self, obj):
        latest = obj.recordings.filter(status='completed').first()
        if latest:
            return RecordingSerializer(latest, context=self.context).data
        return None
    
    def get_document_file_url(self, obj):
        if obj.document_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document_file.url)
        return None
    
    def get_has_document(self, obj):
        return bool(obj.document_file)
