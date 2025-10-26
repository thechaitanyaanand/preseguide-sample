from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
import os
from typing import Dict


class AICoach:
    """
    AI-powered presentation coach using LangChain + Google Gemini.
    Provides personalized feedback and coaching tips.
    """

    def __init__(self):
        """Initialize the AI coach with Gemini API."""
        api_key = os.getenv('GEMINI_API_KEY')
        
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not found in environment variables. "
                "Get your free API key from https://makersuite.google.com/app/apikey"
            )

        # Initialize Gemini model (free tier available)
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=api_key,
            temperature=0.7,
        )

    def generate_feedback(self, analysis_data: Dict) -> str:
        """
        Generate comprehensive feedback based on audio analysis.
        
        Args:
            analysis_data: Dictionary containing analysis results
            
        Returns:
            AI-generated feedback text
        """
        # Create the coaching prompt
        prompt = self._create_coaching_prompt(analysis_data)

        try:
            # Use LangChain to generate response
            messages = [
                SystemMessage(content=(
                    "You are an expert presentation coach with 20+ years of experience. "
                    "You provide constructive, actionable, and encouraging feedback. "
                    "Focus on specific improvements while highlighting strengths. "
                    "Keep your feedback structured and easy to follow."
                )),
                HumanMessage(content=prompt)
            ]

            response = self.llm.invoke(messages)
            return response.content

        except Exception as e:
            print(f"Error generating AI feedback: {str(e)}")
            return self._generate_fallback_feedback(analysis_data)

    def _create_coaching_prompt(self, data: Dict) -> str:
        """Create a detailed prompt for the AI coach."""
        prompt = f"""
Please analyze this presentation recording and provide detailed coaching feedback:

**RECORDING DETAILS:**
- Duration: {data.get('duration_seconds', 0):.1f} seconds
- Total Words: {data.get('total_words', 0)}
- Words Per Minute: {data.get('words_per_minute', 0):.1f} WPM
- Filler Words Detected: {data.get('filler_word_count', 0)}

**SCORES:**
- Pacing Score: {data.get('pacing_score', 0):.1f}/100
- Clarity Score: {data.get('clarity_score', 0):.1f}/100
- Overall Score: {data.get('overall_score', 0):.1f}/100

**COMMON FILLER WORDS USED:**
{self._format_filler_words(data.get('filler_words_list', []))}

**TRANSCRIPTION EXCERPT:**
{self._get_transcription_excerpt(data.get('transcription', ''))}

Based on this data, please provide:

1. **Overall Assessment** (2-3 sentences about their performance)

2. **Strengths** (What they did well)

3. **Areas for Improvement** (Specific issues to address)

4. **Actionable Tips** (3-5 concrete steps they can take to improve)

5. **Next Practice Focus** (What to focus on in their next recording)

Format your response in clear sections with bullet points where appropriate.
Be encouraging but honest. Focus on growth and improvement.
"""
        return prompt

    def _format_filler_words(self, filler_words: list) -> str:
        """Format filler words list for the prompt."""
        if not filler_words:
            return "None detected - Excellent!"

        # Count occurrences of each filler word
        filler_counts = {}
        for filler in filler_words:
            word = filler.get('word', '')
            filler_counts[word] = filler_counts.get(word, 0) + 1

        # Sort by frequency
        sorted_fillers = sorted(
            filler_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # Format as list
        lines = []
        for word, count in sorted_fillers[:10]:  # Top 10
            lines.append(f"  - '{word}': {count} times")

        return "\n".join(lines) if lines else "None detected"

    def _get_transcription_excerpt(self, transcription: str, max_length: int = 500) -> str:
        """Get an excerpt of the transcription for context."""
        if not transcription:
            return "No transcription available"

        if len(transcription) <= max_length:
            return transcription

        return transcription[:max_length] + "... [truncated]"

    def _generate_fallback_feedback(self, data: Dict) -> str:
        """Generate basic feedback if AI fails."""
        wpm = data.get('words_per_minute', 0)
        filler_count = data.get('filler_word_count', 0)
        overall_score = data.get('overall_score', 0)

        feedback = f"""
## Overall Assessment

Your presentation scored {overall_score:.1f}/100. Here's a breakdown of your performance:

## Pacing Analysis

You spoke at {wpm:.1f} words per minute. 
"""

        if 120 <= wpm <= 150:
            feedback += "This is an excellent pace - clear and easy to follow! ✓"
        elif wpm < 120:
            feedback += "Consider speaking a bit faster to maintain audience engagement."
        else:
            feedback += "Try slowing down slightly to ensure clarity and comprehension."

        feedback += f"""

## Clarity Analysis

You used {filler_count} filler words in your presentation.
"""

        if filler_count < 5:
            feedback += "Excellent control of filler words! Your speech is very clear. ✓"
        elif filler_count < 15:
            feedback += "Good job! A few filler words are normal, but try to reduce them further."
        else:
            feedback += "Focus on reducing filler words. Practice pausing instead of using fillers."

        feedback += """

## Action Steps

1. Record yourself practicing and review the playback
2. Practice pausing briefly instead of using filler words
3. Focus on maintaining consistent pacing throughout
4. Work on confidence through repeated practice

Keep practicing - you're making progress!
"""

        return feedback
