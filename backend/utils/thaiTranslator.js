/**
 * Thai to English Translator
 *
 * Features:
 * - Dictionary-based translation for common Thai words
 * - Context-aware translation for field names
 * - Fallback to romanization for unknown words
 */

/**
 * Thai-English Dictionary for common form field terms
 */
const thaiEnglishDict = {
  // Personal Information
  'ชื่อ': 'name',
  'นามสกุล': 'surname',
  'ชื่อเต็ม': 'full_name',
  'ชื่อจริง': 'first_name',
  'นามแฝง': 'nickname',
  'เพศ': 'gender',
  'อายุ': 'age',
  'วันเกิด': 'birth_date',
  'สัญชาติ': 'nationality',
  'เชื้อชาติ': 'ethnicity',
  'ศาสนา': 'religion',

  // Contact Information
  'อีเมล': 'email',
  'อีเมล์': 'email',
  'โทรศัพท์': 'phone',
  'เบอร์โทร': 'phone_number',
  'เบอร์โทรศัพท์': 'phone',
  'เบอร์มือถือ': 'mobile',
  'เบอร์': 'number',
  'มือถือ': 'mobile',
  'โทรสาร': 'fax',
  'ที่อยู่': 'address',
  'บ้านเลขที่': 'house_number',
  'ถนน': 'street',
  'ซอย': 'alley',
  'ตำบล': 'subdistrict',
  'อำเภอ': 'district',
  'จังหวัด': 'province',
  'รหัสไปรษณีย์': 'postal_code',
  'ประเทศ': 'country',

  // Work/Education
  'บริษัท': 'company',
  'องค์กร': 'organization',
  'แผนก': 'department',
  'ตำแหน่ง': 'position',
  'อาชีพ': 'occupation',
  'เงินเดือน': 'salary',
  'รายได้': 'income',
  'การศึกษา': 'education',
  'วุฒิการศึกษา': 'education_level',
  'มหาวิทยาลัย': 'university',
  'โรงเรียน': 'school',
  'คณะ': 'faculty',
  'สาขา': 'major',

  // Document/ID
  'เลขบัตรประชาชน': 'national_id',
  'บัตรประชาชน': 'id_card',
  'หนังสือเดินทาง': 'passport',
  'ใบขับขี่': 'driving_license',
  'เลขที่': 'number',

  // Form Fields
  'หัวข้อ': 'title',
  'คำอธิบาย': 'description',
  'รายละเอียด': 'details',
  'หมายเหตุ': 'note',
  'ความคิดเห็น': 'comment',
  'ข้อความ': 'message',
  'คำถาม': 'question',
  'คำตอบ': 'answer',
  'เหตุผล': 'reason',

  // Date/Time
  'วันที่': 'date',
  'เวลา': 'time',
  'วันเริ่มต้น': 'start_date',
  'วันสิ้นสุด': 'end_date',
  'ระยะเวลา': 'duration',
  'ปี': 'year',
  'เดือน': 'month',
  'วัน': 'day',

  // Location
  'สถานที่': 'location',
  'พิกัด': 'coordinates',
  'ละติจูด': 'latitude',
  'ลองจิจูด': 'longitude',
  'แผนที่': 'map',

  // Status/Type
  'สถานะ': 'status',
  'ประเภท': 'type',
  'หมวดหมู่': 'category',
  'ระดับ': 'level',
  'ลำดับ': 'order',
  'ลำดับที่': 'sequence',
  'จำนวน': 'quantity',
  'ราคา': 'price',
  'ยอดรวม': 'total',

  // Actions/Verbs
  'เลือก': 'select',
  'กรอก': 'fill',
  'ระบุ': 'specify',
  'อัปโหลด': 'upload',
  'ดาวน์โหลด': 'download',
  'แนบ': 'attach',
  'ส่ง': 'submit',
  'บันทึก': 'save',
  'ยืนยัน': 'confirm',
  'ยกเลิก': 'cancel',

  // Common Adjectives
  'อื่นๆ': 'other',
  'เพิ่มเติม': 'additional',
  'หลัก': 'main',
  'รอง': 'secondary',
  'เก่า': 'old',
  'ใหม่': 'new',
  'ปัจจุบัน': 'current',
  'ก่อนหน้า': 'previous',

  // Files/Documents
  'ไฟล์': 'file',
  'เอกสาร': 'document',
  'รูปภาพ': 'image',
  'ภาพถ่าย': 'photo',
  'วิดีโอ': 'video',
  'เสียง': 'audio',

  // Yes/No
  'ใช่': 'yes',
  'ไม่ใช่': 'no',
  'มี': 'have',
  'ไม่มี': 'not_have',

  // Form specific (Q-Collector)
  'โรงงาน': 'factory',
  'แบบฟอร์ม': 'form',
  'แบบฟอร์มติดต่อ': 'contact',
  'ใบสมัคร': 'application',
  'แบบสอบถาม': 'survey',
  'แบบประเมิน': 'evaluation',
  'รายงาน': 'report',
  'ใบขอ': 'request_form',
  'ใบอนุมัติ': 'approval_form',
  'ใบลา': 'leave_form',
  'ใบเบิก': 'withdrawal_form',
  'ติดต่อ': 'contact',
};

/**
 * Romanization mapping for Thai consonants and vowels
 */
