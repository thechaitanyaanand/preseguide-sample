import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import FileExtensionValidator


class Presentation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Document upload for context
    document_file = models.FileField(
        upload_to='documents/%Y/%m/%d/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'pptx', 'ppt'])]
    )
    document_extracted_text = models.TextField(blank=True, null=True)
    document_key_points = models.JSONField(default=list, blank=True)
    
    # Gamification
    total_xp = models.IntegerField(default=0)
    current_level = models.IntegerField(default=1)
    
    # Q&A
    generated_questions = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
    
    def add_xp(self, amount):
        """Add XP and level up if needed."""
        self.total_xp += amount
        self.current_level = self.calculate_level(self.total_xp)
        self.save()
        return self.current_level
    
    @staticmethod
    def calculate_level(xp):
        """Calculate level based on XP (100 XP per level)."""
        return max(1, min(5, (xp // 100) + 1))
    
    def get_level_name(self):
        """Get the name of the current level."""
        level_names = {
            1: "First Words",
            2: "Finding Voice",
            3: "Building Confidence",
            4: "Commanding Presence",
            5: "Presentation Master"
        }
        return level_names.get(self.current_level, "First Words")
    
    def xp_for_next_level(self):
        """Calculate XP needed for next level."""
        if self.current_level >= 5:
            return 0
        return (self.current_level * 100) - self.total_xp


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
    
    # Iteration tracking
    iteration_number = models.IntegerField(default=1)

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
    
    # Content alignment (if document uploaded)
    content_coverage_score = models.FloatField(null=True, blank=True)  # 0-100
    missed_key_points = models.JSONField(default=list, blank=True)
    
    # Improvement tracking
    improvement_from_previous = models.FloatField(null=True, blank=True)  # percentage
    
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.presentation.title} - Recording {self.iteration_number}"
    
    def save(self, *args, **kwargs):
        # Auto-increment iteration number
        if not self.iteration_number:
            last_recording = Recording.objects.filter(
                presentation=self.presentation
            ).order_by('-iteration_number').first()
            
            if last_recording:
                self.iteration_number = last_recording.iteration_number + 1
            else:
                self.iteration_number = 1
        
        super().save(*args, **kwargs)


class Badge(models.Model):
    """Achievement badges for gamification."""
    BADGE_TYPES = [
        ('first_recording', 'First Recording'),
        ('first_completion', 'First Completion'),
        ('perfectionist', 'Perfectionist (90+ score)'),
        ('five_recordings', '5 Recordings'),
        ('ten_recordings', '10 Recordings'),
        ('level_up', 'Level Up'),
        ('max_level', 'Max Level'),
        ('improvement_streak', 'Improvement Streak'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    presentation = models.ForeignKey(
        Presentation,
        related_name='badges',
        on_delete=models.CASCADE
    )
    badge_type = models.CharField(max_length=50, choices=BADGE_TYPES)
    earned_at = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-earned_at']
        unique_together = ['presentation', 'badge_type']
    
    def __str__(self):
        return f"{self.presentation.title} - {self.get_badge_type_display()}"
