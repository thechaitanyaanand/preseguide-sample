from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
import os
from typing import Dict, List
import json


class QAGenerator:
    """
    Generate Q&A based on presentation content using AI.
    """

    def __init__(self):
        """Initialize the Q&A generator with Gemini API."""
        api_key = os.getenv('GEMINI_API_KEY')
        
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=api_key,
            temperature=0.8,
        )

    def generate_questions(self, presentation_data: Dict) -> List[Dict]:
        """
        Generate potential Q&A based on presentation content.
        
        Args:
            presentation_data: Dict with title, description, document_text, etc.
            
        Returns:
            List of Q&A dictionaries
        """
        try:
            prompt = self._create_qa_prompt(presentation_data)
            
            messages = [
                SystemMessage(content="You are an expert at anticipating audience questions for presentations. Generate thoughtful, realistic questions that an audience might ask, along with suggested answer frameworks. Focus on clarity, relevance, and helping the presenter prepare thoroughly."),
                HumanMessage(content=prompt)
            ]

            response = self.llm.invoke(messages)
            
            # Parse the response into structured Q&A
            qa_list = self._parse_qa_response(response.content)
            
            return qa_list

        except Exception as e:
            print(f"Error generating Q&A: {str(e)}")
            return self._generate_fallback_questions(presentation_data)

    def _create_qa_prompt(self, data: Dict) -> str:
        """Create prompt for Q&A generation."""
        title = data.get('title', 'Untitled')
        description = data.get('description', '')
        document_text = data.get('document_text', '')
        
        # Truncate document text if too long
        if len(document_text) > 2000:
            document_text = document_text[:2000] + "..."
        
        content_section = document_text if document_text else "No document provided - generate general questions based on the title and description."
        
        prompt = f"""Generate 8-10 realistic questions that an audience might ask after this presentation:

PRESENTATION TITLE: {title}

DESCRIPTION: {description}

CONTENT OVERVIEW:
{content_section}

For each question, provide:
1. The question itself
2. A brief answer framework (2-3 sentences on how to approach answering it)
3. Difficulty level (easy, medium, hard)

Format your response as a JSON array. Return ONLY the JSON array, no additional text.

Example format:
[
  {{"question": "What is the main goal?", "answer_framework": "Explain the objective clearly.", "difficulty": "easy"}},
  {{"question": "How will you measure success?", "answer_framework": "Define metrics and KPIs.", "difficulty": "medium"}}
]

Focus on questions about clarifications, implementation details, challenges, impact, timeline, and resources."""
        
        return prompt

    def _parse_qa_response(self, response_text: str) -> List[Dict]:
        """Parse AI response into structured Q&A list."""
        try:
            response_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):  # <-- The colon was added here
                lines = response_text.split('\n')
                if len(lines) > 2:
                    response_text = '\n'.join(lines[1:-1])
            
            # Parse JSON
            qa_list = json.loads(response_text)
            
            # Validate structure
            if isinstance(qa_list, list):
                validated_qa = []
                for qa in qa_list:
                    if isinstance(qa, dict) and 'question' in qa:
                        validated_qa.append({
                            'question': qa.get('question', ''),
                            'answer_framework': qa.get('answer_framework', ''),
                            'difficulty': qa.get('difficulty', 'medium')
                        })
                return validated_qa
            
            return []
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {str(e)}")
            return []
        except Exception as e:
            print(f"Error parsing Q&A response: {str(e)}")
            return []

    def _generate_fallback_questions(self, data: Dict) -> List[Dict]:
        """Generate basic questions if AI fails."""
        title = data.get('title', 'this topic')
        
        return [
            {
                'question': f'What is the main objective of {title}?',
                'answer_framework': 'Clearly state the primary goal and its importance. Explain why this matters to the audience and what success looks like.',
                'difficulty': 'easy'
            },
            {
                'question': 'What are the key challenges you anticipate?',
                'answer_framework': 'List 2-3 main challenges and explain your mitigation strategies. Be honest about risks while showing you have thought through solutions.',
                'difficulty': 'medium'
            },
            {
                'question': 'What timeline are you working with?',
                'answer_framework': 'Provide a high-level timeline with key milestones. Break it down into phases if applicable and mention any dependencies.',
                'difficulty': 'easy'
            },
            {
                'question': 'How will you measure success?',
                'answer_framework': 'Define specific metrics and success criteria. Explain how you will track progress and when results will be evaluated.',
                'difficulty': 'medium'
            },
            {
                'question': 'What resources will be required?',
                'answer_framework': 'Break down human, financial, and technical resources needed. Explain how resources will be allocated and any budget considerations.',
                'difficulty': 'medium'
            },
            {
                'question': 'How does this align with broader organizational goals?',
                'answer_framework': 'Connect your presentation to larger strategic objectives. Show how this work supports the bigger picture and creates value.',
                'difficulty': 'medium'
            },
            {
                'question': 'What are the potential risks and how will you address them?',
                'answer_framework': 'Identify top 3-5 risks with their likelihood and impact. Explain your risk mitigation plan and contingency strategies.',
                'difficulty': 'hard'
            },
            {
                'question': 'Who are the key stakeholders and how will they be involved?',
                'answer_framework': 'List primary stakeholders and their roles. Explain your communication and engagement plan throughout the project.',
                'difficulty': 'medium'
            }
        ]