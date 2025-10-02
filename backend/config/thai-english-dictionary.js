/**
 * Thai-English Dictionary for Translation System
 *
 * Contains ~200 common Thai words/phrases with their English translations
 * Used for instant, free translation without API calls
 *
 * Categories:
 * - Form-related terms
 * - Field types
 * - Business terms
 * - Action verbs
 * - Technical terms
 * - Common words
 * - Departments
 *
 * @version 0.6.4
 * @since 2025-10-02
 */

const THAI_ENGLISH_DICTIONARY = {
  // Form-related terms
  'ฟอร์ม': 'form',
  'แบบฟอร์ม': 'form',
  'บันทึก': 'record',
  'การบันทึก': 'recording',
  'รายการ': 'list',
  'ข้อมูล': 'information',
  'รายละเอียด': 'detail',
  'คำขอ': 'request',
  'การร้องขอ': 'request',
  'คำร้อง': 'request',
  'ใบ': 'form',
  'เอกสาร': 'document',
  'แบบ': 'form',
  'การสมัคร': 'registration',
  'สมัคร': 'register',
  'ลงทะเบียน': 'register',
  'การลงทะเบียน': 'registration',
  'ติดตาม': 'follow_up',
  'การติดตาม': 'follow_up',
  'รายการติดตาม': 'follow_up_list',
  'สำรวจ': 'survey',
  'แบบสำรวจ': 'survey',
  'ประเมิน': 'evaluation',
  'การประเมิน': 'evaluation',
  'แบบประเมิน': 'evaluation_form',

  // Field types & personal information
  'ชื่อ': 'name',
  'นามสกุล': 'surname',
  'ชื่อเต็ม': 'full_name',
  'ชื่อ-นามสกุล': 'full_name',
  'อีเมล': 'email',
  'อีเมล์': 'email',
  'เบอร์': 'number',
  'เบอร์โทร': 'phone',
  'เบอร์โทรศัพท์': 'phone_number',
  'โทรศัพท์': 'phone',
  'ที่อยู่': 'address',
  'วันที่': 'date',
  'เวลา': 'time',
  'วันเวลา': 'datetime',
  'อายุ': 'age',
  'เพศ': 'gender',
  'สัญชาติ': 'nationality',
  'เชื้อชาติ': 'ethnicity',
  'ศาสนา': 'religion',
  'อาชีพ': 'occupation',
  'ตำแหน่ง': 'position',
  'หมายเลข': 'number',
  'รหัส': 'code',
  'เลขที่': 'number',

  // Business terms
  'ลูกค้า': 'customer',
  'ข้อมูลลูกค้า': 'customer_information',
  'พนักงาน': 'employee',
  'บุคลากร': 'personnel',
  'ทีม': 'team',
  'สินค้า': 'product',
  'ผลิตภัณฑ์': 'product',
  'บริการ': 'service',
  'การบริการ': 'service',
  'คำสั่งซื้อ': 'order',
  'ใบสั่งซื้อ': 'purchase_order',
  'ใบเสนอราคา': 'quotation',
  'ราคา': 'price',
  'ยอดเงิน': 'amount',
  'จำนวน': 'quantity',
  'หน่วย': 'unit',
  'โครงการ': 'project',
  'งาน': 'work',
  'ภารกิจ': 'task',
  'กิจกรรม': 'activity',
  'การประชุม': 'meeting',
  'นัดหมาย': 'appointment',
  'สัญญา': 'contract',
  'ใบแจ้งหนี้': 'invoice',
  'ใบเสร็จ': 'receipt',
  'การชำระเงิน': 'payment',
  'ชำระ': 'pay',

  // Action verbs
  'สร้าง': 'create',
  'การสร้าง': 'creation',
  'แก้ไข': 'edit',
  'การแก้ไข': 'editing',
  'ลบ': 'delete',
  'การลบ': 'deletion',
  'ส่ง': 'send',
  'การส่ง': 'sending',
  'บันทึก': 'save',
  'การบันทึก': 'saving',
  'ยืนยัน': 'confirm',
  'การยืนยัน': 'confirmation',
  'อนุมัติ': 'approve',
  'การอนุมัติ': 'approval',
  'ตรวจสอบ': 'check',
  'การตรวจสอบ': 'checking',
  'ค้นหา': 'search',
  'การค้นหา': 'searching',
  'แจ้ง': 'notify',
  'การแจ้ง': 'notification',
  'รายงาน': 'report',
  'การรายงาน': 'reporting',
  'ติดต่อ': 'contact',
  'การติดต่อ': 'contact',
  'เพิ่ม': 'add',
  'อัพเดท': 'update',
  'ปรับปรุง': 'update',

  // Technical terms
  'ระบบ': 'system',
  'เทคนิค': 'technic',
  'เทคนิคเซอร์วิส': 'technic_service',
  'เทคโนโลยี': 'technology',
  'คอมพิวเตอร์': 'computer',
  'ซอฟต์แวร์': 'software',
  'ฮาร์ดแวร์': 'hardware',
  'เครือข่าย': 'network',
  'ฐานข้อมูล': 'database',
  'แอปพลิเคชัน': 'application',
  'แอป': 'app',
  'เว็บไซต์': 'website',
  'เว็บ': 'web',
  'อินเทอร์เน็ต': 'internet',
  'ออนไลน์': 'online',
  'ออฟไลน์': 'offline',

  // Departments
  'แผนก': 'department',
  'ฝ่าย': 'division',
  'งานขาย': 'sales',
  'ขาย': 'sales',
  'การตลาด': 'marketing',
  'บัญชี': 'accounting',
  'การเงิน': 'finance',
  'ทรัพยากรบุคคล': 'human_resources',
  'HR': 'hr',
  'ผลิต': 'production',
  'คลังสินค้า': 'warehouse',
  'โลจิสติกส์': 'logistics',
  'ซ่อมบำรุง': 'maintenance',
  'ดูแลระบบ': 'admin',

  // Customer service specific
  'ฝ่ายบริการลูกค้า': 'customer_service',
  'บริการลูกค้า': 'customer_service',
  'ดูแลลูกค้า': 'customer_care',
  'แก้ปัญหา': 'troubleshoot',
  'ปัญหา': 'issue',
  'เรื่องร้องเรียน': 'complaint',
  'ร้องเรียน': 'complaint',
  'ข้อเสนอแนะ': 'suggestion',
  'คำติชม': 'feedback',

  // Common adjectives
  'เต็ม': 'full',
  'สั้น': 'short',
  'ยาว': 'long',
  'ใหม่': 'new',
  'เก่า': 'old',
  'หลัก': 'main',
  'รอง': 'sub',
  'พิเศษ': 'special',
  'ทั่วไป': 'general',
  'เพิ่มเติม': 'additional',
  'ด่วน': 'urgent',
  'สำคัญ': 'important',
  'ปกติ': 'normal',
  'มาตรฐาน': 'standard',

  // Status & state
  'สถานะ': 'status',
  'สถานะการทำงาน': 'work_status',
  'ใช้งาน': 'active',
  'ไม่ใช้งาน': 'inactive',
  'รอดำเนินการ': 'pending',
  'กำลังดำเนินการ': 'in_progress',
  'เสร็จสิ้น': 'completed',
  'สำเร็จ': 'success',
  'ล้มเหลว': 'failed',
  'ยกเลิก': 'cancelled',
  'พร้อม': 'ready',
  'ไม่พร้อม': 'not_ready',

  // Location & factory
  'โรงงาน': 'factory',
  'สาขา': 'branch',
  'สำนักงาน': 'office',
  'คลัง': 'warehouse',
  'ไซต์': 'site',
  'พื้นที่': 'area',
  'เขต': 'zone',
  'จังหวัด': 'province',
  'เมือง': 'city',
  'ประเทศ': 'country',

  // Common compound words
  'หมายเลขโทรศัพท์': 'phone_number',
  'ที่อยู่อีเมล': 'email_address',
  'วันที่สมัคร': 'registration_date',
  'เวลาสมัคร': 'registration_time',
  'ข้อมูลส่วนตัว': 'personal_information',
  'ข้อมูลติดต่อ': 'contact_information',
  'รายละเอียดเพิ่มเติม': 'additional_details',
  'หมายเหตุ': 'note',
  'หมายเหตุเพิ่มเติม': 'additional_note',
  'คำอธิบาย': 'description',
  'คำอธิบายเพิ่มเติม': 'additional_description',
};

