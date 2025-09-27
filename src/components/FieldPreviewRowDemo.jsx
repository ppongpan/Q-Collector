import React from 'react';
import FieldPreviewRow from './ui/field-preview-row';
import { GlassCard } from './ui/glass-card';
import { faFont, faAlignLeft, faEnvelope } from '@fortawesome/free-solid-svg-icons';

/**
 * FieldPreviewRowDemo - Demonstration of the new FieldPreviewRow component
 * Shows how different field types appear with the improved layout:
 * [Icon] [Field Name] [Preview Input] [Status Tags]
 */
const FieldPreviewRowDemo = () => {
  // Sample field types configuration (would normally come from field types system)
  const fieldTypes = {
    short_answer: {
      icon: faFont,
      color: 'blue',
      label: 'ข้อความสั้น'
    },
    paragraph: {
      icon: faAlignLeft,
      color: 'green',
      label: 'ข้อความยาว'
    },
    email: {
      icon: faEnvelope,
      color: 'purple',
      label: 'อีเมล'
    }
  };

  // Sample fields data with varied label lengths to demonstrate alignment
  const sampleFields = [
    {
      id: '1',
      type: 'short_answer',
      title: 'ชื่อ-นามสกุล',
      placeholder: 'กรอกชื่อของคุณ...',
      required: true,
      showInTable: true,
      sendTelegram: false
    },
    {
      id: '2',
      type: 'paragraph',
      title: 'คำอธิบายรายละเอียดของโครงการที่ต้องการดำเนินการ',  // Very long name
      placeholder: 'กรอกรายละเอียดเพิ่มเติม...',
      required: false,
      showInTable: false,
      sendTelegram: true
    },
    {
      id: '3',
      type: 'email',
      title: 'อีเมล',  // Short name
      placeholder: 'example@domain.com',
      required: true,
      showInTable: true,
      sendTelegram: true
    },
    {
      id: '4',
      type: 'short_answer',
      title: 'หมายเลขโทรศัพท์มือถือ',  // Medium name
      placeholder: '081-234-5678',
      required: true,
      showInTable: true,
      sendTelegram: true  // This will demonstrate tag wrapping
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground/90">
          FieldPreviewRow Component Demo
        </h1>
        <p className="text-muted-foreground">
          Enhanced collapsed field preview with improved layout: [Icon] [Name] [Preview] [Tags]
        </p>
      </div>

      <div className="grid gap-4">
        <h2 className="text-xl font-semibold text-foreground/90">
          Perfect Input Alignment Demo - Notice Identical Left Edges
        </h2>

        <div className="bg-primary/10 p-4 rounded-lg mb-4">
          <h3 className="font-medium mb-2 text-primary">🎯 Key Alignment Features:</h3>
          <ul className="text-sm space-y-1 text-foreground/80">
            <li>✅ All input boxes start at <strong>identical left position</strong></li>
            <li>✅ Field names have <strong>fixed 200px width</strong> - long names truncate</li>
            <li>✅ Input section uses <strong>flex-1</strong> for consistent width</li>
            <li>✅ Tags wrap to second row with <strong>gap-x-1 gap-y-1</strong></li>
          </ul>
        </div>

        {sampleFields.map((field, index) => (
          <FieldPreviewRow
            key={field.id}
            field={field}
            fieldType={fieldTypes[field.type]}
            isExpanded={false}
          />
        ))}
      </div>

      <div className="bg-background/50 rounded-xl p-6 border border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground/90">
          Why Previous Code Caused Misaligned Inputs
        </h3>

        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
            <h4 className="font-medium mb-3 text-red-400">❌ Problem (Before):</h4>
            <div className="space-y-2 text-muted-foreground">
              <code className="block bg-background/50 p-2 rounded text-xs">
                &lt;div className="flex items-center gap-3"&gt;<br/>
                &nbsp;&nbsp;&lt;Icon /&gt;&lt;FieldName /&gt;&lt;Input /&gt;<br/>
                &lt;/div&gt;
              </code>
              <ul className="space-y-1 mt-2">
                <li>• Variable-width field names</li>
                <li>• Input start position shifts with name length</li>
                <li>• Tags push inputs around</li>
                <li>• No consistent alignment grid</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
            <h4 className="font-medium mb-3 text-green-400">✅ Solution (After):</h4>
            <div className="space-y-2 text-muted-foreground">
              <code className="block bg-background/50 p-2 rounded text-xs">
                &lt;div className="flex items-start gap-4"&gt;<br/>
                &nbsp;&nbsp;&lt;div className="min-w-[200px]"&gt;Icon+Name&lt;/div&gt;<br/>
                &nbsp;&nbsp;&lt;div className="flex-1"&gt;Input&lt;/div&gt;<br/>
                &nbsp;&nbsp;&lt;div className="flex-wrap"&gt;Tags&lt;/div&gt;<br/>
                &lt;/div&gt;
              </code>
              <ul className="space-y-1 mt-2">
                <li>• Fixed 200px first column</li>
                <li>• Input always starts at same position</li>
                <li>• Tags wrap naturally</li>
                <li>• Three-column flex grid</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <h4 className="font-medium mb-2 text-primary">🏗️ Three-Column Flex Grid Architecture:</h4>
          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
            <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
              <div className="font-medium text-blue-400">Column A</div>
              <div className="text-xs text-muted-foreground mt-1">
                Icon + Field Name<br/>
                <code>min-w-[200px]</code><br/>
                Fixed width for alignment
              </div>
            </div>
            <div className="bg-green-500/10 p-3 rounded border border-green-500/20">
              <div className="font-medium text-green-400">Column B</div>
              <div className="text-xs text-muted-foreground mt-1">
                Preview Input<br/>
                <code>flex-1</code><br/>
                Consistent width
              </div>
            </div>
            <div className="bg-orange-500/10 p-3 rounded border border-orange-500/20">
              <div className="font-medium text-orange-400">Column C</div>
              <div className="text-xs text-muted-foreground mt-1">
                Status Tags<br/>
                <code>flex-wrap gap-x-1 gap-y-1</code><br/>
                Auto width, wrappable
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldPreviewRowDemo;