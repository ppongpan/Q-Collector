# AppSheet Formula Engine Implementation for React Form Builder

## Research Summary

Based on comprehensive research of Google AppSheet conditional visibility formulas and JavaScript parsing techniques, this document provides a complete implementation strategy for building a formula engine in your React form builder.

## Core AppSheet Functions to Implement

### 1. Logical Functions
- `AND(condition1, condition2, ...)` - Returns TRUE if all conditions are true
- `OR(condition1, condition2, ...)` - Returns TRUE if any condition is true
- `NOT(condition)` - Returns opposite boolean value
- `IF(condition, then_value, else_value)` - Conditional evaluation
- `IFS(condition1, value1, condition2, value2, ...)` - Multiple conditions

### 2. Comparison Operators
- `=` (equals), `<>` (not equals)
- `<`, `>`, `<=`, `>=` (numerical comparisons)
- `ISBLANK(value)`, `ISNOTBLANK(value)` - Check for empty values

### 3. Text Functions
- `CONTAINS(text, substring)` - Case-insensitive text search
- `STARTS(text, prefix)` - Check if text starts with prefix
- `ENDS(text, suffix)` - Check if text ends with suffix
- `CONCAT(text1, text2, ...)` - Join text strings
- `LEFT(text, count)`, `RIGHT(text, count)` - Extract characters

### 4. Date/Time Functions
- `TODAY()` - Current date
- `NOW()` - Current date and time
- `DATE(text)` - Parse date from text
- `TIME(text)` - Parse time from text
- `DATETIME(text)` - Parse datetime from text

### 5. Math Functions
- `SUM(list)` - Sum of numeric values
- `COUNT(list)` - Count of items
- `AVERAGE(list)` - Average of numeric values
- `MAX(list)`, `MIN(list)` - Maximum/minimum values

## JavaScript Implementation Strategy

### 1. Tokenizer (Lexical Analysis)

```javascript
class FormulaTokenizer {
  constructor(formula) {
    this.formula = formula;
    this.position = 0;
    this.tokens = [];
  }

  tokenize() {
    while (this.position < this.formula.length) {
      this.skipWhitespace();

      if (this.position >= this.formula.length) break;

      const char = this.formula[this.position];

      // Field references [FieldName]
      if (char === '[') {
        this.tokenizeFieldReference();
      }
      // String literals "text"
      else if (char === '"') {
        this.tokenizeString();
      }
      // Numbers
      else if (this.isDigit(char)) {
        this.tokenizeNumber();
      }
      // Function names and identifiers
      else if (this.isLetter(char)) {
        this.tokenizeIdentifier();
      }
      // Operators and punctuation
      else {
        this.tokenizeOperator();
      }
    }

    return this.tokens;
  }

  tokenizeFieldReference() {
    const start = this.position;
    this.position++; // Skip '['

    while (this.position < this.formula.length && this.formula[this.position] !== ']') {
      this.position++;
    }

    if (this.position < this.formula.length) {
      this.position++; // Skip ']'
    }

    const fieldName = this.formula.slice(start + 1, this.position - 1);
    this.tokens.push({
      type: 'FIELD',
      value: fieldName,
      position: start
    });
  }

  tokenizeString() {
    const start = this.position;
    this.position++; // Skip opening quote

    let value = '';
    while (this.position < this.formula.length && this.formula[this.position] !== '"') {
      if (this.formula[this.position] === '\\') {
        this.position++; // Skip escape character
      }
      value += this.formula[this.position];
      this.position++;
    }

    if (this.position < this.formula.length) {
      this.position++; // Skip closing quote
    }

    this.tokens.push({
      type: 'STRING',
      value: value,
      position: start
    });
  }

  tokenizeNumber() {
    const start = this.position;
    let value = '';

    while (this.position < this.formula.length &&
           (this.isDigit(this.formula[this.position]) || this.formula[this.position] === '.')) {
      value += this.formula[this.position];
      this.position++;
    }

    this.tokens.push({
      type: 'NUMBER',
      value: parseFloat(value),
      position: start
    });
  }

  tokenizeIdentifier() {
    const start = this.position;
    let value = '';

    while (this.position < this.formula.length &&
           (this.isLetterOrDigit(this.formula[this.position]) || this.formula[this.position] === '_')) {
      value += this.formula[this.position];
      this.position++;
    }

    const upperValue = value.toUpperCase();
    const type = this.isFunction(upperValue) ? 'FUNCTION' : 'IDENTIFIER';

    this.tokens.push({
      type: type,
      value: upperValue,
      position: start
    });
  }

  tokenizeOperator() {
    const char = this.formula[this.position];
    const nextChar = this.formula[this.position + 1];

    // Two-character operators
    if (char === '<' && nextChar === '>') {
      this.tokens.push({ type: 'OPERATOR', value: '<>', position: this.position });
      this.position += 2;
    } else if (char === '<' && nextChar === '=') {
      this.tokens.push({ type: 'OPERATOR', value: '<=', position: this.position });
      this.position += 2;
    } else if (char === '>' && nextChar === '=') {
      this.tokens.push({ type: 'OPERATOR', value: '>=', position: this.position });
      this.position += 2;
    } else {
      // Single-character operators
      this.tokens.push({ type: this.getTokenType(char), value: char, position: this.position });
      this.position++;
    }
  }

  isFunction(name) {
    const functions = [
      'IF', 'IFS', 'AND', 'OR', 'NOT',
      'CONTAINS', 'STARTS', 'ENDS', 'CONCAT',
      'TODAY', 'NOW', 'DATE', 'TIME', 'DATETIME',
      'SUM', 'COUNT', 'AVERAGE', 'MAX', 'MIN',
      'ISBLANK', 'ISNOTBLANK'
    ];
    return functions.includes(name);
  }

  isDigit(char) {
    return char >= '0' && char <= '9';
  }

  isLetter(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  isLetterOrDigit(char) {
    return this.isLetter(char) || this.isDigit(char);
  }

  skipWhitespace() {
    while (this.position < this.formula.length && /\s/.test(this.formula[this.position])) {
      this.position++;
    }
  }

  getTokenType(char) {
    switch (char) {
      case '(':
        return 'LPAREN';
      case ')':
        return 'RPAREN';
      case ',':
        return 'COMMA';
      case '=':
      case '<':
      case '>':
      case '+':
      case '-':
      case '*':
      case '/':
        return 'OPERATOR';
      default:
        return 'UNKNOWN';
    }
  }
}
```

