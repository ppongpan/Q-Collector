import React from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './ui/glass-card';

export default function TestFormList() {
  const testForms = [
    { id: 1, title: 'Test Form 1', description: 'This is a test form' },
    { id: 2, title: 'Test Form 2', description: 'Another test form' },
    { id: 3, title: 'Test Form 3', description: 'Yet another test form' },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-title1 font-bold mb-8 text-center">
        Form List Theme Test
      </h1>

      {/* Enhanced Forms Grid with proper overflow handling */}
      <div className="form-list-grid-container">
        <div className="animated-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {testForms.map((form) => (
            <div key={form.id} className="animated-grid-item">
              <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out">
                <GlassCardHeader>
                  <GlassCardTitle>{form.title}</GlassCardTitle>
                  <GlassCardDescription>{form.description}</GlassCardDescription>
                </GlassCardHeader>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}