/**
 * Formula Builder Component
 * Visual formula editor with syntax highlighting and validation
 * Q-Collector Framework v0.2
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Lightbulb, Code, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useFormulaBuilder } from '../../hooks/useConditionalVisibility';
import { formulaEngine } from '../../utils/formulaEngine';
import { sanitizeHtml } from '../../utils/sanitize';

const FormulaBuilder = ({
  value = '',
  onChange,
  availableFields = [],
  className,
  placeholder = "Enter formula...",
  testData = {},
  onTest = null,
  disabled = false,
  ...props
}) => {
  const {
    formula,
    setFormula,
    isValid,
    errors,
    getFieldSuggestions,
    getFunctionSuggestions,
    testFormula,
    dependencies
  } = useFormulaBuilder(value, availableFields);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [testResult, setTestResult] = useState(null);

  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Sync internal formula with external value
  useEffect(() => {
    if (value !== formula) {
      setFormula(value);
    }
  }, [value, setFormula]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange && value !== formula) {
      onChange(formula);
    }
  }, [formula, onChange, value]);

  // Test formula when test data changes
  useEffect(() => {
    if (Object.keys(testData).length > 0) {
      const result = testFormula(testData);
      setTestResult(result);
      if (onTest) {
        onTest(result);
      }
    }
  }, [formula, testData, testFormula, onTest]);

  // Handle text area input
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setFormula(newValue);
    setCursorPosition(e.target.selectionStart);
  };

  // Handle cursor position changes
  const handleSelectionChange = (e) => {
    setCursorPosition(e.target.selectionStart);
  };

  // Insert text at cursor position
  const insertText = useCallback((text) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = formula.substring(0, start) + text + formula.substring(end);

    setFormula(newValue);

    // Set cursor position after insertion
    setTimeout(() => {
      const newPosition = start + text.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);

    setShowSuggestions(false);
  }, [formula, setFormula]);

  // Get context-aware suggestions
  const getSuggestions = useCallback(() => {
    const beforeCursor = formula.substring(0, cursorPosition);
    const afterCursor = formula.substring(cursorPosition);

    // Check if we're in a field reference context
    if (beforeCursor.endsWith('[') || (beforeCursor.includes('[') && !beforeCursor.includes(']'))) {
      return getFieldSuggestions().map(suggestion => ({
        ...suggestion,
        insertText: suggestion.label + ']'
      }));
    }

    // Check if we're starting a function
    const lastWord = beforeCursor.split(/[\s\(\),]/).pop();
    if (lastWord && /^[A-Za-z]+$/.test(lastWord)) {
      return getFunctionSuggestions().filter(fn =>
        fn.label.toLowerCase().startsWith(lastWord.toLowerCase())
      );
    }

    // Default suggestions
    return [
      ...getFunctionSuggestions(),
      ...getFieldSuggestions()
    ];
  }, [formula, cursorPosition, getFieldSuggestions, getFunctionSuggestions]);

  // Keyboard event handlers
  const handleKeyDown = (e) => {
    if (showSuggestions) {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }

      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const suggestions = getSuggestions();
        if (suggestions.length > 0) {
          insertText(suggestions[0].insertText || suggestions[0].value);
        }
        return;
      }
    }

    // Show suggestions on Ctrl+Space
    if (e.ctrlKey && e.key === ' ') {
      e.preventDefault();
      setShowSuggestions(true);
      return;
    }

    // Auto-show suggestions for certain characters
    if (['[', '('].includes(e.key)) {
      setTimeout(() => setShowSuggestions(true), 100);
    }
  };

  // Format formula for display
  const formatFormula = (text) => {
    if (!text) return '';

    return text
      .replace(/\[([^\]]+)\]/g, '<span class="field-ref">[$1]</span>')
      .replace(/\b(AND|OR|NOT|IF|CONTAINS|ISBLANK|ISNOTBLANK)\b/g, '<span class="function">$1</span>')
      .replace(/("[^"]*")/g, '<span class="string">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="number">$1</span>');
  };

  return (
    <div className={cn("formula-builder space-y-3", className)} {...props}>
      {/* Main Input Area */}
      <div className="relative">
        <div className="relative border border-input rounded-lg focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={textareaRef}
            value={formula}
            onChange={handleInputChange}
            onSelect={handleSelectionChange}
            onKeyDown={handleKeyDown}
            onFocus={() => !disabled && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full min-h-[80px] p-3 bg-transparent resize-none",
              "font-mono text-sm leading-relaxed",
              "outline-none placeholder:text-muted-foreground",
              !isValid && "text-destructive"
            )}
            style={{ caretColor: disabled ? 'transparent' : 'inherit' }}
          />

          {/* Syntax Highlighting Overlay */}
          {showPreview && formula && (
            <div
              className="absolute inset-0 p-3 pointer-events-none overflow-hidden"
              style={{ color: 'transparent' }}
            >
              <div
                className="formula-highlight font-mono text-sm leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatFormula(formula)) }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
              title={showPreview ? "Hide syntax highlighting" : "Show syntax highlighting"}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle help"
            >
              <Lightbulb className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && !disabled && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {getSuggestions().map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => insertText(suggestion.insertText || suggestion.value)}
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{suggestion.label}</div>
                    {suggestion.description && (
                      <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                    )}
                  </div>
                  <Code className="w-3 h-3 text-muted-foreground" />
                </div>
              </button>
            ))}
            {getSuggestions().length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No suggestions available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status and Validation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isValid ? (
            <div className="flex items-center gap-1 text-success">
              <Check className="w-4 h-4" />
              <span className="text-sm">Valid formula</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-destructive">
              <X className="w-4 h-4" />
              <span className="text-sm">Invalid formula</span>
            </div>
          )}

          {dependencies.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Depends on: {dependencies.join(', ')}
            </div>
          )}
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            testResult.result ? "text-success" : "text-muted-foreground"
          )}>
            <span>Test: {testResult.result ? "TRUE" : "FALSE"}</span>
            {typeof testResult.rawResult !== 'boolean' && (
              <span className="text-muted-foreground">({String(testResult.rawResult)})</span>
            )}
          </div>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Help Panel */}
      {showHelp && (
        <div className="border border-border rounded-lg p-4 bg-muted/50">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Formula Syntax</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div><code>[FieldName]</code> - Reference to form field</div>
                <div><code>=, &lt;&gt;, &lt;, &gt;, &lt;=, &gt;=</code> - Comparison operators</div>
                <div><code>AND(), OR(), NOT()</code> - Logical functions</div>
                <div><code>IF(condition, true_value, false_value)</code> - Conditional logic</div>
                <div><code>CONTAINS(), ISBLANK(), ISNOTBLANK()</code> - Text functions</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Examples</h4>
              <div className="space-y-1 text-xs font-mono">
                <div className="p-2 bg-background rounded border">
                  AND([Status] = "Complete", [Amount] &gt; 100)
                </div>
                <div className="p-2 bg-background rounded border">
                  IF([Priority] = "High", NOT(ISBLANK([Comments])), TRUE)
                </div>
                <div className="p-2 bg-background rounded border">
                  CONTAINS([Description], "keyword")
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Keyboard Shortcuts</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div><kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl+Space</kbd> - Show suggestions</div>
                <div><kbd className="px-1 py-0.5 bg-background border rounded text-xs">Tab</kbd> - Accept first suggestion</div>
                <div><kbd className="px-1 py-0.5 bg-background border rounded text-xs">Esc</kbd> - Hide suggestions</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Insert Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => insertText('AND(')}
          disabled={disabled}
          className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
        >
          AND()
        </button>
        <button
          type="button"
          onClick={() => insertText('OR(')}
          disabled={disabled}
          className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
        >
          OR()
        </button>
        <button
          type="button"
          onClick={() => insertText('IF(, , )')}
          disabled={disabled}
          className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
        >
          IF()
        </button>
        <button
          type="button"
          onClick={() => insertText('CONTAINS(, "")')}
          disabled={disabled}
          className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
        >
          CONTAINS()
        </button>
        <button
          type="button"
          onClick={() => insertText('ISBLANK()')}
          disabled={disabled}
          className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
        >
          ISBLANK()
        </button>
      </div>
    </div>
  );
};