const thaiRomanMap = {
  // Consonants
  'ก': 'k', 'ข': 'kh', 'ฃ': 'kh', 'ค': 'kh', 'ฅ': 'kh', 'ฆ': 'kh',
  'ง': 'ng',
  'จ': 'ch', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ฌ': 'ch',
  'ญ': 'y',
  'ฎ': 'd', 'ฏ': 't',
  'ฐ': 'th', 'ฑ': 'th', 'ฒ': 'th', 'ณ': 'n',
  'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th', 'น': 'n',
  'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f', 'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph', 'ม': 'm',
  'ย': 'y', 'ร': 'r', 'ฤ': 'rue', 'ล': 'l', 'ฦ': 'lue', 'ว': 'w',
  'ศ': 's', 'ษ': 's', 'ส': 's', 'ห': 'h', 'ฬ': 'l', 'อ': 'o', 'ฮ': 'h',

  // Vowels
  'ะ': 'a', 'ั': 'a', 'า': 'a', 'ำ': 'am',
  'ิ': 'i', 'ี': 'i', 'ึ': 'ue', 'ื': 'ue',
  'ุ': 'u', 'ู': 'u',
  'เ': 'e', 'แ': 'ae', 'โ': 'o', 'ใ': 'ai', 'ไ': 'ai',

  // Tone marks (ignored in romanization)
  '่': '', '้': '', '๊': '', '๋': '', '็': '', '์': '', '฿': '',

  // Thai numbers
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
};

/**
 * Translate compound Thai word by finding longest dictionary matches
 * @param {string} text - Thai compound word
 * @returns {string|null} - Translated text or null if no matches found
 */
function translateCompoundWord(text) {
  const parts = [];
  let i = 0;

  while (i < text.length) {
    let found = false;

    // Try to find longest match starting at position i
    for (let len = Math.min(text.length - i, 20); len > 0; len--) {
      const substr = text.substring(i, i + len);
      if (thaiEnglishDict[substr]) {
        parts.push(thaiEnglishDict[substr]);
        i += len;
        found = true;
        break;
      }
    }

    // If no match found, return null to use romanization
    if (!found) {
      return null;
    }
  }

  return parts.length > 0 ? parts.join('_') : null;
}

/**
 * Translate Thai text to English
 * Uses dictionary first, falls back to romanization
 *
 * @param {string} thaiText - Thai text to translate
 * @returns {string} - English translation
 */
function translateThaiToEnglish(thaiText) {
  if (!thaiText || typeof thaiText !== 'string') {
    return '';
  }

  const original = thaiText.trim();

  // Check if already in English
  if (!/[\u0E00-\u0E7F]/.test(original)) {
    return original.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  }

  // Try exact match in dictionary
  if (thaiEnglishDict[original]) {
    return thaiEnglishDict[original];
  }

  // Try to translate word by word for space-separated phrases
  const words = original.split(/\s+/);
  if (words.length > 1) {
    const translatedWords = words.map(word => {
      const cleaned = word.replace(/[^\u0E00-\u0E7Fa-z0-9]/g, '');
      return thaiEnglishDict[cleaned] || romanizeWord(cleaned);
    });
    return translatedWords.join('_');
  }

  // Try to find longest matching substrings in dictionary for compound words
  const compoundTranslation = translateCompoundWord(original);
  if (compoundTranslation) {
    return compoundTranslation;
  }

  // Fallback to romanization
  return romanizeWord(original);
}

/**
 * Romanize a single Thai word
 */
function romanizeWord(word) {
  let result = '';
  for (let char of word) {
    if (thaiRomanMap[char]) {
      result += thaiRomanMap[char];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char;
    } else if (/\s/.test(char)) {
      result += '_';
    }
    // Skip other characters
  }
  return result;
}

/**
 * Add custom translation to dictionary
 * @param {string} thai - Thai word/phrase
 * @param {string} english - English translation
 */
function addTranslation(thai, english) {
  thaiEnglishDict[thai.toLowerCase()] = english.toLowerCase();
}

/**
 * Get all translations in dictionary
 */
function getDictionary() {
  return { ...thaiEnglishDict };
}

/**
 * Translate form field label to valid column name
 * @param {string} label - Field label in Thai or English
 * @returns {string} - Valid English column name
 */
function translateFieldLabel(label) {
  if (!label) return 'field';

  // Translate to English
  let translated = translateThaiToEnglish(label);

  // Clean up the result
  translated = translated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '')       // Remove leading/trailing underscores
    .replace(/_+/g, '_');          // Collapse multiple underscores

  // Ensure it starts with a letter
  if (!/^[a-z]/.test(translated)) {
    translated = 'field_' + translated;
  }

  return translated;
}

/**
 * Translate form title to valid table name
 * @param {string} title - Form title in Thai or English
 * @returns {string} - Valid English table name
 */
function translateFormTitle(title) {
  if (!title) return 'form';

  // Translate to English
  let translated = translateThaiToEnglish(title);

  // Clean up the result
  translated = translated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  // Ensure it starts with a letter
  if (!/^[a-z]/.test(translated)) {
    translated = 'form_' + translated;
  }

  // Prefix with 'form_' if not already
  if (!translated.startsWith('form_')) {
    translated = 'form_' + translated;
  }

  return translated;
}

module.exports = {
  translateThaiToEnglish,
  translateFieldLabel,
  translateFormTitle,
  romanizeWord,
  addTranslation,
  getDictionary
};
