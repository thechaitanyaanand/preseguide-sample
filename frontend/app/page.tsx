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
      const response = await presentationsAPI.create({ title, description });
      const presentationId = response.data.id;

      if (documentFile) {
        const formData = new FormData();
        formData.append('document_file', documentFile);
        await presentationsAPI.update(presentationId, formData);
      }

      // FIX: Changed /.../ to `...` (template literal string)
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
    // FIX: Added React Fragment wrapper
    <>
      <div className="min-h-screen bg-black text-white overflow-hidden">
        {/* Particle Background Canvas */}
        <canvas
          ref={(canvas) => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const particles: Array<{
              x: number;
              y: number;
              size: number;
              speedX: number;
              speedY: number;
              opacity: number;
              glowIntensity: number;
              type: 'small' | 'medium' | 'large' | 'tiny';
            }> = [];

            // Create varied particles with concentration in center
            for (let i = 0; i < 250; i++) {
              // Bias towards center using normal distribution
              const centerBias = Math.random() < 0.7;
              let x, y;

              if (centerBias) {
                // Concentrated in center
                const angleOffset = (Math.random() - 0.5) * Math.PI;
                const distance = Math.random() * (canvas.width * 0.3);
                x = canvas.width / 2 + Math.cos(angleOffset) * distance;
                y = canvas.height / 2 + Math.sin(angleOffset) * distance;
              } else {
                // Scattered around
                x = Math.random() * canvas.width;
                y = Math.random() * canvas.height;
              }

              // Determine particle type
              const typeRand = Math.random();
              let type: 'small' | 'medium' | 'large' | 'tiny';
              let size: number;
              let opacity: number;

              if (typeRand < 0.5) {
                type = 'tiny';
                size = Math.random() * 1 + 0.5;
                opacity = Math.random() * 0.3 + 0.2;
              } else if (typeRand < 0.8) {
                type = 'small';
                size = Math.random() * 2 + 1;
                opacity = Math.random() * 0.4 + 0.3;
              } else if (typeRand < 0.95) {
                type = 'medium';
                size = Math.random() * 3 + 2;
                opacity = Math.random() * 0.5 + 0.4;
              } else {
                type = 'large';
                size = Math.random() * 5 + 3;
                opacity = Math.random() * 0.7 + 0.5;
              }

              particles.push({
                x,
                y,
                size,
                speedX: Math.random() * 0.4 + 0.1,
                speedY: (Math.random() - 0.5) * 0.15,
                opacity,
                glowIntensity: Math.random() * 0.5 + 0.5,
                type,
              });
            }

            function animate() {
              if (!ctx || !canvas) return;
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              particles.forEach((particle) => {
                // Create glow effect
                const gradient = ctx.createRadialGradient(
                  particle.x,
                  particle.y,
                  0,
                  particle.x,
                  particle.y,
                  particle.size * 3
                );

                // Golden/warm white glow
                // FIX: Wrapped rgba in backticks to make it a string
                gradient.addColorStop(
                  0,
                  `rgba(255, 240, 200, ${
                    particle.opacity * particle.glowIntensity
                  })`
                );
                // FIX: Wrapped rgba in backticks to make it a string
                gradient.addColorStop(
                  0.5,
                  `rgba(255, 230, 180, ${particle.opacity * 0.3})`
                );
                gradient.addColorStop(1, 'rgba(255, 220, 150, 0)');

                // Draw glow
                ctx.beginPath();
                ctx.arc(
                  particle.x,
                  particle.y,
                  particle.size * 3,
                  0,
                  Math.PI * 2
                );
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw core particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                // FIX: Wrapped rgba in backticks to make it a string
                ctx.fillStyle = `rgba(255, 245, 220, ${particle.opacity})`;
                ctx.fill();

                // Update position - smooth left to right
                particle.x += particle.speedX;
                particle.y += particle.speedY;

                // Wrap around horizontally
                if (particle.x > canvas.width + 10) {
                  particle.x = -10;
                }

                // Keep vertical position in bounds
                if (particle.y < -10) particle.y = canvas.height + 10;
                if (particle.y > canvas.height + 10) particle.y = -10;

                // Subtle opacity pulsing
                particle.glowIntensity += (Math.random() - 0.5) * 0.02;
                particle.glowIntensity = Math.max(
                  0.3,
                  Math.min(1, particle.glowIntensity)
                );
              });

              requestAnimationFrame(animate);
            }

            animate();

            // Handle resize
            const handleResize = () => {
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
            };
            window.addEventListener('resize', handleResize);

            return () => window.removeEventListener('resize', handleResize);
          }}
          className="fixed inset-0 pointer-events-none"
        />

        <div className="container mx-auto px-6 py-20 max-w-7xl relative z-10">
          {/* Header */}
          <div className="mb-24">
            <h1 className="text-7xl font-light tracking-tight mb-4">
              PreseGuide
            </h1>
            <p className="text-xl text-gray-400 font-light">
              AI-Powered Presentation Coaching
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
            {/* Create New Presentation */}
            <div className="border border-gray-800 p-10 backdrop-blur-sm bg-black/50 transition-all duration-700">
              <h2 className="text-3xl font-light mb-10 tracking-tight">
                New Presentation
              </h2>

              <form onSubmit={handleCreatePresentation} className="space-y-8">
                <div>
                  <label className="block text-sm font-light text-gray-400 mb-3 uppercase tracking-wider transition-colors">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Quarterly Business Review"
                    className="w-full px-0 py-3 bg-transparent border-b border-gray-800 focus:border-white focus:outline-none transition-all text-white placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-light text-gray-400 mb-3 uppercase tracking-wider transition-colors">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                    rows={3}
                    className="w-full px-0 py-3 bg-transparent border-b border-gray-800 focus:border-white focus:outline-none transition-all text-white placeholder-gray-600 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-light text-gray-400 mb-3 uppercase tracking-wider transition-colors">
                    Document
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={handleFileSelect}
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-6 file:border file:border-gray-800 file:bg-transparent file:text-white file:font-light hover:file:bg-white hover:file:text-black file:transition-all file:cursor-pointer file:duration-300"
                  />
                  {documentFile && (
                    <p className="text-sm text-gray-500 mt-3 font-light animate-fade-in">
                      {documentFile.name}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !title}
                  className="w-full bg-white text-black py-4 px-6 font-light hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-all uppercase tracking-wider text-sm active:scale-95"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </form>
            </div>

            {/* Recent Presentations */}
            <div className="border border-gray-800 p-10 backdrop-blur-sm bg-black/50 transition-all duration-700">
              <h2 className="text-3xl font-light mb-10 tracking-tight">
                Your Presentations
              </h2>

              {loadingPresentations ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-gray-800 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : presentations.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 font-light">
                    No presentations yet
                  </p>
                  <p className="text-sm text-gray-700 mt-2 font-light">
                    Create your first one to begin
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {presentations.map((pres, index) => (
                    <Link
                      key={pres.id}
                      // FIX: Changed /.../ to `...` (template literal string)
                      href={`/presentation/${pres.id}`}
                      className="block p-6 border border-gray-900 hover:border-white transition-all group hover:bg-white/5"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-light text-lg mb-2 group-hover:text-gray-300 transition-colors transform duration-300">
                            {pres.title}
                          </h3>
                          {pres.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2 font-light">
                              {pres.description}
                            </p>
                          )}
                          <div className="flex items-center gap-6 text-xs text-gray-700 font-light uppercase tracking-wider">
                            <span className="transition-colors">
                              {pres.recordings_count} Recordings
                            </span>
                            <span className="transition-colors">
                              Level {pres.current_level}
                            </span>
                            <span className="transition-colors">
                              {pres.badges.length} Badges
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-gray-900">
            <FeatureCard
              title="Audio Analysis"
              description="AI-powered transcription and filler word detection"
              delay={0}
            />
            <FeatureCard
              title="Document Context"
              description="Upload slides for content-aware coaching"
              delay={100}
            />
            <FeatureCard
              title="Gamification"
              description="Earn XP, level up, and unlock badges"
              delay={200}
            />
            <FeatureCard
              title="Q&A Generator"
              description="AI-generated questions to prepare for"
              delay={300}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </> // FIX: Added closing React Fragment
  );
}

function FeatureCard({
  title,
  description,
  delay,
}: {
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div className="bg-black p-8 hover:bg-white hover:text-black transition-all duration-700 cursor-pointer relative">
      <h3 className="font-light text-lg mb-3 tracking-tight transition-all duration-300">
        {title}
      </h3>
      <p className="text-gray-600 text-sm font-light leading-relaxed transition-colors duration-300">
        {description}
      </p>
    </div>
  );
}