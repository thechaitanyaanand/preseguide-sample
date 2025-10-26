export interface FillerWord {
  word: string;
  position: number;
  context: string;
}

export interface Recording {
  id: string;
  presentation: string;
  audio_file: string;
  audio_file_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  iteration_number: number;
  transcription: string | null;
  duration_seconds: number | null;
  filler_word_count: number;
  filler_words_list: FillerWord[];
  words_per_minute: number | null;
  total_words: number;
  ai_feedback: string | null;
  clarity_score: number | null;
  pacing_score: number | null;
  overall_score: number | null;
  content_coverage_score: number | null;
  missed_key_points: string[];
  improvement_from_previous: number | null;
  improvement_percentage: string;
  error_message: string | null;
}

export interface Badge {
  id: string;
  badge_type: string;
  badge_name: string;
  earned_at: string;
  metadata: Record<string, unknown>;
}

export interface Question {
  question: string;
  answer_framework: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Presentation {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  document_file: string | null;
  document_file_url: string | null;
  has_document: boolean;
  document_key_points: string[];
  total_xp: number;
  current_level: number;
  level_name: string;
  xp_to_next_level: number;
  generated_questions: Question[];
  recordings: Recording[];
  recordings_count: number;
  latest_recording: Recording | null;
  badges: Badge[];
}

export interface ProgressData {
  has_recordings: boolean;
  total_recordings: number;
  current_iteration: number;
  average_score: number;
  best_score: number;
  latest_score: number;
  improvement_trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  scores_history: Array<{
    iteration: number;
    score: number;
    date: string;
  }>;
}
