import uuid
from django.db import models
from django.utils import timezone

class Presentation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Recording(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    presentation = models.ForeignKey(
        Presentation,
        related_name='recordings',
        on_delete=models.CASCADE
    )
    audio_file = models.FileField(upload_to='recordings/%Y/%m/%d/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(default=timezone.now)

    # Analysis results
    transcription = models.TextField(blank=True, null=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    
    # Metrics
    filler_word_count = models.IntegerField(default=0)
    filler_words_list = models.JSONField(default=list, blank=True)
    words_per_minute = models.FloatField(null=True, blank=True)
    total_words = models.IntegerField(default=0)
    
    # AI Feedback
    ai_feedback = models.TextField(blank=True, null=True)
    clarity_score = models.FloatField(null=True, blank=True)  # 0-100
    pacing_score = models.FloatField(null=True, blank=True)   # 0-100
    overall_score = models.FloatField(null=True, blank=True)  # 0-100
    
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.presentation.title} - Recording {self.created_at.strftime('%Y-%m-%d %H:%M')}"
