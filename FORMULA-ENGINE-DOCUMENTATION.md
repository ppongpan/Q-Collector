# Formula Engine Documentation
## Q-Collector Framework v0.2 - Conditional Field Visibility System

### Overview

The Formula Engine provides Google AppSheet-compatible formula parsing and evaluation for conditional field visibility in the Q-Collector framework. It supports Thai field names, complex logical expressions, and real-time evaluation with performance optimization.

### Features

- **Complete formula syntax support** - Field references, logical functions, comparison operators, text functions, and arithmetic
- **Thai language support** - Full Unicode support for Thai field names and values
- **Performance optimized** - AST caching, memoization, and efficient evaluation
- **Error handling** - Comprehensive error handling with detailed error messages
- **React integration** - Custom hooks for easy integration with React components
- **Visual editor** - Formula builder component with syntax highlighting and auto-completion

---

## Core Components

### 1. Formula Engine (`formulaEngine.js`)

The main engine consists of four primary classes:

#### `FormulaTokenizer`
Converts formula strings into tokens for parsing.

```javascript
import { FormulaTokenizer, TOKEN_TYPES } from './utils/formulaEngine';

const tokenizer = new FormulaTokenizer('[FieldName] = "Value"');
const tokens = tokenizer.tokenize();
// Result: [FIELD, OPERATOR, STRING, EOF]
```

#### `FormulaParser`
Converts tokens into an Abstract Syntax Tree (AST).

```javascript
const parser = new FormulaParser(tokens);
const ast = parser.parse();
// Result: ComparisonOperation AST node
```

#### `FormulaEvaluator`
Executes AST against form data.

```javascript
const evaluator = new FormulaEvaluator(formData, fieldMap);
const result = evaluator.evaluate(ast);
// Result: boolean value
```

#### `FormulaEngine` (Main Class)
Orchestrates the entire process with caching.

```javascript
import { formulaEngine } from './utils/formulaEngine';

const result = formulaEngine.evaluate(
  'AND([Status] = "Complete", [Amount] > 100)',
  formData,
  fieldMap
);
```

---

## Supported Syntax

### Field References
```javascript
[FieldName]           // Basic field reference
[ลักษณะงาน]           // Thai field names
[Field with Spaces]   // Fields with spaces
```

### Comparison Operators
```javascript
[Field] = "Value"     // Equal
[Field] <> "Value"    // Not equal
[Amount] > 100        // Greater than
[Amount] < 100        // Less than
[Amount] >= 100       // Greater than or equal
[Amount] <= 100       // Less than or equal
```

### Logical Functions
```javascript
AND(condition1, condition2, ...)     // All conditions must be true
OR(condition1, condition2, ...)      // At least one condition must be true
NOT(condition)                       // Negates the condition
```

### Conditional Logic
```javascript
IF(condition, true_value, false_value)
// Example: IF([Status] = "Complete", [Amount] > 100, FALSE)
```

### Text Functions
```javascript
CONTAINS(text, search_text)    // Check if text contains search_text
ISBLANK(field)                 // Check if field is empty/null
ISNOTBLANK(field)             // Check if field is not empty
UPPER(text)                   // Convert to uppercase
LOWER(text)                   // Convert to lowercase
TRIM(text)                    // Remove leading/trailing whitespace
LEN(text)                     // Get text length
```

### Arithmetic Operations
```javascript
[Amount] + 100        // Addition
[Amount] - 50         // Subtraction
[Amount] * 2          // Multiplication
[Amount] / 3          // Division
```

---

## React Hooks

### `useConditionalVisibility`
Main hook for field visibility based on formula evaluation.

```javascript
import { useConditionalVisibility } from './hooks/useConditionalVisibility';

const MyFormField = ({ field, formData, allFields }) => {
  const { isVisible, error, dependencies } = useConditionalVisibility(
    field.showCondition?.formula,
    formData,
    allFields,
    {
      defaultVisible: true,
      enableCaching: true,
      debounceMs: 100,
      onError: (error, formula) => console.error('Formula error:', error),
      onVisibilityChange: (newVisibility, oldVisibility) => {
        console.log('Visibility changed:', newVisibility);
      }
    }
  );

  if (!isVisible) return null;

  return (
    <div>
      {/* Field content */}
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

### `useMultipleConditionalVisibility`
Batch processing for multiple conditional fields.

```javascript
const { visibilityMap } = useMultipleConditionalVisibility(
  formFields,
  formData,
  allFields
);

// visibilityMap = { fieldId1: true, fieldId2: false, ... }
```

### `useConditionalLogic`
Advanced conditional logic for complex scenarios.

```javascript
const conditions = {
  showAdvanced: '[UserRole] = "Admin"',
  requireApproval: '[Amount] > 10000',
  sendNotification: 'AND([Priority] = "High", NOT(ISBLANK([Email])))'
};

