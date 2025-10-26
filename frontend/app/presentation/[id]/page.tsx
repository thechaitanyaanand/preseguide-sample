'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { presentationsAPI, recordingsAPI } from '@/lib/api';
import type { Presentation, Recording, ProgressData, Question, Badge } from '@/types';

export default function PresentationPage() {
  const params = useParams();
  const presentationId = params.id as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'qa' | 'progress'>('analysis');
  const [generatingQA, setGeneratingQA] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  const loadPresentation = useCallback(async () => {
    try {
      const response = await presentationsAPI.get(presentationId);
      setPresentation(response.data);

      // Auto-select latest recording
      if (response.data.recordings.length > 0) {
        setSelectedRecording(response.data.recordings[0]);
      }
    } catch (error) {
      console.error('Error loading presentation:', error);
    }
  }, [presentationId]);

  const loadProgress = useCallback(async () => {
    try {
      const response = await presentationsAPI.getProgress(presentationId);
      setProgressData(response.data);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }, [presentationId]);

  useEffect(() => {
    loadPresentation();
    loadProgress();
  }, [loadPresentation, loadProgress]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      const response = await recordingsAPI.upload(presentationId, selectedFile);
      pollRecordingStatus(response.data.id);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Upload failed');
      setUploading(false);
    }
  };

  const pollRecordingStatus = async (recordingId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await recordingsAPI.get(recordingId);
        const recording = response.data;

        if (recording.status === 'completed') {
          clearInterval(interval);
          setUploading(false);
          setSelectedFile(null);
          loadPresentation();
          loadProgress();
          setSelectedRecording(recording);
        } else if (recording.status === 'failed') {
          clearInterval(interval);
          setUploading(false);
          alert('Analysis failed: ' + recording.error_message);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setUploading(false);
          alert('Analysis timeout');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
  };

  const handleGenerateQA = async () => {
    setGeneratingQA(true);
    try {
      await presentationsAPI.generateQA(presentationId);
      loadPresentation();
      setActiveTab('qa');
    } catch (error) {
      console.error('Error generating Q&A:', error);
      alert('Failed to generate Q&A');
    } finally {
      setGeneratingQA(false);
    }
  };

  if (!presentation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Gamification */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {presentation.title}
              </h1>
              {presentation.description && (
                <p className="text-gray-600 mt-2">{presentation.description}</p>
              )}
            </div>
            
            {/* Gamification Stats */}
            <div className="flex gap-4">
              <LevelCard presentation={presentation} />
              <XPCard presentation={presentation} />
            </div>
          </div>

          {/* Badges */}
          {presentation.badges.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Badges Earned
              </h3>
              <div className="flex flex-wrap gap-2">
                {presentation.badges.map((badge) => (
                  <BadgeDisplay key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          )}

          {/* Document Info */}
          {presentation.has_document && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span>📄</span>
                <span>Document uploaded - Content-aware coaching enabled</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <TabButton
              active={activeTab === 'analysis'}
              onClick={() => setActiveTab('analysis')}
              icon="🎤"
              label="Analysis"
            />
            <TabButton
              active={activeTab === 'qa'}
              onClick={() => setActiveTab('qa')}
              icon="❓"
              label="Q&A"
              badge={presentation.generated_questions.length}
            />
            <TabButton
              active={activeTab === 'progress'}
              onClick={() => setActiveTab('progress')}
              icon="📈"
              label="Progress"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'analysis' && (
          <AnalysisTab
            presentation={presentation}
            selectedRecording={selectedRecording}
            setSelectedRecording={setSelectedRecording}
            selectedFile={selectedFile}
            handleFileSelect={handleFileSelect}
            handleUpload={handleUpload}
            uploading={uploading}
          />
        )}

        {activeTab === 'qa' && (
          <QATab
            questions={presentation.generated_questions}
            onGenerate={handleGenerateQA}
            generating={generatingQA}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTab progressData={progressData} presentation={presentation} />
        )}
      </div>
    </div>
  );
}

// ============ COMPONENTS ============

function LevelCard({ presentation }: { presentation: Presentation }) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 min-w-[140px]">
      <div className="text-xs font-medium text-purple-700 mb-1">Level</div>
      <div className="text-3xl font-bold text-purple-900">
        {presentation.current_level}
      </div>
      <div className="text-xs text-purple-700 mt-1">
        {presentation.level_name}
      </div>
    </div>
  );
}

function XPCard({ presentation }: { presentation: Presentation }) {
  const progress = presentation.current_level >= 5 
    ? 100 
    : ((presentation.total_xp % 100) / 100) * 100;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 min-w-[140px]">
      <div className="text-xs font-medium text-blue-700 mb-1">XP</div>
      <div className="text-3xl font-bold text-blue-900">
        {presentation.total_xp}
      </div>
      <div className="mt-2">
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-blue-700 mt-1">
          {presentation.current_level >= 5 
            ? 'Max Level!' 
            : `${presentation.xp_to_next_level} XP to next level`}
        </div>
      </div>
    </div>
  );
}