/**
 * Lookup Thai word in dictionary
 * @param {string} thaiWord - Thai word or phrase to lookup
 * @returns {string|null} English translation or null if not found
 */
function lookupWord(thaiWord) {
  if (!thaiWord || typeof thaiWord !== 'string') {
    return null;
  }

  const normalized = thaiWord.trim().toLowerCase();
  return THAI_ENGLISH_DICTIONARY[normalized] || null;
}

/**
 * Lookup multiple Thai words and return translations
 * Useful for compound phrases
 * @param {string[]} thaiWords - Array of Thai words
 * @returns {string[]} Array of English translations (with nulls for not found)
 */
function lookupMultiple(thaiWords) {
  if (!Array.isArray(thaiWords)) {
    return [];
  }

  return thaiWords.map(word => lookupWord(word));
}

/**
 * Get dictionary statistics
 * @returns {object} Dictionary stats
 */
function getStats() {
  const entries = Object.keys(THAI_ENGLISH_DICTIONARY).length;
  const categories = {
    forms: 0,
    fields: 0,
    business: 0,
    actions: 0,
    technical: 0,
    common: 0,
  };

  // Count by category (simple heuristic)
  Object.keys(THAI_ENGLISH_DICTIONARY).forEach(key => {
    const value = THAI_ENGLISH_DICTIONARY[key];
    if (value.includes('form') || value.includes('record')) categories.forms++;
    else if (value.includes('name') || value.includes('email') || value.includes('phone')) categories.fields++;
    else if (value.includes('customer') || value.includes('order') || value.includes('product')) categories.business++;
    else if (value.includes('create') || value.includes('edit') || value.includes('delete')) categories.actions++;
    else if (value.includes('system') || value.includes('technic') || value.includes('software')) categories.technical++;
    else categories.common++;
  });

  return {
    totalEntries: entries,
    categories,
  };
}

module.exports = {
  THAI_ENGLISH_DICTIONARY,
  lookupWord,
  lookupMultiple,
  getStats,
};