### 2. AST Node Structure

```javascript
class ASTNode {
  constructor(type, value, children = []) {
    this.type = type;
    this.value = value;
    this.children = children;
  }
}

// Node types
const NodeTypes = {
  LITERAL: 'LITERAL',
  FIELD: 'FIELD',
  FUNCTION: 'FUNCTION',
  BINARY_OP: 'BINARY_OP',
  UNARY_OP: 'UNARY_OP'
};
```

### 3. Parser (Recursive Descent)

```javascript
class FormulaParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  parse() {
    try {
      const ast = this.parseExpression();
      if (this.position < this.tokens.length) {
        throw new Error(`Unexpected token at position ${this.position}: ${this.currentToken().value}`);
      }
      return ast;
    } catch (error) {
      throw new Error(`Parse error: ${error.message}`);
    }
  }

  parseExpression() {
    return this.parseOrExpression();
  }

  parseOrExpression() {
    let left = this.parseAndExpression();

    while (this.currentToken() && this.currentToken().value === 'OR') {
      this.consume('FUNCTION'); // OR is treated as function
      const right = this.parseAndExpression();
      left = new ASTNode(NodeTypes.FUNCTION, 'OR', [left, right]);
    }

    return left;
  }

  parseAndExpression() {
    let left = this.parseEqualityExpression();

    while (this.currentToken() && this.currentToken().value === 'AND') {
      this.consume('FUNCTION'); // AND is treated as function
      const right = this.parseEqualityExpression();
      left = new ASTNode(NodeTypes.FUNCTION, 'AND', [left, right]);
    }

    return left;
  }

  parseEqualityExpression() {
    let left = this.parseRelationalExpression();

    while (this.currentToken() && ['=', '<>'].includes(this.currentToken().value)) {
      const operator = this.consume('OPERATOR').value;
      const right = this.parseRelationalExpression();
      left = new ASTNode(NodeTypes.BINARY_OP, operator, [left, right]);
    }

    return left;
  }

  parseRelationalExpression() {
    let left = this.parseAdditiveExpression();

    while (this.currentToken() && ['<', '>', '<=', '>='].includes(this.currentToken().value)) {
      const operator = this.consume('OPERATOR').value;
      const right = this.parseAdditiveExpression();
      left = new ASTNode(NodeTypes.BINARY_OP, operator, [left, right]);
    }

    return left;
  }

  parseAdditiveExpression() {
    let left = this.parseMultiplicativeExpression();

    while (this.currentToken() && ['+', '-'].includes(this.currentToken().value)) {
      const operator = this.consume('OPERATOR').value;
      const right = this.parseMultiplicativeExpression();
      left = new ASTNode(NodeTypes.BINARY_OP, operator, [left, right]);
    }

    return left;
  }

  parseMultiplicativeExpression() {
    let left = this.parseUnaryExpression();

    while (this.currentToken() && ['*', '/'].includes(this.currentToken().value)) {
      const operator = this.consume('OPERATOR').value;
      const right = this.parseUnaryExpression();
      left = new ASTNode(NodeTypes.BINARY_OP, operator, [left, right]);
    }

    return left;
  }

  parseUnaryExpression() {
    if (this.currentToken() && this.currentToken().value === 'NOT') {
      this.consume('FUNCTION');
      const operand = this.parseUnaryExpression();
      return new ASTNode(NodeTypes.FUNCTION, 'NOT', [operand]);
    }

    return this.parsePrimaryExpression();
  }

  parsePrimaryExpression() {
    const token = this.currentToken();

    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    switch (token.type) {
      case 'NUMBER':
        this.advance();
        return new ASTNode(NodeTypes.LITERAL, token.value);

      case 'STRING':
        this.advance();
        return new ASTNode(NodeTypes.LITERAL, token.value);

      case 'FIELD':
        this.advance();
        return new ASTNode(NodeTypes.FIELD, token.value);

      case 'FUNCTION':
        return this.parseFunctionCall();

      case 'LPAREN':
        this.consume('LPAREN');
        const expr = this.parseExpression();
        this.consume('RPAREN');
        return expr;

      default:
        throw new Error(`Unexpected token: ${token.value}`);
    }
  }

  parseFunctionCall() {
    const functionName = this.consume('FUNCTION').value;
    this.consume('LPAREN');

    const args = [];

    if (this.currentToken() && this.currentToken().type !== 'RPAREN') {
      args.push(this.parseExpression());

      while (this.currentToken() && this.currentToken().type === 'COMMA') {
        this.consume('COMMA');
        args.push(this.parseExpression());
      }
    }

    this.consume('RPAREN');

    return new ASTNode(NodeTypes.FUNCTION, functionName, args);
  }

  currentToken() {
    return this.position < this.tokens.length ? this.tokens[this.position] : null;
  }

  advance() {
    this.position++;
  }

  consume(expectedType) {
    const token = this.currentToken();
    if (!token || token.type !== expectedType) {
      throw new Error(`Expected ${expectedType}, got ${token ? token.type : 'EOF'}`);
    }
    this.advance();
    return token;
  }
}
```

