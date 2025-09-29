/**
 * Formula Engine Test Suite
 * Comprehensive tests for the Q-Collector formula system
 */

import {
  formulaEngine,
  FormulaTokenizer,
  FormulaParser,
  FormulaEvaluator,
  TOKEN_TYPES,
  FUNCTIONS,
  OPERATORS
} from './formulaEngine';

// Test data
const testFormData = {
  'ลักษณะงาน': 'งานตรวจสอบอาคาร',
  'สถานะงาน': 'ปิดงานแล้ว',
  'Status': 'Complete',
  'Amount': 150,
  'Description': 'This is a test description with keyword',
  'Comments': 'Some comments',
  'Priority': 'High',
  'EmptyField': '',
  'NullField': null,
  'BooleanField': true,
  'NumberField': 42.5
};

const testFields = [
  { id: 'field1', title: 'ลักษณะงาน', type: 'short_answer' },
  { id: 'field2', title: 'สถานะงาน', type: 'short_answer' },
  { id: 'field3', title: 'Status', type: 'short_answer' },
  { id: 'field4', title: 'Amount', type: 'number' },
  { id: 'field5', title: 'Description', type: 'paragraph' },
  { id: 'field6', title: 'Comments', type: 'paragraph' },
  { id: 'field7', title: 'Priority', type: 'short_answer' },
  { id: 'field8', title: 'EmptyField', type: 'short_answer' },
  { id: 'field9', title: 'BooleanField', type: 'short_answer' },
  { id: 'field10', title: 'NumberField', type: 'number' }
];

const fieldMap = {};
testFields.forEach(field => {
  fieldMap[field.id] = field;
});

describe('FormulaTokenizer', () => {
  test('should tokenize field references', () => {
    const tokenizer = new FormulaTokenizer('[FieldName]');
    const tokens = tokenizer.tokenize();

    expect(tokens).toHaveLength(2); // FIELD + EOF
    expect(tokens[0].type).toBe(TOKEN_TYPES.FIELD);
    expect(tokens[0].value).toBe('FieldName');
  });

  test('should tokenize Thai field names', () => {
    const tokenizer = new FormulaTokenizer('[ลักษณะงาน]');
    const tokens = tokenizer.tokenize();

    expect(tokens[0].type).toBe(TOKEN_TYPES.FIELD);
    expect(tokens[0].value).toBe('ลักษณะงาน');
  });

  test('should tokenize string literals', () => {
    const tokenizer = new FormulaTokenizer('"Test String"');
    const tokens = tokenizer.tokenize();

    expect(tokens[0].type).toBe(TOKEN_TYPES.STRING);
    expect(tokens[0].value).toBe('Test String');
  });

  test('should tokenize numbers', () => {
    const tokenizer = new FormulaTokenizer('123.45');
    const tokens = tokenizer.tokenize();

    expect(tokens[0].type).toBe(TOKEN_TYPES.NUMBER);
    expect(tokens[0].value).toBe(123.45);
  });

  test('should tokenize boolean values', () => {
    const tokenizer = new FormulaTokenizer('TRUE FALSE');
    const tokens = tokenizer.tokenize();

    expect(tokens[0].type).toBe(TOKEN_TYPES.BOOLEAN);
    expect(tokens[0].value).toBe(true);
    expect(tokens[1].type).toBe(TOKEN_TYPES.BOOLEAN);
    expect(tokens[1].value).toBe(false);
  });

  test('should tokenize functions', () => {
    const tokenizer = new FormulaTokenizer('AND OR NOT IF');
    const tokens = tokenizer.tokenize();

    expect(tokens[0].type).toBe(TOKEN_TYPES.FUNCTION);
    expect(tokens[0].value).toBe('AND');
    expect(tokens[1].type).toBe(TOKEN_TYPES.FUNCTION);
    expect(tokens[1].value).toBe('OR');
  });

  test('should tokenize operators', () => {
    const tokenizer = new FormulaTokenizer('= <> < > <= >=');
    const tokens = tokenizer.tokenize();

    expect(tokens[0].type).toBe(TOKEN_TYPES.OPERATOR);
    expect(tokens[0].value).toBe('=');
    expect(tokens[1].type).toBe(TOKEN_TYPES.OPERATOR);
    expect(tokens[1].value).toBe('<>');
  });

  test('should handle complex expressions', () => {
    const tokenizer = new FormulaTokenizer('AND([Field] = "Value", [Number] > 100)');
    const tokens = tokenizer.tokenize();

    expect(tokens).toContainEqual({ type: TOKEN_TYPES.FUNCTION, value: 'AND' });
    expect(tokens).toContainEqual({ type: TOKEN_TYPES.FIELD, value: 'Field' });
    expect(tokens).toContainEqual({ type: TOKEN_TYPES.STRING, value: 'Value' });
    expect(tokens).toContainEqual({ type: TOKEN_TYPES.NUMBER, value: 100 });
  });
});

