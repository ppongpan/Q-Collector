/**
 * Formula Engine for Q-Collector Framework v0.2
 * Google AppSheet-compatible formula parser and evaluator
 * Supports Thai field names and complex logical expressions
 */

// Token types for lexical analysis
const TOKEN_TYPES = {
  FIELD: 'FIELD',           // [FieldName]
  STRING: 'STRING',         // "text"
  NUMBER: 'NUMBER',         // 123, 123.45
  BOOLEAN: 'BOOLEAN',       // TRUE, FALSE
  FUNCTION: 'FUNCTION',     // AND, OR, NOT, IF, etc.
  OPERATOR: 'OPERATOR',     // =, <>, <, >, <=, >=
  PLUS: 'PLUS',            // +
  MINUS: 'MINUS',          // -
  MULTIPLY: 'MULTIPLY',    // *
  DIVIDE: 'DIVIDE',        // /
  LPAREN: 'LPAREN',        // (
  RPAREN: 'RPAREN',        // )
  COMMA: 'COMMA',          // ,
  EOF: 'EOF'               // End of input
};

// Supported functions
const FUNCTIONS = {
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  IF: 'IF',
  CONTAINS: 'CONTAINS',
  ISBLANK: 'ISBLANK',
  ISNOTBLANK: 'ISNOTBLANK',
  UPPER: 'UPPER',
  LOWER: 'LOWER',
  TRIM: 'TRIM',
  LEN: 'LEN'
};

// Comparison operators
const OPERATORS = {
  EQUAL: '=',
  NOT_EQUAL: '<>',
  LESS_THAN: '<',
  GREATER_THAN: '>',
  LESS_EQUAL: '<=',
  GREATER_EQUAL: '>='
};

/**
 * Tokenizer - Converts formula string into tokens
 */
class FormulaTokenizer {
  constructor(formula) {
    this.formula = formula || '';
    this.position = 0;
    this.currentChar = this.formula[this.position];
  }

  error(message) {
    throw new Error(`Tokenizer Error at position ${this.position}: ${message}`);
  }

  advance() {
    this.position++;
    this.currentChar = this.position < this.formula.length ? this.formula[this.position] : null;
  }