### 4. Evaluator Engine

```javascript
class FormulaEvaluator {
  constructor(formData) {
    this.formData = formData;
  }

  evaluate(ast) {
    try {
      return this.evaluateNode(ast);
    } catch (error) {
      throw new Error(`Evaluation error: ${error.message}`);
    }
  }

  evaluateNode(node) {
    switch (node.type) {
      case NodeTypes.LITERAL:
        return node.value;

      case NodeTypes.FIELD:
        return this.getFieldValue(node.value);

      case NodeTypes.FUNCTION:
        return this.evaluateFunction(node.value, node.children);

      case NodeTypes.BINARY_OP:
        return this.evaluateBinaryOperation(node.value, node.children);

      case NodeTypes.UNARY_OP:
        return this.evaluateUnaryOperation(node.value, node.children);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  getFieldValue(fieldName) {
    const value = this.formData[fieldName];
    return value !== undefined ? value : null;
  }

  evaluateFunction(functionName, args) {
    const evaluatedArgs = args.map(arg => this.evaluateNode(arg));

    switch (functionName) {
      case 'IF':
        if (args.length !== 3) throw new Error('IF requires exactly 3 arguments');
        return this.toBool(evaluatedArgs[0]) ? evaluatedArgs[1] : evaluatedArgs[2];

      case 'AND':
        return evaluatedArgs.every(arg => this.toBool(arg));

      case 'OR':
        return evaluatedArgs.some(arg => this.toBool(arg));

      case 'NOT':
        if (args.length !== 1) throw new Error('NOT requires exactly 1 argument');
        return !this.toBool(evaluatedArgs[0]);

      case 'CONTAINS':
        if (args.length !== 2) throw new Error('CONTAINS requires exactly 2 arguments');
        const [text, substring] = evaluatedArgs.map(v => this.toString(v));
        return text.toLowerCase().includes(substring.toLowerCase());

      case 'STARTS':
        if (args.length !== 2) throw new Error('STARTS requires exactly 2 arguments');
        const [startText, prefix] = evaluatedArgs.map(v => this.toString(v));
        return startText.toLowerCase().startsWith(prefix.toLowerCase());

      case 'ENDS':
        if (args.length !== 2) throw new Error('ENDS requires exactly 2 arguments');
        const [endText, suffix] = evaluatedArgs.map(v => this.toString(v));
        return endText.toLowerCase().endsWith(suffix.toLowerCase());

      case 'ISBLANK':
        if (args.length !== 1) throw new Error('ISBLANK requires exactly 1 argument');
        return this.isEmpty(evaluatedArgs[0]);

      case 'ISNOTBLANK':
        if (args.length !== 1) throw new Error('ISNOTBLANK requires exactly 1 argument');
        return !this.isEmpty(evaluatedArgs[0]);

      case 'TODAY':
        return new Date().toDateString();

      case 'NOW':
        return new Date().toISOString();

      case 'SUM':
        return evaluatedArgs.reduce((sum, val) => sum + this.toNumber(val), 0);

      case 'COUNT':
        return evaluatedArgs.filter(val => !this.isEmpty(val)).length;

      case 'AVERAGE':
        const validNumbers = evaluatedArgs.filter(val => !this.isEmpty(val)).map(val => this.toNumber(val));
        return validNumbers.length > 0 ? validNumbers.reduce((sum, val) => sum + val, 0) / validNumbers.length : 0;

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  evaluateBinaryOperation(operator, args) {
    if (args.length !== 2) throw new Error(`Binary operator ${operator} requires exactly 2 arguments`);

    const [left, right] = args.map(arg => this.evaluateNode(arg));

    switch (operator) {
      case '=':
        return this.equals(left, right);
      case '<>':
        return !this.equals(left, right);
      case '<':
        return this.toNumber(left) < this.toNumber(right);
      case '>':
        return this.toNumber(left) > this.toNumber(right);
      case '<=':
        return this.toNumber(left) <= this.toNumber(right);
      case '>=':
        return this.toNumber(left) >= this.toNumber(right);
      case '+':
        return this.toNumber(left) + this.toNumber(right);
      case '-':
        return this.toNumber(left) - this.toNumber(right);
      case '*':
        return this.toNumber(left) * this.toNumber(right);
      case '/':
        const rightNum = this.toNumber(right);
        if (rightNum === 0) throw new Error('Division by zero');
        return this.toNumber(left) / rightNum;
      default:
        throw new Error(`Unknown binary operator: ${operator}`);
    }
  }

  toBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value !== '';
    return value != null;
  }

  toNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
  }

  toString(value) {
    if (value == null) return '';
    return String(value);
  }

  isEmpty(value) {
    return value == null || value === '' || (Array.isArray(value) && value.length === 0);
  }

  equals(left, right) {
    if (typeof left === typeof right) {
      return left === right;
    }

    // Type coercion for comparisons
    if (typeof left === 'string' && typeof right === 'number') {
      return this.toNumber(left) === right;
    }
    if (typeof left === 'number' && typeof right === 'string') {
      return left === this.toNumber(right);
    }

    return left == right;
  }
}
```

