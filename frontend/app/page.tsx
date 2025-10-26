'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { presentationsAPI } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await presentationsAPI.create({ title, description });
      router.push(`/presentation/${response.data.id}`);
    } catch (error) {
      console.error('Error creating presentation:', error);
      alert('Failed to create presentation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🎤 PreseGuide
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Your AI-Powered Presentation Coach
          </p>

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
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <FeatureCard
              icon="🎯"
              title="Audio Analysis"
              description="AI-powered transcription and filler word detection"
            />
            <FeatureCard
              icon="⚡"
              title="Pacing Insights"
              description="Real-time words-per-minute tracking"
            />
            <FeatureCard
              icon="💡"
              title="Smart Feedback"
              description="Personalized coaching tips from AI"
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
