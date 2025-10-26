'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { presentationsAPI } from '@/lib/api';
import Link from 'next/link';
import type { Presentation } from '@/types';

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loadingPresentations, setLoadingPresentations] = useState(true);

  useEffect(() => {
    loadPresentations();
  }, []);

  const loadPresentations = async () => {
    try {
      const response = await presentationsAPI.list();
      setPresentations(response.data);
    } catch (error) {
      console.error('Error loading presentations:', error);
    } finally {
      setLoadingPresentations(false);
    }
  };

  const handleCreatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create presentation
      const response = await presentationsAPI.create({ title, description });
      const presentationId = response.data.id;

      // Step 2: Upload document if provided
      if (documentFile) {
        const formData = new FormData();
        formData.append('document_file', documentFile);
        await presentationsAPI.update(presentationId, formData);
      }

      router.push(`/presentation/${presentationId}`);
    } catch (error) {
      console.error('Error creating presentation:', error);
      alert('Failed to create presentation');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              🎤 PreseGuide
            </h1>
            <p className="text-xl text-gray-600">
              Your AI-Powered Presentation Coach
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Create New Presentation */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-6">
                Create a New Presentation
              </h2>

              <form onSubmit={handleCreatePresentation} className="space-y-6">
                <div>
                  <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                    Presentation Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g., Quarterly Business Review"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your presentation..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                    Upload Document (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={handleFileSelect}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {documentFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {documentFile.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Upload your PDF or PowerPoint to get content-aware coaching
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !title}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Presentation'}
                </button>
              </form>
            </div>

            {/* Recent Presentations */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-6">
                Your Presentations
              </h2>

              {loadingPresentations ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : presentations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No presentations yet.</p>
                  <p className="text-sm mt-2">Create your first one to get started!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {presentations.map((pres) => (
                    <Link
                      key={pres.id}
                      href={`/presentation/${pres.id}`}
                      className="block p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {pres.title}
                          </h3>
                          {pres.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {pres.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>📊 {pres.recordings_count} recordings</span>
                            <span>⭐ Level {pres.current_level}</span>
                            <span>🏆 {pres.badges.length} badges</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className="text-2xl">
                            {pres.current_level >= 5 ? '👑' : '🎤'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            <FeatureCard
              icon="🎯"
              title="Audio Analysis"
              description="AI-powered transcription and filler word detection"
            />
            <FeatureCard
              icon="📄"
              title="Document Context"
              description="Upload slides for content-aware coaching"
            />
            <FeatureCard
              icon="🎮"
              title="Gamification"
              description="Earn XP, level up, and unlock badges"
            />
            <FeatureCard
              icon="❓"
              title="Q&A Generator"
              description="AI-generated questions to prepare for"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
