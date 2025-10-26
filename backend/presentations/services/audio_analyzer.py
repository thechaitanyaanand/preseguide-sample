import whisper
import librosa
import numpy as np
from pydub import AudioSegment
from typing import Dict, List, Tuple
import re
import os


class AudioAnalyzer:
    """
    Analyzes audio files for transcription, filler words, and pacing.
    Uses OpenAI Whisper for speech-to-text (completely free, local).
    """

    # Common filler words to detect
    FILLER_WORDS = [
        'um', 'uh', 'umm', 'uhh', 'erm', 'err',
        'like', 'you know', 'i mean', 'sort of', 'kind of',
        'basically', 'actually', 'literally', 'right',
        'okay', 'so', 'well', 'hmm', 'ah', 'oh'
    ]

    def __init__(self):
        """Initialize the audio analyzer with Whisper model."""
        print("Loading Whisper model... (this may take a moment on first run)")
        # Using 'base' model for balance of speed and accuracy
        # Options: tiny, base, small, medium, large
        self.model = whisper.load_model("base")
        print("Whisper model loaded successfully!")

    def analyze_audio(self, audio_file_path: str) -> Dict:
        """
        Main method to analyze an audio file.
        
        Args:
            audio_file_path: Path to the audio file
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Step 1: Get audio duration
            duration = self.get_audio_duration(audio_file_path)

            # Step 2: Transcribe audio using Whisper
            print("Transcribing audio...")
            transcription_result = self.model.transcribe(audio_file_path)
            transcription = transcription_result['text']
            print(f"Transcription complete! Length: {len(transcription)} characters")

            # Step 3: Detect filler words
            filler_words, filler_count = self.detect_filler_words(transcription)

            # Step 4: Calculate pacing (words per minute)
            total_words = len(transcription.split())
            words_per_minute = self.calculate_wpm(total_words, duration)

            # Step 5: Calculate scores
            pacing_score = self.calculate_pacing_score(words_per_minute)
            clarity_score = self.calculate_clarity_score(filler_count, total_words)

            return {
                'success': True,
                'transcription': transcription,
                'duration_seconds': duration,
                'total_words': total_words,
                'filler_words_list': filler_words,
                'filler_word_count': filler_count,
                'words_per_minute': words_per_minute,
                'pacing_score': pacing_score,
                'clarity_score': clarity_score,
                'overall_score': (pacing_score + clarity_score) / 2,
            }

        except Exception as e:
            print(f"Error analyzing audio: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_audio_duration(self, audio_file_path: str) -> float:
        """Get duration of audio file in seconds."""
        try:
            audio = AudioSegment.from_file(audio_file_path)
            return len(audio) / 1000.0  # Convert milliseconds to seconds
        except:
            # Fallback to librosa if pydub fails
            y, sr = librosa.load(audio_file_path, sr=None)
            return librosa.get_duration(y=y, sr=sr)

    def detect_filler_words(self, transcription: str) -> Tuple[List[Dict], int]:
        """
        Detect filler words in the transcription.
        
        Returns:
            Tuple of (list of filler word occurrences, total count)
        """
        transcription_lower = transcription.lower()
        found_fillers = []

        for filler in self.FILLER_WORDS:
            # Use word boundaries to avoid false positives
            pattern = r'\b' + re.escape(filler) + r'\b'
            matches = list(re.finditer(pattern, transcription_lower))
            
            for match in matches:
                found_fillers.append({
                    'word': filler,
                    'position': match.start(),
                    'context': self.get_context(transcription, match.start())
                })

        # Sort by position
        found_fillers.sort(key=lambda x: x['position'])

        return found_fillers, len(found_fillers)

    def get_context(self, text: str, position: int, context_length: int = 50) -> str:
        """Get surrounding context for a filler word."""
        start = max(0, position - context_length)
        end = min(len(text), position + context_length)
        return text[start:end].strip()

    def calculate_wpm(self, total_words: int, duration_seconds: float) -> float:
        """Calculate words per minute."""
        if duration_seconds == 0:
            return 0
        minutes = duration_seconds / 60
        return round(total_words / minutes, 2)

    def calculate_pacing_score(self, wpm: float) -> float:
        """
        Calculate pacing score (0-100).
        Ideal presentation pace: 120-150 WPM
        """
        if wpm == 0:
            return 0

        # Optimal range
        if 120 <= wpm <= 150:
            return 100.0
        elif 100 <= wpm < 120:
            # Slightly slow
            return 80 + (wpm - 100) * 1.0  # 80-100 score
        elif 150 < wpm <= 180:
            # Slightly fast
            return 100 - (wpm - 150) * 0.67  # 80-100 score
        elif wpm < 100:
            # Too slow
            return max(50, wpm * 0.8)
        else:
            # Too fast (>180)
            return max(40, 100 - (wpm - 150) * 0.5)

    def calculate_clarity_score(self, filler_count: int, total_words: int) -> float:
        """
        Calculate clarity score (0-100) based on filler word density.
        """
        if total_words == 0:
            return 0

        filler_density = (filler_count / total_words) * 100

        # Less than 2% filler words = excellent
        if filler_density < 2:
            return 100.0
        # 2-5% = good
        elif filler_density < 5:
            return 90 - (filler_density - 2) * 3.33  # 90-100 range
        # 5-10% = acceptable
        elif filler_density < 10:
            return 70 - (filler_density - 5) * 4  # 70-90 range
        # >10% = needs improvement
        else:
            return max(40, 70 - (filler_density - 10) * 3)
