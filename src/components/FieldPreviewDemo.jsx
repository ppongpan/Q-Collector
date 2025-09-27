import React from 'react';
import FieldPreviewCard from './ui/field-preview-card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFont, faStar, faSliders, faImage,
  faCalendarAlt, faCheckSquare, faEnvelope,
  faPhone, faLink, faFileUpload
} from '@fortawesome/free-solid-svg-icons';

/**
 * FieldPreviewDemo - Demonstration of FieldPreviewCard component
 * Shows various field types with realistic preview elements
 */
const FieldPreviewDemo = () => {
  const handleEdit = (fieldType) => {
    console.log(`Editing ${fieldType} field`);
  };

  const handleDelete = (fieldType) => {
    console.log(`Deleting ${fieldType} field`);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Field Preview Cards
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Modern dark neon-style field preview components with consistent spacing,
            hover animations, and responsive design.
          </p>
        </div>

        {/* Field Cards Grid */}
        <div className="space-y-6">

          {/* Text Input Field */}
          <FieldPreviewCard
            icon={faFont}
            label="ชื่อ-นามสกุล"
            description="ช่องกรอกชื่อและนามสกุลของผู้ใช้งาน (บังคับกรอก)"
            fieldType="text"
            previewElement={
              <input
                type="text"
                placeholder="กรอกชื่อ-นามสกุล..."
                className="
                  w-full px-4 py-3
                  bg-gray-800/60 border border-gray-600/40
                  rounded-xl text-sm text-white
                  placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  transition-all duration-200
                "
                readOnly
              />
            }
            onEdit={() => handleEdit('text')}
            onDelete={() => handleDelete('text')}
          />

          {/* Email Field */}
          <FieldPreviewCard
            icon={faEnvelope}
            label="อีเมล"
            description="ที่อยู่อีเมลสำหรับการติดต่อและการยืนยันตัวตน"
            fieldType="text"
            previewElement={
              <input
                type="email"
                placeholder="example@domain.com"
                className="
                  w-full px-4 py-3
                  bg-gray-800/60 border border-gray-600/40
                  rounded-xl text-sm text-white
                  placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  transition-all duration-200
                "
                readOnly
              />
            }
            onEdit={() => handleEdit('email')}
            onDelete={() => handleDelete('email')}
          />

          {/* Phone Field */}
          <FieldPreviewCard
            icon={faPhone}
            label="เบอร์โทรศัพท์"
            description="หมายเลขโทรศัพท์มือถือ (10 หลัก)"
            fieldType="text"
            previewElement={
              <input
                type="tel"
                placeholder="081-234-5678"
                className="
                  w-full px-4 py-3
                  bg-gray-800/60 border border-gray-600/40
                  rounded-xl text-sm text-white
                  placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  transition-all duration-200
                "
                readOnly
              />
            }
            onEdit={() => handleEdit('phone')}
            onDelete={() => handleDelete('phone')}
          />

          {/* Star Rating Field */}
          <FieldPreviewCard
            icon={faStar}
            label="คะแนนความพึงพอใจ"
            description="ให้คะแนนความพึงพอใจต่อบริการ (1-5 ดาว)"
            fieldType="rating"
            previewElement={
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <FontAwesomeIcon
                      key={i}
                      icon={faStar}
                      className={`text-xl transition-all duration-200 cursor-pointer ${
                        i < 4
                          ? 'text-yellow-400 hover:text-yellow-300 drop-shadow-lg'
                          : 'text-gray-600 hover:text-gray-500'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-yellow-400">4/5</div>
                  <div className="text-xs text-gray-500">ดีมาก</div>
                </div>
              </div>
            }
            onEdit={() => handleEdit('rating')}
            onDelete={() => handleDelete('rating')}
          />

          {/* Slider Field */}
          <FieldPreviewCard
            icon={faSliders}
            label="ระดับความสำคัญ"
            description="กำหนดระดับความสำคัญของงาน (0-100)"
            fieldType="slider"
            previewElement={
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value="75"
                    className="
                      w-full h-2
                      bg-gray-700 rounded-full
                      appearance-none cursor-pointer
                      slider-thumb
                    "
                    readOnly
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex justify-between w-full text-xs text-gray-500">
                    <span>ต่ำ</span>
                    <span>ปานกลาง</span>
                    <span>สูง</span>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-emerald-400">75</span>
                  <span className="text-sm text-gray-400 ml-1">/ 100</span>
                </div>
              </div>
            }
            onEdit={() => handleEdit('slider')}
            onDelete={() => handleDelete('slider')}
          />

          {/* Date Field */}
          <FieldPreviewCard
            icon={faCalendarAlt}
            label="วันเกิด"
            description="เลือกวัน/เดือน/ปีเกิดของผู้ใช้งาน"
            fieldType="date"
            previewElement={
              <div className="flex items-center space-x-3">
                <input
                  type="date"
                  className="
                    flex-1 px-4 py-3
                    bg-gray-800/60 border border-gray-600/40
                    rounded-xl text-sm text-white
                    focus:outline-none focus:ring-2 focus:ring-pink-500/50
                    focus:border-pink-500/50
                    transition-all duration-200
                  "
                  readOnly
                />
                <div className="text-right">
                  <div className="text-sm text-gray-400">อายุ</div>
                  <div className="text-lg font-semibold text-pink-400">25</div>
                </div>
              </div>
            }
            onEdit={() => handleEdit('date')}
            onDelete={() => handleDelete('date')}
          />

          {/* Multiple Choice Field */}
          <FieldPreviewCard
            icon={faCheckSquare}
            label="ความสนใจ"
            description="เลือกความสนใจของคุณ (เลือกได้หลายข้อ)"
            fieldType="choice"
            previewElement={
              <div className="space-y-3">
                {['การเดินทาง', 'อาหารการกิน', 'เทคโนโลยี', 'กีฬา'].map((option, index) => (
                  <label key={index} className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      defaultChecked={index < 2}
                      className="
                        w-5 h-5
                        text-green-500
                        bg-gray-800 border-gray-600
                        rounded focus:ring-green-500/50
                        transition-all duration-200
                      "
                      readOnly
                    />
                    <span className={`text-sm transition-colors duration-200 ${
                      index < 2 ? 'text-white font-medium' : 'text-gray-400'
                    } group-hover:text-green-300`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            }
            onEdit={() => handleEdit('choice')}
            onDelete={() => handleDelete('choice')}
          />

          {/* URL Field */}
          <FieldPreviewCard
            icon={faLink}
            label="เว็บไซต์ส่วนตัว"
            description="ลิงก์เว็บไซต์หรือโปรไฟล์โซเชียลมีเดีย"
            fieldType="text"
            previewElement={
              <input
                type="url"
                placeholder="https://www.example.com"
                className="
                  w-full px-4 py-3
                  bg-gray-800/60 border border-gray-600/40
                  rounded-xl text-sm text-white
                  placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  focus:border-blue-500/50
                  transition-all duration-200
                "
                readOnly
              />
            }
            onEdit={() => handleEdit('url')}
            onDelete={() => handleDelete('url')}
          />

          {/* File Upload Field */}
          <FieldPreviewCard
            icon={faFileUpload}
            label="อัปโหลดเอกสาร"
            description="เลือกไฟล์เอกสารเพื่ออัปโหลด (PDF, DOC, DOCX)"
            fieldType="upload"
            previewElement={
              <div className="
                border-2 border-dashed border-gray-600/50
                rounded-xl p-6
                text-center
                hover:border-gray-500/70 hover:bg-gray-800/30
                transition-all duration-300
                cursor-pointer
              ">
                <FontAwesomeIcon
                  icon={faFileUpload}
                  className="text-3xl text-violet-400 mb-3"
                />
                <p className="text-sm text-white font-medium mb-1">
                  คลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-xs text-gray-500">
                  หรือลากไฟล์มาวางที่นี่
                </p>
                <div className="mt-3 flex items-center justify-center space-x-2">
                  <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">
                    PDF
                  </span>
                  <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">
                    DOC
                  </span>
                  <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded">
                    DOCX
                  </span>
                </div>
              </div>
            }
            onEdit={() => handleEdit('upload')}
            onDelete={() => handleDelete('upload')}
          />

          {/* Image Upload Field */}
          <FieldPreviewCard
            icon={faImage}
            label="รูปโปรไฟล์"
            description="อัปโหลดรูปโปรไฟล์ (PNG, JPG, GIF - ขนาดไม่เกิน 5MB)"
            fieldType="upload"
            previewElement={
              <div className="flex items-center space-x-4">
                <div className="
                  w-20 h-20
                  bg-gradient-to-br from-gray-700 to-gray-800
                  rounded-xl
                  flex items-center justify-center
                  border-2 border-dashed border-gray-600/50
                  hover:border-gray-500/70
                  transition-all duration-200
                  cursor-pointer
                ">
                  <FontAwesomeIcon
                    icon={faImage}
                    className="text-2xl text-violet-400"
                  />
                </div>
                <div className="flex-1">
                  <button className="
                    w-full px-4 py-2
                    bg-violet-600/20 hover:bg-violet-600/30
                    border border-violet-500/40 hover:border-violet-500/60
                    rounded-lg
                    text-sm text-violet-300 hover:text-violet-200
                    transition-all duration-200
                  ">
                    เลือกรูปภาพ
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG, GIF (max 5MB)
                  </p>
                </div>
              </div>
            }
            onEdit={() => handleEdit('image')}
            onDelete={() => handleDelete('image')}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-gray-800">
          <p className="text-gray-500">
            Built with React, Framer Motion, and Tailwind CSS
          </p>
        </div>
      </div>

      {/* Styles for custom slider */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: 3px solid #1a1a1a;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          transition: all 0.2s ease;
        }

        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.6);
        }

        .slider-thumb::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: 3px solid #1a1a1a;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default FieldPreviewDemo;