/**
 * Test Form Creation Script
 * Creates a comprehensive test form with all 17 field types
 * Run with: node create-test-form.js
 */

// Import DataService (Note: This is a simulation, actual implementation may vary)
const testFormData = {
  title: "ฟอร์มทดสอบระบบ - ครบทุก Field Types",
  description: "ฟอร์มสำหรับทดสอบการแสดงผลและการทำงานของ field types ทั้ง 17 ประเภท รวมถึง sub forms และระบบต่างๆ",
  userRoles: ['super_admin', 'admin', 'general_user'],
  settings: {
    telegram: {
      enabled: true,
      botToken: "123456789:AAEhBOweik9aj8e-FMmy2XGa8b4Oqvr1m8o",
      groupId: "-1001234567890"
    },
    documentNumbering: {
      enabled: true,
      prefix: "TEST-FORM",
      yearFormat: "buddhist", // พ.ศ.
      format: "prefix-number-year", // TEST-FORM-0001/2568
      currentNumber: 0
    }
  },
  fields: [
    // 1. Text Fields
    {
      id: "field-1",
      type: "short_answer",
      title: "ชื่อ-นามสกุล",
      description: "กรุณากรอกชื่อและนามสกุล",
      required: true,
      showInTable: true,
      sendToTelegram: true,
      validation: {
        minLength: 2,
        maxLength: 100
      }
    },
    {
      id: "field-2",
      type: "paragraph",
      title: "รายละเอียดเพิ่มเติม",
      description: "อธิบายรายละเอียดเพิ่มเติม หรือข้อคิดเห็น",
      required: false,
      showInTable: false,
      sendToTelegram: true,
      validation: {
        maxLength: 500
      }
    },

    // 2. Contact Fields
    {
      id: "field-3",
      type: "email",
      title: "อีเมล",
      description: "ที่อยู่อีเมลสำหรับติดต่อ",
      required: true,
      showInTable: true,
      sendToTelegram: true
    },
    {
      id: "field-4",
      type: "phone",
      title: "เบอร์โทรศัพท์",
      description: "หมายเลขโทรศัพท์มือถือ",
      required: true,
      showInTable: true,
      sendToTelegram: true
    },
    {
      id: "field-5",
      type: "url",
      title: "เว็บไซต์ส่วนตัว",
      description: "ลิงก์เว็บไซต์หรือ Social Media",
      required: false,
      showInTable: false,
      sendToTelegram: false
    },

    // 3. Number Field
    {
      id: "field-6",
      type: "number",
      title: "อายุ",
      description: "อายุเป็นปี",
      required: true,
      showInTable: true,
      sendToTelegram: true,
      validation: {
        min: 15,
        max: 80
      }
    },

    // 4. File Upload Fields
    {
      id: "field-7",
      type: "file_upload",
      title: "เอกสารแนบ",
      description: "แนบไฟล์เอกสาร (PDF, DOC, XLS)",
      required: false,
      showInTable: false,
      sendToTelegram: false,
      validation: {
        acceptedTypes: [".pdf", ".doc", ".docx", ".xls", ".xlsx"],
        maxSize: "10MB"
      }
    },
    {
      id: "field-8",
      type: "image_upload",
      title: "รูปภาพ",
      description: "แนบรูปภาพประกอบ",
      required: false,
      showInTable: false,
      sendToTelegram: false,
      validation: {
        acceptedTypes: [".jpg", ".jpeg", ".png", ".gif"],
        maxSize: "5MB"
      }
    },

    // 5. Date & Time Fields
    {
      id: "field-9",
      type: "date",
      title: "วันเกิด",
      description: "วันเดือนปีเกิด",
      required: true,
      showInTable: false,
      sendToTelegram: true
    },
    {
      id: "field-10",
      type: "time",
      title: "เวลาที่สะดวก",
      description: "เวลาที่สะดวกติดต่อ",
      required: false,
      showInTable: false,
      sendToTelegram: false
    },
    {
      id: "field-11",
      type: "datetime",
      title: "วันเวลานัดหมาย",
      description: "กำหนดวันเวลานัดหมาย",
      required: false,
      showInTable: false,
      sendToTelegram: true
    },

    // 6. Choice Fields
    {
      id: "field-12",
      type: "multiple_choice",
      title: "ระดับการศึกษา",
      description: "เลือกระดับการศึกษาสูงสุด",
      required: true,
      showInTable: true,
      sendToTelegram: true,
      options: {
        displayStyle: "radio", // radio, buttons, dropdown
        allowMultiple: false,
        choices: [
          { id: "edu-1", text: "มัธยมศึกษา", value: "มัธยมศึกษา" },
          { id: "edu-2", text: "ประกาศนียบัตรวิชาชีพ", value: "ประกาศนียบัตรวิชาชีพ" },
          { id: "edu-3", text: "ปริญญาตรี", value: "ปริญญาตรี" },
          { id: "edu-4", text: "ปริญญาโท", value: "ปริญญาโท" },
          { id: "edu-5", text: "ปริญญาเอก", value: "ปริญญาเอก" }
        ]
      }
    },
    {
      id: "field-13",
      type: "multiple_choice",
      title: "ทักษะที่มี",
      description: "เลือกทักษะที่คุณมี (เลือกได้หลายข้อ)",
      required: false,
      showInTable: false,
      sendToTelegram: true,
      options: {
        displayStyle: "buttons", // radio, buttons, dropdown
        allowMultiple: true,
        choices: [
          { id: "skill-1", text: "การเขียนโปรแกรม", value: "การเขียนโปรแกรม" },
          { id: "skill-2", text: "การออกแบบ", value: "การออกแบบ" },
          { id: "skill-3", text: "การตลาด", value: "การตลาด" },
          { id: "skill-4", text: "การบัญชี", value: "การบัญชี" },
          { id: "skill-5", text: "ภาษาต่างประเทศ", value: "ภาษาต่างประเทศ" }
        ]
      }
    },

    // 7. Rating Field
    {
      id: "field-14",
      type: "rating",
      title: "ความพึงพอใจ",
      description: "ให้คะแนนความพึงพอใจ (1-5 ดาว)",
      required: false,
      showInTable: false,
      sendToTelegram: true,
      options: {
        maxRating: 5,
        style: "stars" // stars, numbers
      }
    },

    // 8. Slider Field
    {
      id: "field-15",
      type: "slider",
      title: "ประสบการณ์ทำงาน",
      description: "จำนวนปีประสบการณ์ทำงาน",
      required: false,
      showInTable: false,
      sendToTelegram: true,
      options: {
        min: 0,
        max: 30,
        step: 1,
        unit: "ปี"
      }
    },

    // 9. Location Fields
    {
      id: "field-16",
      type: "lat_long",
      title: "พิกัดที่อยู่",
      description: "ระบุพิกัดสถานที่อยู่",
      required: false,
      showInTable: false,
      sendToTelegram: false
    },
    {
      id: "field-17",
      type: "province",
      title: "จังหวัด",
      description: "เลือกจังหวัดที่อยู่",
      required: true,
      showInTable: false,
      sendToTelegram: true
    },

    // 10. Factory Field (Business-specific)
    {
      id: "field-18",
      type: "factory",
      title: "สาขาที่สนใจ",
      description: "เลือกสาขาโรงงานที่สนใจ",
      required: false,
      showInTable: false,
      sendToTelegram: true,
      options: {
        allowMultiple: true
      }
    }
  ],

  // Sub Forms
  subForms: [
    {
      id: "subform-1",
      title: "ประสบการณ์ทำงาน",
      description: "รายละเอียดประสบการณ์ทำงานแต่ละแห่ง",
      fields: [
        {
          id: "exp-1",
          type: "short_answer",
          title: "ชื่อบริษัท",
          required: true,
          showInTable: true,
          sendToTelegram: false
        },
        {
          id: "exp-2",
          type: "short_answer",
          title: "ตำแหน่งงาน",
          required: true,
          showInTable: true,
          sendToTelegram: false
        },
        {
          id: "exp-3",
          type: "date",
          title: "วันที่เริ่มงาน",
          required: true,
          showInTable: true,
          sendToTelegram: false
        },
        {
          id: "exp-4",
          type: "date",
          title: "วันที่ลาออก",
          required: false,
          showInTable: true,
          sendToTelegram: false
        },
        {
          id: "exp-5",
          type: "paragraph",
          title: "รายละเอียดงาน",
          required: false,
          showInTable: false,
          sendToTelegram: false
        }
      ]
    },
    {
      id: "subform-2",
      title: "การอบรม/ใบประกาศนียบัตร",
      description: "หลักสูตรอบรมหรือใบประกาศนียบัตรที่ได้รับ",
      fields: [
        {
          id: "cert-1",
          type: "short_answer",
          title: "ชื่อหลักสูตร",
          required: true,
          showInTable: true,
          sendToTelegram: false
        },
        {
          id: "cert-2",
          type: "short_answer",
          title: "สถาบันที่จัดอบรม",
          required: true,
          showInTable: true,
          sendToTelegram: false
        },
        {
          id: "cert-3",
          type: "date",
          title: "วันที่อบรม",
          required: true,
          showInTable: true,
          sendToTelegram: false
        },
        {
          id: "cert-4",
          type: "file_upload",
          title: "ไฟล์ใบประกาศนียบัตร",
          required: false,
          showInTable: false,
          sendToTelegram: false
        }
      ]
    }
  ]
};

// Export for use in browser console or direct import
if (typeof window !== 'undefined') {
  // Browser environment
  window.createTestForm = function() {
    if (typeof dataService !== 'undefined') {
      try {
        const newForm = dataService.createForm(testFormData);
        console.log('✅ สร้างฟอร์มทดสอบสำเร็จ:', newForm);
        alert('✅ สร้างฟอร์มทดสอบสำเร็จ!\n\nฟอร์ม: ' + testFormData.title + '\nField Types: 17 ประเภท\nSub Forms: 2 ฟอร์ม');
        return newForm;
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
        alert('❌ เกิดข้อผิดพลาดในการสร้างฟอร์ม: ' + error.message);
        return null;
      }
    } else {
      alert('❌ ไม่พบ dataService');
      return null;
    }
  };

  console.log('📝 Test Form Creator Ready!');
  console.log('🚀 Run: createTestForm() in console to create the test form');
} else {
  // Node.js environment
  console.log('Test Form Data Structure:');
  console.log(JSON.stringify(testFormData, null, 2));
}