function BadgeDisplay({ badge }: { badge: Badge }) {
  const badgeEmojis: Record<string, string> = {
    first_recording: '🎬',
    first_completion: '✅',
    perfectionist: '💯',
    five_recordings: '5️⃣',
    ten_recordings: '🔟',
    level_up: '⬆️',
    max_level: '👑',
    improvement_streak: '🔥',
  };

  return (
    <div
      className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium"
      title={badge.badge_name}
    >
      <span>{badgeEmojis[badge.badge_type] || '🏆'}</span>
      <span>{badge.badge_name}</span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
        active
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

// ============ TAB COMPONENTS ============

function AnalysisTab({
  presentation,
  selectedRecording,
  setSelectedRecording,
  selectedFile,
  handleFileSelect,
  handleUpload,
  uploading,
}: {
  presentation: Presentation;
  selectedRecording: Recording | null;
  setSelectedRecording: (recording: Recording) => void;
  selectedFile: File | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
  uploading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Upload Section */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Recording</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio File (MP3, WAV, M4A)
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {selectedFile && (
              <div className="text-sm text-gray-600">
                <p>Selected: {selectedFile.name}</p>
                <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Analyzing...' : 'Upload & Analyze'}
            </button>

            {uploading && (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600 mt-2">
                  Analyzing your presentation... This may take 1-2 minutes.
                </p>
              </div>
            )}
          </div>

          {/* Recordings List */}
          <div className="mt-8">
            <h3 className="font-semibold mb-3">Recordings History</h3>
            {presentation.recordings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No recordings yet. Upload your first one!
              </p>
            ) : (
              <div className="space-y-2">
                {presentation.recordings.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => setSelectedRecording(rec)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      selectedRecording?.id === rec.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Iteration #{rec.iteration_number}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          rec.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : rec.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                    {rec.overall_score !== null && (
                      <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                        <span>Score: {rec.overall_score.toFixed(1)}/100</span>
                        {rec.improvement_from_previous !== null && (
                          <span
                            className={
                              rec.improvement_from_previous > 0
                                ? 'text-green-600'
                                : rec.improvement_from_previous < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }
                          >
                            {rec.improvement_percentage}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Analysis Results */}
      <div className="lg:col-span-2">
        {selectedRecording && selectedRecording.status === 'completed' ? (
          <RecordingAnalysis recording={selectedRecording} />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🎤</div>
            <p className="text-gray-500 text-lg">
              Upload a recording to see analysis results
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Your AI coach is ready to help you improve!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecordingAnalysis({ recording }: { recording: Recording }) {
  return (
    <div className="space-y-6">
      {/* Scores */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Performance Scores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScoreCard
            label="Overall"
            score={recording.overall_score || 0}
            color="blue"
          />
          <ScoreCard
            label="Pacing"
            score={recording.pacing_score || 0}
            color="green"
          />
          <ScoreCard
            label="Clarity"
            score={recording.clarity_score || 0}
            color="purple"
          />
          {recording.content_coverage_score !== null && (
            <ScoreCard
              label="Coverage"
              score={recording.content_coverage_score}
              color="orange"
            />
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Duration"
            value={`${(recording.duration_seconds || 0).toFixed(1)}s`}
          />
          <MetricCard
            label="Total Words"
            value={recording.total_words.toString()}
          />
          <MetricCard
            label="Words/Min"
            value={(recording.words_per_minute || 0).toFixed(1)}
          />
          <MetricCard
            label="Filler Words"
            value={recording.filler_word_count.toString()}
          />
        </div>
      </div>

      {/* Improvement Badge */}
      {recording.improvement_from_previous !== null && (
        <div
          className={`rounded-lg p-4 ${
            recording.improvement_from_previous > 0
              ? 'bg-green-50 border-2 border-green-200'
              : recording.improvement_from_previous < 0
              ? 'bg-red-50 border-2 border-red-200'
              : 'bg-gray-50 border-2 border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {recording.improvement_from_previous > 0
                ? '📈'
                : recording.improvement_from_previous < 0
                ? '📉'
                : '➡️'}
            </span>
            <div>
              <div className="font-semibold">
                {recording.improvement_from_previous > 0
                  ? 'Improvement!'
                  : recording.improvement_from_previous < 0
                  ? 'Decline'
                  : 'No Change'}
              </div>
              <div className="text-sm text-gray-600">
                {recording.improvement_percentage} from previous iteration
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missed Key Points */}
      {recording.missed_key_points && recording.missed_key_points.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            ⚠️ Missed Key Points
          </h2>
          <div className="space-y-2">
            {recording.missed_key_points.map((point, index) => (
              <div
                key={index}
                className="p-3 bg-orange-50 rounded-lg border border-orange-200"
              >
                <p className="text-sm text-gray-700">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filler Words Breakdown */}
      {recording.filler_words_list.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Filler Words Detected
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recording.filler_words_list.slice(0, 20).map((filler, index) => (
              <div
                key={index}
                className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-yellow-800">
                    {`"${filler.word}"`}
                  </span>
                  <span className="text-xs text-gray-500">
                    Position: {filler.position}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  ...{filler.context}...
                </p>
              </div>
            ))}
          </div>
          {recording.filler_words_list.length > 20 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Showing 20 of {recording.filler_words_list.length} filler words
            </p>
          )}
        </div>
      )}

      {/* AI Feedback */}
      {recording.ai_feedback && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            🤖 AI Coach Feedback
          </h2>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {recording.ai_feedback}
            </pre>
          </div>
        </div>
      )}

      {/* Transcription */}
      {recording.transcription && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Full Transcription</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 leading-relaxed">
              {recording.transcription}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function QATab({
  questions,
  onGenerate,
  generating,
}: {
  questions: Question[];
  onGenerate: () => void;
  generating: boolean;
}) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Q&A Preparation</h2>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : questions.length > 0 ? 'Regenerate' : 'Generate Q&A'}
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❓</div>
            <p className="text-gray-500 text-lg mb-4">
              No questions generated yet
            </p>
            <p className="text-gray-400 text-sm">
              Click the button above to generate potential audience questions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div
                key={index}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 flex-1">
                    {index + 1}. {q.question}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(
                      q.difficulty
                    )}`}
                  >
                    {q.difficulty}
                  </span>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg mt-2">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Answer Framework:
                  </p>
                  <p className="text-sm text-blue-800">{q.answer_framework}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressTab({
  progressData,
  presentation,
}: {
  progressData: ProgressData | null;
  presentation: Presentation;
}) {
  if (!progressData || !progressData.has_recordings) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="text-6xl mb-4">📈</div>
        <p className="text-gray-500 text-lg">
          No progress data yet
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Complete at least one recording to see your progress
        </p>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '❓';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">Total Recordings</div>
          <div className="text-3xl font-bold text-gray-900">
            {progressData.total_recordings}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">Average Score</div>
          <div className="text-3xl font-bold text-blue-600">
            {progressData.average_score.toFixed(1)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">Best Score</div>
          <div className="text-3xl font-bold text-green-600">
            {progressData.best_score.toFixed(1)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 mb-1">Trend</div>
          <div className={`text-3xl font-bold ${getTrendColor(progressData.improvement_trend)}`}>
            {getTrendIcon(progressData.improvement_trend)}
          </div>
        </div>
      </div>

      {/* Score History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Score History</h2>
        <div className="space-y-2">
          {progressData.scores_history.map((entry) => (
            <div
              key={entry.iteration}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="font-semibold text-gray-700">
                  Iteration #{entry.iteration}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {entry.score.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Level Progress */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Level Progress</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((level) => {
            const levelNames = [
              'First Words',
              'Finding Voice',
              'Building Confidence',
              'Commanding Presence',
              'Presentation Master',
            ];
            const isCompleted = presentation.current_level > level;
            const isCurrent = presentation.current_level === level;

            return (
              <div
                key={level}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  isCompleted
                    ? 'bg-green-50 border-2 border-green-200'
                    : isCurrent
                    ? 'bg-blue-50 border-2 border-blue-400'
                    : 'bg-gray-50 border-2 border-gray-200'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {isCompleted ? '✓' : level}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{levelNames[level - 1]}</div>
                  <div className="text-sm text-gray-600">
                    {level * 100} XP required
                  </div>
                </div>
                {isCurrent && (
                  <div className="text-sm text-blue-600 font-medium">
                    Current Level
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ UTILITY COMPONENTS ============

interface ScoreCardProps {
  label: string;
  score: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function ScoreCard({ label, score, color }: ScoreCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
  }[color];

  return (
    <div className={`${colorClasses} rounded-lg p-4 text-center`}>
      <div className="text-3xl font-bold">{score.toFixed(1)}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}