const { results } = useConditionalLogic(conditions, formData, allFields);
// results = { showAdvanced: { result: true, error: null }, ... }
```

### `useFormulaBuilder`
Hook for building formula editor interfaces.

```javascript
const {
  formula,
  setFormula,
  isValid,
  errors,
  getFieldSuggestions,
  getFunctionSuggestions,
  testFormula,
  dependencies
} = useFormulaBuilder(initialFormula, availableFields);
```

---

## Formula Builder Component

Visual formula editor with syntax highlighting, auto-completion, and validation.

```javascript
import FormulaBuilder, { FieldReferencePicker } from './components/ui/formula-builder';

const FormulaEditor = ({ field, onUpdateField, formData, allFields }) => {
  return (
    <div className="space-y-4">
      <FormulaBuilder
        value={field.showCondition?.formula || ''}
        onChange={(formula) =>
          onUpdateField({
            ...field,
            showCondition: { ...field.showCondition, formula }
          })
        }
        availableFields={allFields}
        testData={formData}
        placeholder="Enter conditional formula..."
      />

      <FieldReferencePicker
        availableFields={allFields}
        onSelect={(fieldRef) => {
          // Insert field reference at cursor
        }}
      />
    </div>
  );
};
```

---

## Real-World Examples

### Thai Business Form Example
```javascript
// Factory selection with Thai field names
const formula = 'AND([โรงงาน] = "บางปะอิน", [ประเภทงาน] = "ตรวจสอบ")';

// Job status with completion requirements
const formula2 = 'AND([ลักษณะงาน] = "งานตรวจสอบอาคาร", [สถานะงาน] = "ปิดงานแล้ว")';
```

### Multi-level Conditional Logic
```javascript
const formula = `
  IF([UserRole] = "Admin",
    OR([Department] = "IT", [Experience] > 3),
    AND([ProjectType] = "Critical", [Experience] > 2)
  )
`;
```

### Form Validation Scenarios
```javascript
// Required field based on other field
const requiredFormula = 'IF([HasComments] = TRUE, NOT(ISBLANK([Comments])), TRUE)';

// Conditional email requirement
const emailFormula = 'IF([ContactMethod] = "Email", NOT(ISBLANK([Email])), TRUE)';

// Complex approval workflow
const approvalFormula = `
  AND(
    [Amount] > 10000,
    [Department] = "Finance",
    NOT(ISBLANK([Justification]))
  )
`;
```

### Advanced Text Processing
```javascript
// Check for specific keywords in description
const keywordFormula = 'OR(CONTAINS([Description], "urgent"), CONTAINS([Description], "priority"))';

// Validate required information
const validationFormula = `
  AND(
    LEN([Title]) >= 10,
    NOT(ISBLANK([Category])),
    CONTAINS([Email], "@")
  )
`;
```

---

## Performance Considerations

### Caching
The formula engine automatically caches compiled ASTs for better performance:

```javascript
// First evaluation compiles and caches
formulaEngine.evaluate(formula, formData, fieldMap);

// Subsequent evaluations use cached AST
formulaEngine.evaluate(formula, formData, fieldMap); // Faster

// Manual cache management
formulaEngine.clearCache();
formulaEngine.getCacheSize(); // For debugging
```

### Optimization Tips

1. **Use simple conditions first** - Place simple checks before complex ones in AND operations
2. **Avoid deeply nested formulas** - Break complex logic into multiple simpler conditions
3. **Cache field maps** - Create field maps once and reuse them
4. **Debounce evaluations** - Use debouncing for real-time form updates

```javascript
// Good: Simple condition first
AND([Status] = "Active", CONTAINS([Description], "complex search"))

// Better: Cached field map
const fieldMap = useMemo(() => createFieldMap(allFields), [allFields]);

// Best: Debounced evaluation
const { isVisible } = useConditionalVisibility(formula, formData, allFields, {
  debounceMs: 150
});
```

---

## Error Handling

### Formula Validation
```javascript
// Check if formula is valid
const isValid = formulaEngine.isValid(formula);

// Get detailed validation with error messages
try {
  const ast = formulaEngine.compile(formula);
  if (!ast) throw new Error('Invalid formula syntax');
} catch (error) {
  console.error('Validation error:', error.message);
}
```

### Runtime Error Handling
```javascript
// Graceful error handling in evaluation
const { isVisible, error } = useConditionalVisibility(formula, formData, allFields, {
  onError: (error, formula) => {
    // Log error for debugging
    console.error('Formula evaluation failed:', {
      error: error.message,
      formula,
      formData
    });

    // Send to error tracking service
    trackError('formula_evaluation_error', {
      formula,
      error: error.message
    });
  }
});
```

### Common Error Scenarios
1. **Unknown field references** - Field name doesn't exist in form data
2. **Type mismatches** - Comparing incompatible types
3. **Function argument errors** - Wrong number of arguments
4. **Syntax errors** - Invalid formula syntax
5. **Circular dependencies** - Field depends on itself

---

## Testing

### Unit Testing
```javascript
import { formulaEngine } from './utils/formulaEngine';

