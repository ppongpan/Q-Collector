import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '../ui/glass-card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faCopy,
  faCheck,
  faInfoCircle,
  faExternalLinkAlt,
  faKey,
  faServer,
  faPlug
} from '@fortawesome/free-solid-svg-icons';
import { useEnhancedToast } from '../ui/enhanced-toast';

export default function PowerBIConnection() {
  const toast = useEnhancedToast();
  const [copiedField, setCopiedField] = useState(null);

  // PostgreSQL Connection Details
  const connectionDetails = {
    server: 'localhost:5432',  // เพิ่ม port ให้ครบถ้วน
    host: 'localhost',
    port: '5432',
    database: 'qcollector_dev_2025',
    username: 'qcollector',
    password: 'qcollector_dev_2025',
    connectionString: 'postgresql://qcollector:qcollector_dev_2025@localhost:5432/qcollector_dev_2025'
  };

  // API Endpoint for Power BI Web Connector (Alternative)
  const apiEndpoint = {
    baseUrl: 'http://localhost:5000/api/v1',
    formsEndpoint: 'http://localhost:5000/api/v1/forms',
    submissionsEndpoint: 'http://localhost:5000/api/v1/submissions',
    authEndpoint: 'http://localhost:5000/api/v1/auth/login'
  };

  const handleCopy = (value, fieldName) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(fieldName);
      toast.success(`Copied ${fieldName}!`, {
        title: 'คัดลอกสำเร็จ',
        duration: 2000
      });

      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    }).catch((err) => {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard', {
        title: 'เกิดข้อผิดพลาด'
      });
    });
  };

  const CopyButton = ({ value, fieldName }) => (
    <button
      onClick={() => handleCopy(value, fieldName)}
      className="ml-2 p-2 hover:bg-primary/10 rounded-lg transition-colors duration-200"
      title={`Copy ${fieldName}`}
    >
      <FontAwesomeIcon
        icon={copiedField === fieldName ? faCheck : faCopy}
        className={`w-4 h-4 ${
          copiedField === fieldName ? 'text-green-500' : 'text-primary'
        }`}
      />
    </button>
  );

  const InfoField = ({ icon, label, value, fieldName, monospace = false }) => (
    <div className="space-y-2">
      <label className="flex items-center text-sm font-medium text-foreground/80">
        <FontAwesomeIcon icon={icon} className="w-4 h-4 mr-2 text-primary" />
        {label}
      </label>
      <div className="flex items-center bg-muted/30 border border-border/50 rounded-lg p-3">
        <code className={`flex-1 text-sm ${monospace ? 'font-mono' : ''} text-foreground break-all`}>
          {value}
        </code>
        <CopyButton value={value} fieldName={fieldName} />
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="space-y-6"
    >
      {/* Power BI PostgreSQL Connection */}
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FontAwesomeIcon icon={faDatabase} className="w-5 h-5 text-primary" />
              </div>
              <div>
                <GlassCardTitle className="text-lg">
                  Power BI PostgreSQL Connection
                </GlassCardTitle>
                <GlassCardDescription className="mt-1">
                  เชื่อมต่อ Power BI โดยตรงกับ PostgreSQL Database
                </GlassCardDescription>
              </div>
            </div>
          </div>
        </GlassCardHeader>

        <GlassCardContent className="space-y-6">
          {/* Connection Mode Info */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Power BI Connection Mode
              </p>
              <p className="text-sm text-muted-foreground">
                ใช้ <strong>PostgreSQL Database Connector</strong> ใน Power BI Desktop:
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 ml-2">
                <li>เปิด Power BI Desktop → Get Data</li>
                <li>เลือก "PostgreSQL database"</li>
                <li>กรอก Server และ Database ตามข้อมูลด้านล่าง</li>
                <li>เลือก Data Connectivity mode: <strong>Import</strong></li>
                <li>กรอก Username และ Password</li>
                <li>เลือก Tables ที่ต้องการ (forms, submissions, users)</li>
              </ol>
            </div>
          </div>

          {/* Connection Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField
              icon={faServer}
              label="Server"
              value={connectionDetails.server}
              fieldName="Server"
            />

            <InfoField
              icon={faDatabase}
              label="Database"
              value={connectionDetails.database}
              fieldName="Database"
            />

            <InfoField
              icon={faKey}
              label="Username"
              value={connectionDetails.username}
              fieldName="Username"
            />

            <InfoField
              icon={faKey}
              label="Password"
              value={connectionDetails.password}
              fieldName="Password"
            />
          </div>

          {/* Connection String */}
          <InfoField
            icon={faDatabase}
            label="Connection String (Full)"
            value={connectionDetails.connectionString}
            fieldName="Connection String"
            monospace={true}
          />

          {/* Important Tables */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground/80 flex items-center">
              <FontAwesomeIcon icon={faDatabase} className="w-4 h-4 mr-2 text-primary" />
              Important Tables
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['forms', 'submissions', 'users', 'form_fields', 'submission_data'].map((table) => (
                <div
                  key={table}
                  className="flex items-center justify-between bg-muted/20 border border-border/30 rounded-lg p-2.5"
                >
                  <code className="text-sm font-mono text-foreground">{table}</code>
                  <CopyButton value={table} fieldName={`Table: ${table}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Options Note */}
          <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-2">
                Advanced Options (Optional)
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Command timeout:</strong> ปล่อยว่างไว้ (ใช้ค่า default)</li>
                <li>• <strong>SQL statement:</strong> ปล่อยว่างไว้ (เลือก tables จาก Navigator)</li>
                <li>• <strong>Include relationship columns:</strong> ✅ เลือก (แนะนำ)</li>
                <li>• <strong>Navigate using full hierarchy:</strong> ไม่เลือก</li>
              </ul>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Alternative: REST API Connection */}
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <FontAwesomeIcon icon={faExternalLinkAlt} className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <GlassCardTitle className="text-lg">
                  Alternative: REST API Endpoints
                </GlassCardTitle>
                <GlassCardDescription className="mt-1">
                  สำหรับใช้กับ Web Connector (ต้องมี Authentication)
                </GlassCardDescription>
              </div>
            </div>
          </div>
        </GlassCardHeader>

        <GlassCardContent className="space-y-4">
          {/* API Warning */}
          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-2">
                ⚠️ REST API ต้องการ Authentication
              </p>
              <p className="text-sm text-muted-foreground">
                วิธีนี้ซับซ้อนกว่าและต้อง implement custom connector.
                <strong className="text-foreground"> แนะนำให้ใช้ PostgreSQL Direct Connection ด้านบน</strong>
              </p>
            </div>
          </div>

          {/* API Endpoints */}
          <InfoField
            icon={faServer}
            label="Base API URL"
            value={apiEndpoint.baseUrl}
            fieldName="Base API URL"
          />

          <div className="grid grid-cols-1 gap-3">
            <InfoField
              icon={faExternalLinkAlt}
              label="Forms Endpoint"
              value={apiEndpoint.formsEndpoint}
              fieldName="Forms Endpoint"
              monospace={true}
            />

            <InfoField
              icon={faExternalLinkAlt}
              label="Submissions Endpoint"
              value={apiEndpoint.submissionsEndpoint}
              fieldName="Submissions Endpoint"
              monospace={true}
            />

            <InfoField
              icon={faKey}
              label="Authentication Endpoint"
              value={apiEndpoint.authEndpoint}
              fieldName="Auth Endpoint"
              monospace={true}
            />
          </div>

          {/* API Usage Note */}
          <div className="p-4 bg-muted/20 border border-border/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> ถ้าต้องการใช้ REST API กับ Power BI คุณต้อง:
            </p>
            <ol className="text-xs text-muted-foreground list-decimal list-inside mt-2 space-y-1 ml-2">
              <li>สร้าง Custom Data Connector (M Query)</li>
              <li>Implement OAuth2 หรือ JWT Authentication</li>
              <li>Transform JSON response เป็น Table format</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>แนะนำ:</strong> ใช้ PostgreSQL Direct Connection เพื่อความง่ายและความเร็ว
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Help Card */}
      <GlassCard>
        <GlassCardContent className="p-6">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="flex-1 space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                💡 Tips for Power BI Connection
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">1.</span>
                  <span><strong>Import Mode</strong> แนะนำสำหรับ dataset ขนาดเล็ก-กลาง (&lt; 1GB)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2.</span>
                  <span><strong>DirectQuery Mode</strong> ใช้สำหรับ real-time data หรือ dataset ขนาดใหญ่</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3.</span>
                  <span>ถ้าเชื่อมต่อไม่ได้ ตรวจสอบว่า <strong>PostgreSQL service กำลัง running</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">4.</span>
                  <span>ตรวจสอบ <strong>Firewall</strong> อนุญาตให้เข้าถึง port 5432</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">5.</span>
                  <span>ถ้าใช้ <strong>Remote Database</strong> เปลี่ยน localhost เป็น IP Address หรือ Domain</span>
                </li>
              </ul>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </motion.div>
  );
}