// Field Reference Picker Component
export const FieldReferencePicker = ({
  availableFields = [],
  onSelect,
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFields = availableFields.filter(field =>
    (field.title || field.name || field.id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (field) => {
    const fieldName = field.title || field.name || field.id;
    onSelect(`[${fieldName}]`);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={cn("relative", className)} {...props}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-lg hover:bg-accent transition-colors"
      >
        <span>Insert Field</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fields..."
              className="w-full px-2 py-1 text-sm bg-transparent border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredFields.map((field, index) => (
              <button
                key={field.id || index}
                type="button"
                onClick={() => handleSelect(field)}
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0"
              >
                <div className="font-medium text-sm">{field.title || field.name || field.id}</div>
                {field.type && (
                  <div className="text-xs text-muted-foreground capitalize">{field.type.replace('_', ' ')}</div>
                )}
              </button>
            ))}

            {filteredFields.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No fields found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// CSS for syntax highlighting
const highlightingStyles = `
.formula-highlight .field-ref {
  color: #0969da;
  font-weight: 600;
}

.formula-highlight .function {
  color: #8250df;
  font-weight: 600;
}

.formula-highlight .string {
  color: #0a3069;
}

.formula-highlight .number {
  color: #cf222e;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = highlightingStyles;
  document.head.appendChild(styleElement);
}

export default FormulaBuilder;