  skipWhitespace() {
    while (this.currentChar && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  readString() {
    let result = '';
    this.advance(); // Skip opening quote

    while (this.currentChar && this.currentChar !== '"') {
      if (this.currentChar === '\\') {
        this.advance();
        if (this.currentChar === '"') {
          result += '"';
        } else if (this.currentChar === '\\') {
          result += '\\';
        } else {
          result += this.currentChar;
        }
      } else {
        result += this.currentChar;
      }
      this.advance();
    }

    if (this.currentChar !== '"') {
      this.error('Unterminated string literal');
    }

    this.advance(); // Skip closing quote
    return result;
  }

  readNumber() {
    let result = '';
    let hasDecimal = false;

    while (this.currentChar && (/\d/.test(this.currentChar) || this.currentChar === '.')) {
      if (this.currentChar === '.') {
        if (hasDecimal) break;
        hasDecimal = true;
      }
      result += this.currentChar;
      this.advance();
    }

    return hasDecimal ? parseFloat(result) : parseInt(result, 10);
  }

  readField() {
    let result = '';
    this.advance(); // Skip opening bracket

    while (this.currentChar && this.currentChar !== ']') {
      result += this.currentChar;
      this.advance();
    }

    if (this.currentChar !== ']') {
      this.error('Unterminated field reference');
    }

    this.advance(); // Skip closing bracket
    return result.trim();
  }

  readIdentifier() {
    let result = '';

    while (this.currentChar && (/\w/.test(this.currentChar) || /[\u0E00-\u0E7F]/.test(this.currentChar))) {
      result += this.currentChar;
      this.advance();
    }

    return result.toUpperCase();
  }

  readOperator() {
    if (this.currentChar === '<') {
      this.advance();
      if (this.currentChar === '=') {
        this.advance();
        return '<=';
      } else if (this.currentChar === '>') {
        this.advance();
        return '<>';
      }
      return '<';
    }

    if (this.currentChar === '>') {
      this.advance();
      if (this.currentChar === '=') {
        this.advance();
        return '>=';
      }
      return '>';
    }

    if (this.currentChar === '=') {
      this.advance();
      return '=';
    }

    this.error(`Invalid operator: ${this.currentChar}`);
  }

  getNextToken() {
    while (this.currentChar) {
      if (/\s/.test(this.currentChar)) {
        this.skipWhitespace();
        continue;
      }

      if (this.currentChar === '"') {
        return {
          type: TOKEN_TYPES.STRING,
          value: this.readString()
        };
      }

      if (/\d/.test(this.currentChar)) {
        return {
          type: TOKEN_TYPES.NUMBER,
          value: this.readNumber()
        };
      }

      if (this.currentChar === '[') {
        return {
          type: TOKEN_TYPES.FIELD,
          value: this.readField()
        };
      }

      if (/[a-zA-Z\u0E00-\u0E7F]/.test(this.currentChar)) {
        const identifier = this.readIdentifier();

        if (identifier === 'TRUE') {
          return { type: TOKEN_TYPES.BOOLEAN, value: true };
        }

        if (identifier === 'FALSE') {
          return { type: TOKEN_TYPES.BOOLEAN, value: false };
        }

        if (FUNCTIONS[identifier]) {
          return { type: TOKEN_TYPES.FUNCTION, value: identifier };
        }

        this.error(`Unknown identifier: ${identifier}`);
      }

      if (['<', '>', '='].includes(this.currentChar)) {
        return {
          type: TOKEN_TYPES.OPERATOR,
          value: this.readOperator()
        };
      }

      if (this.currentChar === '+') {
        this.advance();
        return { type: TOKEN_TYPES.PLUS, value: '+' };
      }

      if (this.currentChar === '-') {
        this.advance();
        return { type: TOKEN_TYPES.MINUS, value: '-' };
      }

      if (this.currentChar === '*') {
        this.advance();
        return { type: TOKEN_TYPES.MULTIPLY, value: '*' };
      }

      if (this.currentChar === '/') {
        this.advance();
        return { type: TOKEN_TYPES.DIVIDE, value: '/' };
      }

      if (this.currentChar === '(') {
        this.advance();
        return { type: TOKEN_TYPES.LPAREN, value: '(' };
      }

      if (this.currentChar === ')') {
        this.advance();
        return { type: TOKEN_TYPES.RPAREN, value: ')' };
      }

      if (this.currentChar === ',') {
        this.advance();
        return { type: TOKEN_TYPES.COMMA, value: ',' };
      }

      this.error(`Unexpected character: ${this.currentChar}`);
    }

    return { type: TOKEN_TYPES.EOF, value: null };
  }

  tokenize() {
    const tokens = [];
    let token = this.getNextToken();

    while (token.type !== TOKEN_TYPES.EOF) {
      tokens.push(token);
      token = this.getNextToken();
    }

    tokens.push(token); // Add EOF token
    return tokens;
  }
}

/**
 * Parser - Converts tokens into Abstract Syntax Tree (AST)
 */
class FormulaParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
    this.currentToken = this.tokens[this.position];
  }

  error(message) {
    throw new Error(`Parser Error at token ${this.position}: ${message}`);
  }

  advance() {
    this.position++;
    this.currentToken = this.position < this.tokens.length ? this.tokens[this.position] : null;
  }

  eat(tokenType) {
    if (this.currentToken?.type === tokenType) {
      this.advance();
    } else {
      this.error(`Expected ${tokenType}, got ${this.currentToken?.type}`);
    }
  }