## React Integration

### 1. Hook for Formula Evaluation

```javascript
// src/hooks/useFormulaEvaluator.js
import { useMemo, useCallback } from 'react';

export function useFormulaEvaluator(formData) {
  const evaluator = useMemo(() => {
    return new FormulaEvaluator(formData);
  }, [formData]);

  const evaluateFormula = useCallback((formula) => {
    try {
      const tokenizer = new FormulaTokenizer(formula);
      const tokens = tokenizer.tokenize();

      const parser = new FormulaParser(tokens);
      const ast = parser.parse();

      const result = evaluator.evaluate(ast);
      return { success: true, result, error: null };
    } catch (error) {
      return { success: false, result: null, error: error.message };
    }
  }, [evaluator]);

  return { evaluateFormula };
}
```

### 2. Field Visibility Component

```javascript
// src/components/ConditionalField.jsx
import React from 'react';
import { useFormulaEvaluator } from '../hooks/useFormulaEvaluator';

export function ConditionalField({ field, formData, children }) {
  const { evaluateFormula } = useFormulaEvaluator(formData);

  const isVisible = useMemo(() => {
    if (!field.visibilityFormula) return true;

    const { success, result, error } = evaluateFormula(field.visibilityFormula);

    if (!success) {
      console.warn(`Visibility formula error for field ${field.id}:`, error);
      return true; // Default to visible on error
    }

    return Boolean(result);
  }, [field.visibilityFormula, evaluateFormula]);

  if (!isVisible) return null;

  return <div className="conditional-field">{children}</div>;
}
```