describe('Formula Engine', () => {
  test('should evaluate Thai field expressions', () => {
    const formula = 'AND([ลักษณะงาน] = "งานตรวจสอบอาคาร", [สถานะงาน] = "ปิดงานแล้ว")';
    const formData = {
      'ลักษณะงาน': 'งานตรวจสอบอาคาร',
      'สถานะงาน': 'ปิดงานแล้ว'
    };

    const result = formulaEngine.evaluate(formula, formData, {});
    expect(result).toBe(true);
  });
});
```

### Integration Testing
```javascript
import { render, fireEvent } from '@testing-library/react';
import { useConditionalVisibility } from './hooks/useConditionalVisibility';

const TestComponent = ({ formula, formData }) => {
  const { isVisible } = useConditionalVisibility(formula, formData, []);
  return isVisible ? <div>Visible</div> : null;
};

test('conditional visibility integration', () => {
  const { container, rerender } = render(
    <TestComponent
      formula="[Status] = \"Active\""
      formData={{ Status: 'Active' }}
    />
  );

  expect(container.textContent).toBe('Visible');

  rerender(
    <TestComponent
      formula="[Status] = \"Active\""
      formData={{ Status: 'Inactive' }}
    />
  );

  expect(container.textContent).toBe('');
});
```

---

## Migration and Integration

### Adding to Existing Forms
```javascript
// 1. Add showCondition to field definition
const fieldWithCondition = {
  ...existingField,
  showCondition: {
    enabled: true,
    formula: 'AND([Department] = "IT", [Role] = "Admin")',
    compiled: null // Will be compiled automatically
  }
};

// 2. Update form rendering to use conditional visibility
const FormField = ({ field, formData, allFields }) => {
  const { isVisible } = useConditionalVisibility(
    field.showCondition?.formula,
    formData,
    allFields
  );

  if (!isVisible) return null;

  return <OriginalFieldComponent field={field} />;
};
```

### Data Structure Updates
```javascript
// Form structure with conditional fields
const form = {
  id: 'form-123',
  title: 'Conditional Form',
  fields: [
    {
      id: 'field1',
      type: 'short_answer',
      title: 'Department',
      required: true
    },
    {
      id: 'field2',
      type: 'short_answer',
      title: 'Admin Comments',
      required: false,
      showCondition: {
        enabled: true,
        formula: '[Department] = "IT"'
      }
    }
  ]
};
```

---

## Best Practices

### Formula Design
1. **Keep formulas readable** - Use meaningful field names and break complex logic into steps
2. **Test thoroughly** - Test all possible field combinations
3. **Document complex logic** - Add comments explaining business rules
4. **Use consistent naming** - Follow consistent field naming conventions

### Performance
1. **Minimize dependencies** - Only reference fields that actually affect visibility
2. **Use appropriate data types** - Ensure proper type conversion
3. **Cache when possible** - Leverage built-in caching mechanisms
4. **Monitor performance** - Track evaluation times for complex formulas

### User Experience
1. **Provide visual feedback** - Show when fields are conditionally hidden
2. **Clear error messages** - Help users understand formula issues
3. **Progressive disclosure** - Use conditions to reduce form complexity
4. **Accessibility** - Ensure screen readers handle dynamic visibility properly

---

## Troubleshooting

### Common Issues

**Formula not evaluating correctly:**
- Check field names match exactly (case-sensitive)
- Verify field values are the expected type
- Test formula with sample data

**Performance issues:**
- Check for circular dependencies
- Simplify complex nested formulas
- Use profiling to identify bottlenecks

**Thai text not working:**
- Ensure proper Unicode support
- Check field name encoding
- Verify data transmission preserves Unicode

**React integration problems:**
- Check hook dependencies array
- Verify formData object structure
- Ensure proper cleanup on unmount

---

## API Reference

### FormulaEngine Methods

```javascript
// Compile formula to AST
formulaEngine.compile(formula: string): AST | null

// Evaluate formula against data
formulaEngine.evaluate(formula: string | AST, formData: object, fieldMap: object): boolean

// Check formula validity
formulaEngine.isValid(formula: string): boolean

// Get field dependencies
formulaEngine.getDependencies(formula: string): string[]

// Cache management
formulaEngine.clearCache(): void
formulaEngine.getCacheSize(): number
```

### Hook Options

```javascript
useConditionalVisibility(formula, formData, allFields, {
  defaultVisible: boolean,     // Default visibility when no formula
  enableCaching: boolean,      // Enable formula caching
  debounceMs: number,         // Debounce evaluation
  onError: function,          // Error callback
  onVisibilityChange: function // Visibility change callback
})
```

This documentation provides comprehensive coverage of the Formula Engine system, enabling developers to implement sophisticated conditional field visibility in their Q-Collector applications.