  // Parse primary expressions (literals, fields, function calls, parentheses)
  parsePrimary() {
    const token = this.currentToken;

    if (token.type === TOKEN_TYPES.STRING) {
      this.advance();
      return { type: 'Literal', valueType: 'string', value: token.value };
    }

    if (token.type === TOKEN_TYPES.NUMBER) {
      this.advance();
      return { type: 'Literal', valueType: 'number', value: token.value };
    }

    if (token.type === TOKEN_TYPES.BOOLEAN) {
      this.advance();
      return { type: 'Literal', valueType: 'boolean', value: token.value };
    }

    if (token.type === TOKEN_TYPES.FIELD) {
      this.advance();
      return { type: 'FieldReference', fieldName: token.value };
    }

    if (token.type === TOKEN_TYPES.FUNCTION) {
      return this.parseFunctionCall();
    }

    if (token.type === TOKEN_TYPES.LPAREN) {
      this.advance();
      const expr = this.parseLogicalOr();
      this.eat(TOKEN_TYPES.RPAREN);
      return expr;
    }

    this.error(`Unexpected token: ${token.type}`);
  }

  // Parse function calls
  parseFunctionCall() {
    const functionName = this.currentToken.value;
    this.advance();
    this.eat(TOKEN_TYPES.LPAREN);

    const args = [];

    if (this.currentToken.type !== TOKEN_TYPES.RPAREN) {
      args.push(this.parseLogicalOr());

      while (this.currentToken.type === TOKEN_TYPES.COMMA) {
        this.advance();
        args.push(this.parseLogicalOr());
      }
    }

    this.eat(TOKEN_TYPES.RPAREN);

    return {
      type: 'FunctionCall',
      functionName,
      arguments: args
    };
  }

  // Parse arithmetic expressions (*, /)
  parseArithmetic() {
    let left = this.parsePrimary();

    while (this.currentToken &&
           [TOKEN_TYPES.MULTIPLY, TOKEN_TYPES.DIVIDE].includes(this.currentToken.type)) {
      const operator = this.currentToken.value;
      this.advance();
      const right = this.parsePrimary();

      left = {
        type: 'BinaryOperation',
        operator,
        left,
        right
      };
    }

    return left;
  }

  // Parse addition/subtraction
  parseAddition() {
    let left = this.parseArithmetic();

    while (this.currentToken &&
           [TOKEN_TYPES.PLUS, TOKEN_TYPES.MINUS].includes(this.currentToken.type)) {
      const operator = this.currentToken.value;
      this.advance();
      const right = this.parseArithmetic();

      left = {
        type: 'BinaryOperation',
        operator,
        left,
        right
      };
    }

    return left;
  }

  // Parse comparison operations
  parseComparison() {
    let left = this.parseAddition();

    while (this.currentToken && this.currentToken.type === TOKEN_TYPES.OPERATOR) {
      const operator = this.currentToken.value;
      this.advance();
      const right = this.parseAddition();

      left = {
        type: 'ComparisonOperation',
        operator,
        left,
        right
      };
    }

    return left;
  }

  // Parse logical AND
  parseLogicalAnd() {
    let left = this.parseComparison();

    // Handle implicit AND in function calls like AND(expr1, expr2, expr3)
    return left;
  }

  // Parse logical OR
  parseLogicalOr() {
    let left = this.parseLogicalAnd();

    // Handle implicit OR in function calls like OR(expr1, expr2, expr3)
    return left;
  }

  parse() {
    if (this.tokens.length === 0 || (this.tokens.length === 1 && this.tokens[0].type === TOKEN_TYPES.EOF)) {
      return null;
    }

    const ast = this.parseLogicalOr();

    if (this.currentToken.type !== TOKEN_TYPES.EOF) {
      this.error('Unexpected tokens after expression');
    }

    return ast;
  }
}

/**
 * Evaluator - Executes AST against form data
 */
class FormulaEvaluator {
  constructor(formData = {}, fieldMap = {}) {
    this.formData = formData;
    this.fieldMap = fieldMap; // Map of field IDs to field objects
  }

  error(message) {
    throw new Error(`Evaluator Error: ${message}`);
  }

  // Get field value with proper type conversion
  getFieldValue(fieldName) {
    // Try direct field name match first
    if (this.formData.hasOwnProperty(fieldName)) {
      return this.formData[fieldName];
    }

    // Try to find field by title/name in fieldMap
    const field = Object.values(this.fieldMap).find(f =>
      f.title === fieldName || f.name === fieldName || f.id === fieldName
    );

    if (field && this.formData.hasOwnProperty(field.id)) {
      return this.formData[field.id];
    }

    // Return null for missing fields
    return null;
  }

