import React, { useState } from 'react';
import FieldOptionsMenu from './ui/field-options-menu';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from './ui/glass-card';
import { faFont, faEnvelope, faAlignLeft } from '@fortawesome/free-solid-svg-icons';

/**
 * CheckboxToggleDemo - Demonstrates the fixed instant checkbox toggle functionality
 *
 * This demo shows how the optimized FieldOptionsMenu component provides:
 * - Instant visual feedback when checkboxes are clicked
 * - Proper synchronization with parent state
 * - No more delayed checkbox UI updates
 */
const CheckboxToggleDemo = () => {
  // Sample form fields with different initial states
  const [fields, setFields] = useState([
    {
      id: '1',
      title: 'ชื่อ-นามสกุล',
      type: 'short_answer',
      required: false,
      showInTable: false,
      sendTelegram: false
    },
    {
      id: '2',
      title: 'อีเมลติดต่อ',
      type: 'email',
      required: true,
      showInTable: true,
      sendTelegram: false
    },
    {
      id: '3',
      title: 'คำอธิบายโครงการ',
      type: 'paragraph',
      required: false,
      showInTable: false,
      sendTelegram: true
    }
  ]);

  const fieldTypes = {
    short_answer: { icon: faFont, color: 'blue', label: 'ข้อความสั้น' },
    email: { icon: faEnvelope, color: 'purple', label: 'อีเมล' },
    paragraph: { icon: faAlignLeft, color: 'green', label: 'ข้อความยาว' }
  };

  // Update field handler - simulates the parent component state update
  const updateField = (fieldId, updatedField) => {
    setFields(prevFields =>
      prevFields.map(field =>
        field.id === fieldId ? updatedField : field
      )
    );
  };

  const handleRemove = (fieldId) => {
    setFields(prevFields => prevFields.filter(field => field.id !== fieldId));
  };

  const handleDuplicate = (fieldId) => {
    const fieldToDuplicate = fields.find(field => field.id === fieldId);
    if (fieldToDuplicate) {
      const newField = {
        ...fieldToDuplicate,
        id: Date.now().toString(),
        title: `${fieldToDuplicate.title} (สำเนา)`
      };
      setFields(prevFields => [...prevFields, newField]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>
            ✅ Fixed: Instant Checkbox Toggle Demo
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="font-medium mb-2 text-primary">🚀 What's Fixed:</h3>
              <ul className="text-sm space-y-1 text-foreground/80">
                <li>✅ <strong>Instant Visual Feedback</strong> - Checkboxes toggle immediately when clicked</li>
                <li>✅ <strong>Local State Management</strong> - Uses optimistic updates for UI responsiveness</li>
                <li>✅ <strong>Proper React Keys</strong> - Each checkbox has unique key for React tracking</li>
                <li>✅ <strong>Memory Optimization</strong> - React.memo prevents unnecessary re-renders</li>
                <li>✅ <strong>Async Parent Sync</strong> - Background state updates don't block UI</li>
              </ul>
            </div>

            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
              <h3 className="font-medium mb-2 text-red-400">❌ Previous Issues:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Long state propagation chain caused delayed updates</li>
                <li>• Multiple component layers between checkbox and final state</li>
                <li>• No local state for immediate visual feedback</li>
                <li>• Missing React keys caused DOM node reuse issues</li>
                <li>• Radix UI dropdown potentially interfering with re-renders</li>
              </ul>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground/90">
          Test the Fixed Checkboxes - Click Any Option!
        </h2>

        {fields.map(field => (
          <GlassCard key={field.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-${fieldTypes[field.type].color}-500/20 to-${fieldTypes[field.type].color}-600/20 flex items-center justify-center`}>
                  <span className="text-lg">
                    {fieldTypes[field.type].icon === faFont ? '📝' :
                     fieldTypes[field.type].icon === faEnvelope ? '📧' : '📄'}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground/90">{field.title}</h3>
                  <p className="text-sm text-muted-foreground">{fieldTypes[field.type].label}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Status Display */}
                <div className="flex items-center gap-1 text-xs">
                  {field.required && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">จำเป็น</span>
                  )}
                  {field.showInTable && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">ตาราง</span>
                  )}
                  {field.sendTelegram && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">Telegram</span>
                  )}
                </div>

                {/* Fixed Options Menu */}
                <FieldOptionsMenu
                  field={field}
                  onUpdate={(updatedField) => updateField(field.id, updatedField)}
                  onRemove={() => handleRemove(field.id)}
                  onDuplicate={() => handleDuplicate(field.id)}
                  onMoveUp={() => console.log('Move up:', field.id)}
                  onMoveDown={() => console.log('Move down:', field.id)}
                  canMoveUp={true}
                  canMoveDown={true}
                />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <GlassCardContent className="p-4">
          <h3 className="font-medium mb-2">🔧 Technical Implementation:</h3>
          <div className="bg-background/50 p-3 rounded-lg text-sm font-mono">
            <div className="text-green-400">// Optimized checkbox with local state</div>
            <div>const [localSettings, setLocalSettings] = useState(field);</div>
            <div className="text-blue-400 mt-2">// Instant visual feedback</div>
            <div>setLocalSettings(prev =&gt; &#123;...prev, required: checked&#125;);</div>
            <div className="text-orange-400 mt-2">// Async parent sync</div>
            <div>onUpdate(&#123;...field, required: checked&#125;);</div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default CheckboxToggleDemo;