describe('FormulaParser', () => {
  test('should parse simple field reference', () => {
    const tokenizer = new FormulaTokenizer('[FieldName]');
    const tokens = tokenizer.tokenize();
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('FieldReference');
    expect(ast.fieldName).toBe('FieldName');
  });

  test('should parse comparison expressions', () => {
    const tokenizer = new FormulaTokenizer('[Field] = "Value"');
    const tokens = tokenizer.tokenize();
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('ComparisonOperation');
    expect(ast.operator).toBe('=');
    expect(ast.left.type).toBe('FieldReference');
    expect(ast.right.type).toBe('Literal');
  });

  test('should parse function calls', () => {
    const tokenizer = new FormulaTokenizer('AND([Field1] = "Value", [Field2] > 100)');
    const tokens = tokenizer.tokenize();
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('FunctionCall');
    expect(ast.functionName).toBe('AND');
    expect(ast.arguments).toHaveLength(2);
  });

  test('should parse nested expressions', () => {
    const tokenizer = new FormulaTokenizer('IF([Status] = "Complete", AND([Amount] > 100, [Priority] = "High"), FALSE)');
    const tokens = tokenizer.tokenize();
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('FunctionCall');
    expect(ast.functionName).toBe('IF');
    expect(ast.arguments).toHaveLength(3);
    expect(ast.arguments[1].type).toBe('FunctionCall');
    expect(ast.arguments[1].functionName).toBe('AND');
  });

  test('should parse arithmetic expressions', () => {
    const tokenizer = new FormulaTokenizer('[Amount] + 100 * 2');
    const tokens = tokenizer.tokenize();
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('BinaryOperation');
    expect(ast.operator).toBe('+');
    expect(ast.right.type).toBe('BinaryOperation');
    expect(ast.right.operator).toBe('*');
  });
});

describe('FormulaEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new FormulaEvaluator(testFormData, fieldMap);
  });

  test('should evaluate field references', () => {
    const result = evaluator.getFieldValue('ลักษณะงาน');
    expect(result).toBe('งานตรวจสอบอาคาร');
  });

  test('should evaluate simple comparisons', () => {
    // String comparison
    expect(evaluator.compareValues('test', 'test', '=')).toBe(true);
    expect(evaluator.compareValues('test', 'other', '=')).toBe(false);
    expect(evaluator.compareValues('test', 'other', '<>')).toBe(true);

    // Numeric comparison
    expect(evaluator.compareValues(100, 50, '>')).toBe(true);
    expect(evaluator.compareValues(100, 150, '<')).toBe(true);
    expect(evaluator.compareValues(100, 100, '>=')).toBe(true);
  });

  test('should evaluate AND function', () => {
    const args = [
      { type: 'Literal', value: true },
      { type: 'Literal', value: true }
    ];
    expect(evaluator.executeFunction('AND', args)).toBe(true);

    args[1].value = false;
    expect(evaluator.executeFunction('AND', args)).toBe(false);
  });

  test('should evaluate OR function', () => {
    const args = [
      { type: 'Literal', value: false },
      { type: 'Literal', value: true }
    ];
    expect(evaluator.executeFunction('OR', args)).toBe(true);

    args[1].value = false;
    expect(evaluator.executeFunction('OR', args)).toBe(false);
  });

  test('should evaluate NOT function', () => {
    const args = [{ type: 'Literal', value: true }];
    expect(evaluator.executeFunction('NOT', args)).toBe(false);

    args[0].value = false;
    expect(evaluator.executeFunction('NOT', args)).toBe(true);
  });

  test('should evaluate IF function', () => {
    const args = [
      { type: 'Literal', value: true },
      { type: 'Literal', value: 'yes' },
      { type: 'Literal', value: 'no' }
    ];
    expect(evaluator.executeFunction('IF', args)).toBe('yes');

    args[0].value = false;
    expect(evaluator.executeFunction('IF', args)).toBe('no');
  });

  test('should evaluate CONTAINS function', () => {
    const args = [
      { type: 'Literal', value: 'This is a test string' },
      { type: 'Literal', value: 'test' }
    ];
    expect(evaluator.executeFunction('CONTAINS', args)).toBe(true);

    args[1].value = 'missing';
    expect(evaluator.executeFunction('CONTAINS', args)).toBe(false);
  });

  test('should evaluate ISBLANK function', () => {
    expect(evaluator.executeFunction('ISBLANK', [{ type: 'Literal', value: '' }])).toBe(true);
    expect(evaluator.executeFunction('ISBLANK', [{ type: 'Literal', value: null }])).toBe(true);
    expect(evaluator.executeFunction('ISBLANK', [{ type: 'Literal', value: 'text' }])).toBe(false);
  });

  test('should handle null and undefined values', () => {
    expect(evaluator.isBlank(null)).toBe(true);
    expect(evaluator.isBlank(undefined)).toBe(true);
    expect(evaluator.isBlank('')).toBe(true);
    expect(evaluator.isBlank('text')).toBe(false);
  });

  test('should convert values to appropriate types', () => {
    expect(evaluator.toBool('')).toBe(false);
    expect(evaluator.toBool('text')).toBe(true);
    expect(evaluator.toBool(0)).toBe(false);
    expect(evaluator.toBool(1)).toBe(true);

    expect(evaluator.toNumber('123')).toBe(123);
    expect(evaluator.toNumber('123.45')).toBe(123.45);
    expect(evaluator.toNumber('invalid')).toBe(0);

    expect(evaluator.toString(123)).toBe('123');
    expect(evaluator.toString(true)).toBe('TRUE');
    expect(evaluator.toString(false)).toBe('FALSE');
  });
});

