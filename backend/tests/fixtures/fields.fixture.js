/**
 * Field Test Fixtures
 * Sample field data for testing
 */

module.exports = {
  // Text field types
  shortAnswer: {
    type: 'short_answer',
    title: 'Short Answer Field',
    placeholder: 'Enter your answer',
    required: false,
    order: 0,
    options: {},
  },

  paragraph: {
    type: 'paragraph',
    title: 'Paragraph Field',
    placeholder: 'Enter detailed response',
    required: false,
    order: 1,
    options: { minLength: 10, maxLength: 1000 },
  },

  // Input field types
  email: {
    type: 'email',
    title: 'Email Address',
    placeholder: 'example@domain.com',
    required: true,
    order: 2,
    options: {},
  },

  phone: {
    type: 'phone',
    title: 'Phone Number',
    placeholder: '0812345678',
    required: true,
    order: 3,
    options: { format: 'thai' },
  },

  number: {
    type: 'number',
    title: 'Number Field',
    placeholder: 'Enter number',
    required: false,
    order: 4,
    options: { min: 0, max: 100, step: 1 },
  },

  url: {
    type: 'url',
    title: 'Website URL',
    placeholder: 'https://example.com',
    required: false,
    order: 5,
    options: {},
  },

  // File upload types
  fileUpload: {
    type: 'file_upload',
    title: 'File Upload',
    placeholder: 'Click to upload file',
    required: false,
    order: 6,
    options: {
      maxSize: 10485760, // 10MB
      allowedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
    },
  },

  imageUpload: {
    type: 'image_upload',
    title: 'Image Upload',
    placeholder: 'Upload image',
    required: false,
    order: 7,
    options: {
      maxSize: 5242880, // 5MB
      allowedTypes: ['jpg', 'jpeg', 'png', 'gif'],
      maxWidth: 1920,
      maxHeight: 1080,
    },
  },

  // Date/Time types
  date: {
    type: 'date',
    title: 'Date Field',
    placeholder: 'Select date',
    required: false,
    order: 8,
    options: { format: 'YYYY-MM-DD' },
  },

  time: {
    type: 'time',
    title: 'Time Field',
    placeholder: 'Select time',
    required: false,
    order: 9,
    options: { format: 'HH:mm' },
  },

  datetime: {
    type: 'datetime',
    title: 'Date & Time Field',
    placeholder: 'Select date and time',
    required: false,
    order: 10,
    options: { format: 'YYYY-MM-DD HH:mm' },
  },

  // Selection types
  multipleChoice: {
    type: 'multiple_choice',
    title: 'Multiple Choice',
    placeholder: 'Select an option',
    required: true,
    order: 11,
    options: {
      choices: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
      ],
      allowMultiple: false,
    },
  },

  multipleChoiceMulti: {
    type: 'multiple_choice',
    title: 'Multi Select',
    placeholder: 'Select options',
    required: false,
    order: 12,
    options: {
      choices: [
        { value: 'a', label: 'Choice A' },
        { value: 'b', label: 'Choice B' },
        { value: 'c', label: 'Choice C' },
        { value: 'd', label: 'Choice D' },
      ],
      allowMultiple: true,
      minSelections: 1,
      maxSelections: 3,
    },
  },

  rating: {
    type: 'rating',
    title: 'Rating Field',
    placeholder: 'Rate from 1 to 5',
    required: false,
    order: 13,
    options: {
      min: 1,
      max: 5,
      step: 1,
      labels: { min: 'Poor', max: 'Excellent' },
    },
  },

  slider: {
    type: 'slider',
    title: 'Slider Field',
    placeholder: 'Slide to select value',
    required: false,
    order: 14,
    options: {
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 50,
    },
  },

  // Location types
  latLong: {
    type: 'lat_long',
    title: 'Location Coordinates',
    placeholder: 'Select location',
    required: false,
    order: 15,
    options: {
      defaultZoom: 12,
      enableSearch: true,
    },
  },

  province: {
    type: 'province',
    title: 'Province',
    placeholder: 'Select province',
    required: true,
    order: 16,
    options: {
      country: 'TH',
    },
  },

  factory: {
    type: 'factory',
    title: 'Factory Location',
    placeholder: 'Select factory',
    required: true,
    order: 17,
    options: {
      filterBy: 'region',
    },
  },

  // Field with conditional visibility
  conditional: {
    type: 'short_answer',
    title: 'Conditional Field',
    placeholder: 'Only shows if condition met',
    required: false,
    order: 18,
    options: {},
    show_condition: {
      field_id: 'parent_field_id',
      operator: 'equals',
      value: 'show',
    },
  },

  // Field with Telegram config
  withTelegram: {
    type: 'email',
    title: 'Email with Telegram',
    placeholder: 'Enter email',
    required: true,
    order: 19,
    options: {},
    telegram_config: {
      notify: true,
      includeInMessage: true,
      format: 'Email: {{value}}',
    },
  },

  // Field with validation rules
  withValidation: {
    type: 'short_answer',
    title: 'Validated Field',
    placeholder: 'Must match pattern',
    required: true,
    order: 20,
    options: {},
    validation_rules: {
      pattern: '^[A-Z]{3}-[0-9]{4}$',
      message: 'Must be format: ABC-1234',
      minLength: 8,
      maxLength: 8,
    },
  },

  // Invalid fields for testing
  invalid: {
    noType: {
      title: 'No Type Field',
      placeholder: 'Missing type',
      required: false,
    },
    noTitle: {
      type: 'short_answer',
      placeholder: 'Missing title',
      required: false,
    },
    invalidType: {
      type: 'invalid_type',
      title: 'Invalid Type',
      placeholder: 'Invalid field type',
      required: false,
    },
  },
};