  // Convert value to boolean for logical operations
  toBool(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  }

  // Convert value to string for string operations
  toString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    return String(value);
  }

  // Convert value to number for arithmetic operations
  toNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  // Check if value is blank/empty
  isBlank(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  // Compare two values
  compareValues(left, right, operator) {
    // Handle null/undefined cases
    if (left === null && right === null) {
      return operator === '=' || operator === '<=' || operator === '>=';
    }
    if (left === null || right === null) {
      return operator === '<>' || operator === '!=';
    }

    // String comparison
    if (typeof left === 'string' || typeof right === 'string') {
      const leftStr = this.toString(left);
      const rightStr = this.toString(right);

      switch (operator) {
        case '=': return leftStr === rightStr;
        case '<>': return leftStr !== rightStr;
        case '<': return leftStr < rightStr;
        case '>': return leftStr > rightStr;
        case '<=': return leftStr <= rightStr;
        case '>=': return leftStr >= rightStr;
        default: this.error(`Unknown operator: ${operator}`);
      }
    }

    // Numeric comparison
    const leftNum = this.toNumber(left);
    const rightNum = this.toNumber(right);

    switch (operator) {
      case '=': return leftNum === rightNum;
      case '<>': return leftNum !== rightNum;
      case '<': return leftNum < rightNum;
      case '>': return leftNum > rightNum;
      case '<=': return leftNum <= rightNum;
      case '>=': return leftNum >= rightNum;
      default: this.error(`Unknown operator: ${operator}`);
    }
  }

  // Execute function calls
  executeFunction(functionName, args) {
    switch (functionName) {
      case 'AND':
        return args.every(arg => this.toBool(this.evaluate(arg)));

      case 'OR':
        return args.some(arg => this.toBool(this.evaluate(arg)));

      case 'NOT':
        if (args.length !== 1) {
          this.error('NOT function requires exactly 1 argument');
        }
        return !this.toBool(this.evaluate(args[0]));

      case 'IF':
        if (args.length !== 3) {
          this.error('IF function requires exactly 3 arguments');
        }
        const condition = this.toBool(this.evaluate(args[0]));
        return condition ? this.evaluate(args[1]) : this.evaluate(args[2]);

      case 'CONTAINS':
        if (args.length !== 2) {
          this.error('CONTAINS function requires exactly 2 arguments');
        }
        const text = this.toString(this.evaluate(args[0]));
        const searchText = this.toString(this.evaluate(args[1]));
        return text.toLowerCase().includes(searchText.toLowerCase());

      case 'ISBLANK':
        if (args.length !== 1) {
          this.error('ISBLANK function requires exactly 1 argument');
        }
        return this.isBlank(this.evaluate(args[0]));

      case 'ISNOTBLANK':
        if (args.length !== 1) {
          this.error('ISNOTBLANK function requires exactly 1 argument');
        }
        return !this.isBlank(this.evaluate(args[0]));

      case 'UPPER':
        if (args.length !== 1) {
          this.error('UPPER function requires exactly 1 argument');
        }
        return this.toString(this.evaluate(args[0])).toUpperCase();

      case 'LOWER':
        if (args.length !== 1) {
          this.error('LOWER function requires exactly 1 argument');
        }
        return this.toString(this.evaluate(args[0])).toLowerCase();

      case 'TRIM':
        if (args.length !== 1) {
          this.error('TRIM function requires exactly 1 argument');
        }
        return this.toString(this.evaluate(args[0])).trim();

      case 'LEN':
        if (args.length !== 1) {
          this.error('LEN function requires exactly 1 argument');
        }
        return this.toString(this.evaluate(args[0])).length;

      default:
        this.error(`Unknown function: ${functionName}`);
    }
  }

  // Main evaluation method
  evaluate(node) {
    if (!node) return null;

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'FieldReference':
        return this.getFieldValue(node.fieldName);

      case 'BinaryOperation':
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);

        switch (node.operator) {
          case '+': return this.toNumber(left) + this.toNumber(right);
          case '-': return this.toNumber(left) - this.toNumber(right);
          case '*': return this.toNumber(left) * this.toNumber(right);
          case '/':
            const rightNum = this.toNumber(right);
            if (rightNum === 0) this.error('Division by zero');
            return this.toNumber(left) / rightNum;
          default: this.error(`Unknown binary operator: ${node.operator}`);
        }

      case 'ComparisonOperation':
        const leftVal = this.evaluate(node.left);
        const rightVal = this.evaluate(node.right);
        return this.compareValues(leftVal, rightVal, node.operator);

      case 'FunctionCall':
        return this.executeFunction(node.functionName, node.arguments);

      default:
        this.error(`Unknown node type: ${node.type}`);
    }
  }
}