### 3. Enhanced Form Builder

```javascript
// Add to EnhancedFormBuilder.jsx
const [fieldVisibilityFormulas, setFieldVisibilityFormulas] = useState({});

const handleVisibilityFormulaChange = (fieldId, formula) => {
  setFieldVisibilityFormulas(prev => ({
    ...prev,
    [fieldId]: formula
  }));

  // Update field configuration
  const updatedFields = fields.map(field =>
    field.id === fieldId
      ? { ...field, visibilityFormula: formula }
      : field
  );
  setFields(updatedFields);
};

// In field configuration panel
<div className="formula-section">
  <label className="text-sm font-medium">Visibility Formula</label>
  <textarea
    className="w-full p-2 border rounded text-sm font-mono"
    placeholder='e.g., IF([Status] = "Complete", TRUE, FALSE)'
    value={fieldVisibilityFormulas[selectedField?.id] || ''}
    onChange={(e) => handleVisibilityFormulaChange(selectedField?.id, e.target.value)}
  />
  <p className="text-xs text-muted-foreground mt-1">
    Use [FieldName] to reference other fields. Examples: AND([Age] > 18, [Country] = "Thailand")
  </p>
</div>
```

## Performance Optimizations

### 1. Memoized Evaluation

```javascript
// Memoize formula compilation
const formulaCache = new Map();

function getCompiledFormula(formula) {
  if (formulaCache.has(formula)) {
    return formulaCache.get(formula);
  }

  try {
    const tokenizer = new FormulaTokenizer(formula);
    const tokens = tokenizer.tokenize();
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();

    formulaCache.set(formula, { success: true, ast, error: null });
    return formulaCache.get(formula);
  } catch (error) {
    const result = { success: false, ast: null, error: error.message };
    formulaCache.set(formula, result);
    return result;
  }
}
```

### 2. Dependency Tracking

```javascript
// Track field dependencies for selective re-evaluation
function extractFieldDependencies(ast) {
  const dependencies = new Set();

  function traverse(node) {
    if (node.type === NodeTypes.FIELD) {
      dependencies.add(node.value);
    }
    node.children?.forEach(traverse);
  }

  traverse(ast);
  return Array.from(dependencies);
}
```

## Error Handling

### 1. Validation

```javascript
function validateFormula(formula, availableFields) {
  try {
    const { success, ast, error } = getCompiledFormula(formula);

    if (!success) {
      return { valid: false, error };
    }

    const dependencies = extractFieldDependencies(ast);
    const invalidFields = dependencies.filter(field => !availableFields.includes(field));

    if (invalidFields.length > 0) {
      return {
        valid: false,
        error: `Unknown fields: ${invalidFields.join(', ')}`
      };
    }

    return { valid: true, dependencies };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

### 2. Runtime Error Boundaries

```javascript
// Enhanced formula evaluation with error boundaries
function safeEvaluateFormula(formula, formData, defaultValue = false) {
  try {
    const { success, result, error } = evaluateFormula(formula);
    return success ? result : defaultValue;
  } catch (error) {
    console.error('Formula evaluation failed:', error);
    return defaultValue;
  }
}
```

## Priority Implementation Order

### Phase 1: Core Logical Functions
1. `IF(condition, then, else)`
2. `AND(condition1, condition2, ...)`
3. `OR(condition1, condition2, ...)`
4. `NOT(condition)`
5. Basic comparison operators (`=`, `<>`, `<`, `>`, `<=`, `>=`)

### Phase 2: Text Functions
1. `CONTAINS(text, substring)`
2. `ISBLANK(value)`
3. `ISNOTBLANK(value)`
4. `STARTS(text, prefix)`
5. `ENDS(text, suffix)`

### Phase 3: Advanced Features
1. Date/time functions (`TODAY()`, `NOW()`)
2. Math functions (`SUM()`, `COUNT()`, `AVERAGE()`)
3. Nested function calls
4. Complex expressions with multiple operators

### Phase 4: Optimization
1. Formula caching and memoization
2. Dependency tracking for selective updates
3. Performance monitoring and optimization
4. Advanced error handling and debugging tools

This implementation provides a solid foundation for AppSheet-style conditional visibility formulas in your React form builder, with room for gradual enhancement and optimization.