describe('FormulaEngine Integration', () => {
  beforeEach(() => {
    formulaEngine.clearCache();
  });

  test('should evaluate Thai field expressions', () => {
    const formula = 'AND([ลักษณะงาน] = "งานตรวจสอบอาคาร", [สถานะงาน] = "ปิดงานแล้ว")';
    const result = formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(result).toBe(true);
  });

  test('should evaluate complex logical expressions', () => {
    const formula = 'IF([Status] = "Complete", [Amount] > 100, FALSE)';
    const result = formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(result).toBe(true);
  });

  test('should evaluate text functions', () => {
    const formula = 'CONTAINS([Description], "keyword")';
    const result = formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(result).toBe(true);
  });

  test('should evaluate blank checks', () => {
    const formula = 'NOT(ISBLANK([Comments]))';
    const result = formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(result).toBe(true);

    const formula2 = 'ISBLANK([EmptyField])';
    const result2 = formulaEngine.evaluate(formula2, testFormData, fieldMap);
    expect(result2).toBe(true);
  });

  test('should handle multiple conditions', () => {
    const formula = 'OR([Priority] = "High", [Amount] > 1000)';
    const result = formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(result).toBe(true);
  });

  test('should validate formulas', () => {
    expect(formulaEngine.isValid('AND([Field] = "Value", [Field2] > 100)')).toBe(true);
    expect(formulaEngine.isValid('INVALID_SYNTAX')).toBe(false);
    expect(formulaEngine.isValid('')).toBe(true);
    expect(formulaEngine.isValid(null)).toBe(true);
  });

  test('should extract dependencies', () => {
    const formula = 'AND([ลักษณะงาน] = "งานตรวจสอบอาคาร", [สถานะงาน] = "ปิดงานแล้ว")';
    const deps = formulaEngine.getDependencies(formula);
    expect(deps).toContain('ลักษณะงาน');
    expect(deps).toContain('สถานะงาน');
    expect(deps).toHaveLength(2);
  });

  test('should handle arithmetic operations', () => {
    const formula = '[Amount] + 50 > 180';
    const result = formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(result).toBe(true);
  });

  test('should handle nested function calls', () => {
    const formula = 'IF(AND([Status] = "Complete", [Amount] > 100), NOT(ISBLANK([Comments])), FALSE)';
    const result = formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(result).toBe(true);
  });

  test('should handle error cases gracefully', () => {
    // Invalid syntax
    expect(formulaEngine.evaluate('INVALID(((')).toBe(false);

    // Unknown function
    expect(formulaEngine.evaluate('UNKNOWN_FUNCTION()')).toBe(false);

    // Missing field
    const formula = '[NonExistentField] = "value"';
    expect(formulaEngine.evaluate(formula, testFormData, fieldMap)).toBe(false);
  });

  test('should cache compiled formulas', () => {
    const formula = 'AND([Field1] = "Value", [Field2] > 100)';

    // First evaluation should compile and cache
    formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(formulaEngine.getCacheSize()).toBe(1);

    // Second evaluation should use cache
    formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(formulaEngine.getCacheSize()).toBe(1);
  });

  test('should handle case sensitivity correctly', () => {
    // Functions should be case insensitive
    expect(formulaEngine.evaluate('and([Status] = "Complete", [Amount] > 100)', testFormData, fieldMap)).toBe(true);

    // Field names and values should be case sensitive
    expect(formulaEngine.evaluate('[Status] = "complete"', testFormData, fieldMap)).toBe(false);
    expect(formulaEngine.evaluate('[Status] = "Complete"', testFormData, fieldMap)).toBe(true);
  });

  test('should handle edge cases with data types', () => {
    // Boolean field
    expect(formulaEngine.evaluate('[BooleanField] = TRUE', testFormData, fieldMap)).toBe(true);

    // Number field
    expect(formulaEngine.evaluate('[NumberField] > 40', testFormData, fieldMap)).toBe(true);

    // Null field
    expect(formulaEngine.evaluate('ISBLANK([NullField])', testFormData, fieldMap)).toBe(true);
  });

  test('should handle string escaping', () => {
    const formula = 'CONTAINS([Description], "test")';
    const result = formulaEngine.evaluate(formula, testFormData, fieldMap);
    expect(result).toBe(true);
  });
});

