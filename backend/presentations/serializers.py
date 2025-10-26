from rest_framework import serializers
from .models import Presentation, Recording


class RecordingSerializer(serializers.ModelSerializer):
    audio_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Recording
        fields = [
            'id', 'presentation', 'audio_file', 'audio_file_url', 'status',
            'created_at', 'transcription', 'duration_seconds',
            'filler_word_count', 'filler_words_list', 'words_per_minute',
            'total_words', 'ai_feedback', 'clarity_score', 'pacing_score',
            'overall_score', 'error_message'
        ]
        read_only_fields = [
            'id', 'status', 'created_at', 'transcription', 'duration_seconds',
            'filler_word_count', 'filler_words_list', 'words_per_minute',
            'total_words', 'ai_feedback', 'clarity_score', 'pacing_score',
            'overall_score', 'error_message'
        ]

    def get_audio_file_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
        return None


class PresentationSerializer(serializers.ModelSerializer):
    recordings = RecordingSerializer(many=True, read_only=True)
    recordings_count = serializers.SerializerMethodField()
    latest_recording = serializers.SerializerMethodField()

    class Meta:
        model = Presentation
        fields = [
            'id', 'title', 'description', 'created_at', 'updated_at',
            'recordings', 'recordings_count', 'latest_recording'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_recordings_count(self, obj):
        return obj.recordings.count()

    def get_latest_recording(self, obj):
        latest = obj.recordings.filter(status='completed').first()
        if latest:
            return RecordingSerializer(latest, context=self.context).data
        return None
