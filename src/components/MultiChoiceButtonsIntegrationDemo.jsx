import React, { useState } from 'react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from './ui/glass-card';
import FieldInlinePreview from './FieldInlinePreview';
import MultiChoiceButtons from './ui/multi-choice-buttons';

/**
 * MultiChoiceButtonsIntegrationDemo - Demonstrates the integrated MultiChoiceButtons component
 *
 * Shows how the MultiChoiceButtons component now works within the form builder system:
 * 1. Standalone usage with direct props
 * 2. Integrated usage within FieldInlinePreview
 * 3. Different display styles comparison
 */
const MultiChoiceButtonsIntegrationDemo = () => {
  // Direct MultiChoiceButtons usage
  const [directSelection, setDirectSelection] = useState(['option-1']);
  const [multiSelection, setMultiSelection] = useState(['option-0', 'option-2']);

  const sampleOptions = [
    { id: 'option-0', label: 'React Development' },
    { id: 'option-1', label: 'UI/UX Design' },
    { id: 'option-2', label: 'Full-Stack Engineering' },
    { id: 'option-3', label: 'DevOps & Cloud Infrastructure' },
    { id: 'option-4', label: 'Mobile App Development' },
    { id: 'option-5', label: 'Data Science & Analytics' }
  ];

  // Integrated field examples
  const sampleFields = [
    {
      id: 'choice-radio',
      type: 'multiple_choice',
      title: 'ประเภทงานที่สนใจ (Radio)',
      placeholder: 'เลือกประเภทงาน...',
      options: {
        displayStyle: 'radio',
        allowMultiple: false,
        options: ['พัฒนาเว็บไซต์', 'ออกแบบ UI/UX', 'พัฒนาแอปมือถือ', 'วิเคราะห์ข้อมูล']
      },
      value: 'พัฒนาเว็บไซต์'
    },
    {
      id: 'choice-buttons',
      type: 'multiple_choice',
      title: 'เทคโนโลยีที่ใช้งาน (Buttons)',
      placeholder: 'เลือกเทคโนโลยี...',
      options: {
        displayStyle: 'buttons',
        allowMultiple: true,
        options: ['React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Java']
      },
      value: ['React', 'Node.js']
    },
    {
      id: 'choice-dropdown',
      type: 'multiple_choice',
      title: 'ระดับประสบการณ์ (Dropdown)',
      placeholder: 'เลือกระดับ...',
      options: {
        displayStyle: 'dropdown',
        allowMultiple: false,
        options: ['มือใหม่', 'ปานกลาง', 'เชี่ยวชาญ', 'ผู้เชี่ยวชาญ']
      },
      value: 'ปานกลาง'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>
            🎯 MultiChoiceButtons Integration Complete
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-4">
            <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
              <h3 className="font-medium mb-2 text-green-400">✅ Integration Success:</h3>
              <ul className="text-sm space-y-1 text-foreground/80">
                <li>✅ <strong>MultiChoiceButtons</strong> component created with responsive grid</li>
                <li>✅ <strong>FieldInlinePreview</strong> updated to use new component</li>
                <li>✅ <strong>Perfect alignment</strong> maintained in collapsed field rows</li>
                <li>✅ <strong>Button styling</strong> with orange theme and hover effects</li>
                <li>✅ <strong>Multi-select support</strong> with array-based value handling</li>
                <li>✅ <strong>Accessibility</strong> with ARIA attributes and keyboard support</li>
              </ul>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="font-medium mb-2 text-primary">🔧 Technical Implementation:</h3>
              <div className="bg-background/50 p-3 rounded-lg text-sm font-mono">
                <div className="text-green-400">// Button display style now uses MultiChoiceButtons</div>
                <div>if (displayStyle === 'buttons') &#123;</div>
                <div className="ml-4 text-blue-400">return &lt;MultiChoiceButtons</div>
                <div className="ml-6">options=&#123;formattedOptions&#125;</div>
                <div className="ml-6">value=&#123;selectedValues&#125;</div>
                <div className="ml-6">onChange=&#123;handleMultiChoiceChange&#125;</div>
                <div className="ml-6 text-orange-400">disabled=&#123;true&#125; // Read-only in preview</div>
                <div className="ml-4 text-blue-400">/&gt;</div>
                <div>&#125;</div>
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Direct Component Usage */}
      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg">
              🎮 Direct Component Usage
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-sm text-foreground/80">Single Selection:</h4>
              <MultiChoiceButtons
                options={sampleOptions.slice(0, 4)}
                value={directSelection}
                onChange={setDirectSelection}
                className="w-full"
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Selected: {directSelection.length > 0 ? sampleOptions.find(opt => opt.id === directSelection[0])?.label : 'None'}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm text-foreground/80">Multiple Selection:</h4>
              <MultiChoiceButtons
                options={sampleOptions}
                value={multiSelection}
                onChange={setMultiSelection}
                className="w-full"
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Selected ({multiSelection.length}): {multiSelection.map(id =>
                  sampleOptions.find(opt => opt.id === id)?.label
                ).join(', ')}
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg">
              🔗 Form Builder Integration
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Multiple choice fields in the form builder now use the MultiChoiceButtons component
              when display style is set to "buttons". This provides consistent styling and behavior.
            </p>

            <div className="space-y-3">
              {sampleFields.map((field) => (
                <div key={field.id} className="p-3 bg-background/20 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">{field.title}</h4>
                  <FieldInlinePreview
                    field={field}
                    collapsed={true}
                  />
                </div>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>
            📋 Features Summary
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
              <h4 className="font-medium mb-2 text-blue-400">🎨 Visual Design</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Orange selection theme</li>
                <li>• Hover scale effects (1.01)</li>
                <li>• Active click feedback (0.95)</li>
                <li>• Glass morphism styling</li>
                <li>• Shadow and glow effects</li>
              </ul>
            </div>

            <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
              <h4 className="font-medium mb-2 text-green-400">📱 Responsive</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 2 columns on mobile</li>
                <li>• 3 columns on desktop</li>
                <li>• Text wrapping (line-clamp-2)</li>
                <li>• Touch-friendly sizing</li>
                <li>• Flexible container width</li>
              </ul>
            </div>

            <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
              <h4 className="font-medium mb-2 text-orange-400">♿ Accessibility</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• ARIA pressed attributes</li>
                <li>• Keyboard navigation</li>
                <li>• Screen reader support</li>
                <li>• Hidden checkbox fallback</li>
                <li>• Focus management</li>
              </ul>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default MultiChoiceButtonsIntegrationDemo;