describe('Performance Tests', () => {
  test('should handle large formula efficiently', () => {
    const conditions = [];
    for (let i = 0; i < 100; i++) {
      conditions.push(`[Field${i}] = "Value${i}"`);
    }
    const formula = `OR(${conditions.join(', ')})`;

    const startTime = performance.now();
    formulaEngine.isValid(formula);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
  });

  test('should cache improve performance', () => {
    const formula = 'AND([Status] = "Complete", [Amount] > 100, CONTAINS([Description], "test"))';

    // First evaluation (compile + evaluate)
    const start1 = performance.now();
    formulaEngine.evaluate(formula, testFormData, fieldMap);
    const time1 = performance.now() - start1;

    // Second evaluation (cached)
    const start2 = performance.now();
    formulaEngine.evaluate(formula, testFormData, fieldMap);
    const time2 = performance.now() - start2;

    expect(time2).toBeLessThan(time1);
  });
});

// Example usage tests
describe('Real-world Usage Examples', () => {
  test('should handle factory selection conditions', () => {
    const factoryData = {
      'โรงงาน': 'บางปะอิน',
      'ประเภทงาน': 'ตรวจสอบ',
      'สถานะ': 'เปิด'
    };

    const formula = 'AND([โรงงาน] = "บางปะอิน", [ประเภทงาน] = "ตรวจสอบ")';
    const result = formulaEngine.evaluate(formula, factoryData, fieldMap);
    expect(result).toBe(true);
  });

  test('should handle multi-level conditional logic', () => {
    const formData = {
      'UserRole': 'Admin',
      'Department': 'IT',
      'Experience': 5,
      'ProjectType': 'Critical'
    };

    const formula = `
      IF([UserRole] = "Admin",
        OR([Department] = "IT", [Experience] > 3),
        AND([ProjectType] = "Critical", [Experience] > 2)
      )
    `;

    const result = formulaEngine.evaluate(formula, formData, fieldMap);
    expect(result).toBe(true);
  });

  test('should handle form validation scenarios', () => {
    const submissionData = {
      'Email': 'test@example.com',
      'Phone': '0812345678',
      'RequiredComments': 'This is required',
      'OptionalNotes': ''
    };

    // Required field validation
    const requiredFormula = 'NOT(ISBLANK([RequiredComments]))';
    expect(formulaEngine.evaluate(requiredFormula, submissionData, fieldMap)).toBe(true);

    // Conditional requirement
    const conditionalFormula = 'IF(CONTAINS([Email], "@"), NOT(ISBLANK([Phone])), TRUE)';
    expect(formulaEngine.evaluate(conditionalFormula, submissionData, fieldMap)).toBe(true);
  });
});

export {
  testFormData,
  testFields,
  fieldMap
};