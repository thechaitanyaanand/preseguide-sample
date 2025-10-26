from ..models import Presentation, Recording, Badge
from typing import List, Dict


class GamificationService:
    """
    Handle XP rewards, level ups, and badge awards.
    """
    
    # XP Rewards
    XP_REWARDS = {
        'first_recording': 50,
        'recording_upload': 20,
        'completion': 30,
        'high_score_90': 50,
        'high_score_95': 75,
        'improvement': 25,
        'document_upload': 30,
    }
    
    def award_xp(self, presentation: Presentation, event: str, metadata: Dict = None) -> Dict:
        """
        Award XP for an event and check for level ups and badges.
        
        Returns:
            Dictionary with XP awarded, new level, and any badges earned
        """
        xp_amount = self.XP_REWARDS.get(event, 0)
        
        if xp_amount == 0:
            return {
                'xp_awarded': 0,
                'total_xp': presentation.total_xp,
                'level': presentation.current_level,
                'leveled_up': False,
                'badges_earned': []
            }
        
        old_level = presentation.current_level
        presentation.add_xp(xp_amount)
        new_level = presentation.current_level
        
        leveled_up = new_level > old_level
        
        # Check for badges
        badges_earned = self.check_and_award_badges(presentation, event, metadata)
        
        return {
            'xp_awarded': xp_amount,
            'total_xp': presentation.total_xp,
            'level': new_level,
            'old_level': old_level,
            'leveled_up': leveled_up,
            'level_name': presentation.get_level_name(),
            'badges_earned': badges_earned
        }
    
    def check_and_award_badges(self, presentation: Presentation, event: str, metadata: Dict = None) -> List[str]:
        """
        Check if any badges should be awarded based on the event.
        
        Returns:
            List of badge names that were just earned
        """
        badges_earned = []
        metadata = metadata or {}
        
        # First Recording Badge
        if event == 'first_recording':
            badge = self._award_badge(presentation, 'first_recording', {
                'message': 'Completed your first recording!'
            })
            if badge:
                badges_earned.append('first_recording')
        
        # First Completion Badge (first successful analysis)
        if event == 'completion':
            recordings_count = presentation.recordings.filter(status='completed').count()
            if recordings_count == 1:
                badge = self._award_badge(presentation, 'first_completion', {
                    'message': 'First successful analysis completed!'
                })
                if badge:
                    badges_earned.append('first_completion')
        
        # Perfectionist Badge (90+ score)
        if event in ['completion', 'high_score_90', 'high_score_95']:
            score = metadata.get('overall_score', 0)
            if score >= 90:
                badge = self._award_badge(presentation, 'perfectionist', {
                    'message': f'Achieved a score of {score:.1f}!',
                    'score': score
                })
                if badge:
                    badges_earned.append('perfectionist')
        
        # Five Recordings Badge
        recordings_count = presentation.recordings.count()
        if recordings_count >= 5:
            badge = self._award_badge(presentation, 'five_recordings', {
                'message': 'Completed 5 recordings!',
                'count': recordings_count
            })
            if badge:
                badges_earned.append('five_recordings')
        
        # Ten Recordings Badge
        if recordings_count >= 10:
            badge = self._award_badge(presentation, 'ten_recordings', {
                'message': 'Completed 10 recordings!',
                'count': recordings_count
            })
            if badge:
                badges_earned.append('ten_recordings')
        
        # Level Up Badge
        if presentation.current_level > 1:
            badge = self._award_badge(presentation, 'level_up', {
                'message': f'Reached level {presentation.current_level}!',
                'level': presentation.current_level
            })
            if badge:
                badges_earned.append('level_up')
        
        # Max Level Badge
        if presentation.current_level >= 5:
            badge = self._award_badge(presentation, 'max_level', {
                'message': 'Reached maximum level - Presentation Master!',
                'level': 5
            })
            if badge:
                badges_earned.append('max_level')
        
        return badges_earned
    
    def _award_badge(self, presentation: Presentation, badge_type: str, metadata: Dict) -> Badge:
        """
        Award a badge if it hasn't been earned yet.
        
        Returns:
            Badge object if newly created, None if already exists
        """
        badge, created = Badge.objects.get_or_create(
            presentation=presentation,
            badge_type=badge_type,
            defaults={'metadata': metadata}
        )
        
        return badge if created else None
    
    def calculate_improvement(self, current_recording: Recording) -> float:
        """
        Calculate improvement from previous recording.
        
        Returns:
            Percentage improvement (can be negative)
        """
        # Get previous recording
        previous = Recording.objects.filter(
            presentation=current_recording.presentation,
            status='completed',
            iteration_number__lt=current_recording.iteration_number
        ).order_by('-iteration_number').first()
        
        if not previous or previous.overall_score is None:
            return 0.0
        
        if current_recording.overall_score is None:
            return 0.0
        
        improvement = current_recording.overall_score - previous.overall_score
        return round(improvement, 1)
