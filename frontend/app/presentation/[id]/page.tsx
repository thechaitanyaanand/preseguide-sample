'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { presentationsAPI, recordingsAPI } from '@/lib/api';

interface Presentation {
  id: string;
  title: string;
  description: string;
  recordings: Recording[];
}

interface FillerWord {
  word: string;
  position: number;
  context: string;
}

interface Recording {
  id: string;
  status: string;
  transcription: string;
  duration_seconds: number;
  total_words: number;
  filler_word_count: number;
  words_per_minute: number;
  pacing_score: number;
  clarity_score: number;
  overall_score: number;
  ai_feedback: string;
  filler_words_list: FillerWord[];
  created_at: string;
}

export default function PresentationPage() {
  const params = useParams();
  const presentationId = params.id as string;

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(
    null
  );

  // Use useCallback to memoize the function and fix the dependency warning
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

  useEffect(() => {
    loadPresentation();
  }, [loadPresentation]);

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
      
      // Poll for completion
      pollRecordingStatus(response.data.id);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Upload failed');
      setUploading(false);
    }
  };

  const pollRecordingStatus = async (recordingId: string) => {
    const maxAttempts = 60; // 5 minutes max
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
          loadPresentation(); // Refresh
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
    }, 5000); // Poll every 5 seconds
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
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {presentation.title}
          </h1>
          {presentation.description && (
            <p className="text-gray-600 mt-2">{presentation.description}</p>
          )}
        </div>

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
                <h3 className="font-semibold mb-3">Previous Recordings</h3>
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
                            {new Date(rec.created_at).toLocaleDateString()}
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
                          <div className="text-sm text-gray-600 mt-1">
                            Score: {rec.overall_score.toFixed(1)}/100
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
            {selectedRecording ? (
              <div className="space-y-6">
                {/* Scores */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Performance Scores</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <ScoreCard
                      label="Overall"
                      score={selectedRecording.overall_score}
                      color="blue"
                    />
                    <ScoreCard
                      label="Pacing"
                      score={selectedRecording.pacing_score}
                      color="green"
                    />
                    <ScoreCard
                      label="Clarity"
                      score={selectedRecording.clarity_score}
                      color="purple"
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      label="Duration"
                      value={`${selectedRecording.duration_seconds.toFixed(1)}s`}
                    />
                    <MetricCard
                      label="Total Words"
                      value={selectedRecording.total_words.toString()}
                    />
                    <MetricCard
                      label="Words/Min"
                      value={selectedRecording.words_per_minute.toFixed(1)}
                    />
                    <MetricCard
                      label="Filler Words"
                      value={selectedRecording.filler_word_count.toString()}
                    />
                  </div>
                </div>

                {/* Filler Words Breakdown */}
                {selectedRecording.filler_words_list.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      Filler Words Detected
                    </h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedRecording.filler_words_list.slice(0, 20).map((filler, index) => (
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
                    {selectedRecording.filler_words_list.length > 20 && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Showing 20 of {selectedRecording.filler_words_list.length} filler words
                      </p>
                    )}
                  </div>
                )}

                {/* AI Feedback */}
                {selectedRecording.ai_feedback && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      🤖 AI Coach Feedback
                    </h2>
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                        {selectedRecording.ai_feedback}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Transcription */}
                {selectedRecording.transcription && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Full Transcription</h2>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 leading-relaxed">
                        {selectedRecording.transcription}
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
      </div>
    </div>
  );
}

interface ScoreCardProps {
  label: string;
  score: number;
  color: 'blue' | 'green' | 'purple';
}

function ScoreCard({ label, score, color }: ScoreCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
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