/**
 * Main Formula Engine class
 */
class FormulaEngine {
  constructor() {
    this.cache = new Map(); // Cache for compiled formulas
  }

  // Compile formula into AST
  compile(formula) {
    if (!formula || typeof formula !== 'string') {
      return null;
    }

    // Check cache first
    if (this.cache.has(formula)) {
      return this.cache.get(formula);
    }

    try {
      const tokenizer = new FormulaTokenizer(formula);
      const tokens = tokenizer.tokenize();

      const parser = new FormulaParser(tokens);
      const ast = parser.parse();

      // Cache the compiled result
      this.cache.set(formula, ast);

      return ast;
    } catch (error) {
      console.error('Formula compilation error:', error.message);
      return null;
    }
  }

  // Evaluate formula against form data
  evaluate(formula, formData = {}, fieldMap = {}) {
    try {
      let ast;

      // If formula is already compiled (AST object), use it directly
      if (typeof formula === 'object' && formula !== null && formula.type) {
        ast = formula;
      } else {
        // Otherwise compile the formula string
        ast = this.compile(formula);
      }

      if (!ast) {
        return false; // Default to false for invalid formulas
      }

      const evaluator = new FormulaEvaluator(formData, fieldMap);
      const result = evaluator.evaluate(ast);

      // Convert result to boolean for conditional visibility
      return evaluator.toBool(result);
    } catch (error) {
      console.error('Formula evaluation error:', error.message);
      return false; // Default to false on errors
    }
  }

  // Test if formula is valid
  isValid(formula) {
    try {
      const ast = this.compile(formula);
      return ast !== null;
    } catch (error) {
      return false;
    }
  }

  // Get formula dependencies (field references)
  getDependencies(formula) {
    const dependencies = new Set();

    try {
      const ast = this.compile(formula);
      if (!ast) return [];

      this._extractDependencies(ast, dependencies);
      return Array.from(dependencies);
    } catch (error) {
      console.error('Error extracting dependencies:', error.message);
      return [];
    }
  }

  _extractDependencies(node, dependencies) {
    if (!node) return;

    if (node.type === 'FieldReference') {
      dependencies.add(node.fieldName);
    } else if (node.type === 'FunctionCall') {
      node.arguments.forEach(arg => this._extractDependencies(arg, dependencies));
    } else if (node.type === 'BinaryOperation' || node.type === 'ComparisonOperation') {
      this._extractDependencies(node.left, dependencies);
      this._extractDependencies(node.right, dependencies);
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache size for debugging
  getCacheSize() {
    return this.cache.size;
  }
}

// Export singleton instance for CommonJS (Node.js backend)
const formulaEngine = new FormulaEngine();

module.exports = formulaEngine;
module.exports.formulaEngine = formulaEngine;
module.exports.FormulaTokenizer = FormulaTokenizer;
module.exports.FormulaParser = FormulaParser;
module.exports.FormulaEvaluator = FormulaEvaluator;
module.exports.FormulaEngine = FormulaEngine;
module.exports.TOKEN_TYPES = TOKEN_TYPES;
module.exports.FUNCTIONS = FUNCTIONS;
module.exports.OPERATORS = OPERATORS;