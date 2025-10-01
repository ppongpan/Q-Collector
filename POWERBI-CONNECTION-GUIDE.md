# Power BI Connection Guide for Q-Collector

## 📊 การเชื่อมต่อ Power BI กับ Q-Collector Database

**วันที่สร้าง**: 2025-10-01
**เวอร์ชั่น**: 1.0.0
**สำหรับ**: Q-Collector v0.5.4+

---

## ✅ วิธีที่แนะนำ: PostgreSQL Direct Connection

### ข้อมูลการเชื่อมต่อ

```
Server (Host):     localhost
Port:              5432
Database:          qcollector_db
Username:          qcollector
Password:          qcollector_dev_2025

Connection String (Full):
postgresql://qcollector:qcollector_dev_2025@localhost:5432/qcollector_db
```

---

## 📝 ขั้นตอนการเชื่อมต่อใน Power BI Desktop

### Step 1: เปิด Power BI Desktop และเลือก Get Data

1. เปิด Power BI Desktop
2. คลิก **Home** tab → **Get Data**
3. ค้นหา "**PostgreSQL**" ใน search box
4. เลือก "**PostgreSQL database**"
5. คลิก **Connect**

---

### Step 2: กรอกข้อมูล Server และ Database

ในหน้า **PostgreSQL database**:

#### **Server** (บังคับ)
```
localhost
```

#### **Database** (บังคับ)
```
qcollector_db
```

#### **Data Connectivity mode**
เลือก **Import** (แนะนำสำหรับ dataset ขนาดเล็ก-กลาง)

หรือ

เลือก **DirectQuery** (สำหรับ real-time data หรือ dataset ขนาดใหญ่)

#### **Advanced options** (ไม่บังคับ)

- **Command timeout in minutes**: ปล่อยว่างไว้ (ใช้ค่า default)
- **SQL statement**: ปล่อยว่างไว้ (เราจะเลือก tables จาก Navigator)
- **✅ Include relationship columns**: เลือกตัวเลือกนี้ (แนะนำ)
- **❌ Navigate using full hierarchy**: ไม่เลือก

---

### Step 3: ใส่ Username และ Password

1. เลือก tab **Database** (ด้านซ้าย)
2. กรอกข้อมูล:

   **User name:**
   ```
   qcollector
   ```

   **Password:**
   ```
   qcollector_dev_2025
   ```

3. คลิก **Connect**

---

### Step 4: เลือก Tables ที่ต้องการ

ใน **Navigator** window คุณจะเห็น tables ต่าง ๆ ของ Q-Collector:

#### **ตารางหลัก (Main Tables)**:

- ✅ **forms** - ข้อมูลฟอร์มทั้งหมด
- ✅ **submissions** - ข้อมูลการส่งฟอร์มทั้งหมด
- ✅ **users** - ข้อมูลผู้ใช้
- ✅ **form_fields** - ฟิลด์ในแต่ละฟอร์ม (ถ้ามี)
- ✅ **submission_data** - ข้อมูลแต่ละฟิลด์ (JSON format)

#### **ตารางเสริม (Additional Tables)**:

- **files** - ไฟล์ที่อัปโหลด
- **sessions** - session ผู้ใช้
- **trusted_devices** - อุปกรณ์ที่เชื่อถือได้
- **system_settings** - การตั้งค่าระบบ

**คำแนะนำ**: เลือกเฉพาะตารางที่คุณต้องใช้เพื่อประสิทธิภาพที่ดีขึ้น

---

### Step 5: Load หรือ Transform Data

1. **Load**: โหลดข้อมูลทันทีเข้า Power BI
2. **Transform Data**: เปิด Power Query Editor เพื่อแปลงข้อมูลก่อนโหลด

---

## 🔍 โครงสร้างข้อมูลหลัก

### Table: `forms`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Form ID (Primary Key) |
| title | VARCHAR | ชื่อฟอร์ม |
| description | TEXT | คำอธิบายฟอร์ม |
| created_by | UUID | ผู้สร้างฟอร์ม (FK → users.id) |
| created_at | TIMESTAMP | วันที่สร้าง |
| updated_at | TIMESTAMP | วันที่แก้ไขล่าสุด |
| is_active | BOOLEAN | สถานะใช้งาน |

### Table: `submissions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Submission ID (Primary Key) |
| form_id | UUID | Form ID (FK → forms.id) |
| user_id | UUID | ผู้ส่ง (FK → users.id) |
| data | JSONB | ข้อมูลที่กรอกทั้งหมด |
| status | VARCHAR | สถานะ (draft, submitted, approved, rejected) |
| submitted_at | TIMESTAMP | วันที่ส่ง |
| created_at | TIMESTAMP | วันที่สร้าง |
| updated_at | TIMESTAMP | วันที่แก้ไขล่าสุด |

### Table: `users`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | User ID (Primary Key) |
| username | VARCHAR | ชื่อผู้ใช้ |
| email | VARCHAR | อีเมล |
| role | VARCHAR | บทบาท (super_admin, admin, moderator, etc.) |
| department | VARCHAR | แผนก |
| is_active | BOOLEAN | สถานะใช้งาน |
| created_at | TIMESTAMP | วันที่สร้าง |

---

## 📊 Power Query (M) Transformations แนะนำ

### 1. แปลง JSON Data เป็น Columns

สำหรับ `submissions.data` (JSONB column):

```m
let
    Source = PostgreSQL.Database("localhost", "qcollector_db"),
    submissions = Source{[Schema="public",Item="submissions"]}[Data],

    // Parse JSON data
    ParsedData = Table.AddColumn(submissions, "ParsedData",
        each Json.Document([data])),

    // Expand JSON fields
    ExpandedData = Table.ExpandRecordColumn(ParsedData, "ParsedData",
        {"field1", "field2", "field3"},
        {"Field1", "Field2", "Field3"})
in
    ExpandedData
```

### 2. Join Forms และ Submissions

```m
let
    forms = PostgreSQL.Database("localhost", "qcollector_db"){[Schema="public",Item="forms"]}[Data],
    submissions = PostgreSQL.Database("localhost", "qcollector_db"){[Schema="public",Item="submissions"]}[Data],

    // Join tables
    JoinedData = Table.NestedJoin(submissions, {"form_id"}, forms, {"id"}, "FormInfo", JoinKind.Inner),

    // Expand form information
    ExpandedData = Table.ExpandRecordColumn(JoinedData, "FormInfo",
        {"title", "description"},
        {"FormTitle", "FormDescription"})
in
    ExpandedData
```

### 3. Filter ตาม Date Range

```m
let
    Source = PostgreSQL.Database("localhost", "qcollector_db"){[Schema="public",Item="submissions"]}[Data],

    // Filter last 30 days
    FilteredRows = Table.SelectRows(Source,
        each [submitted_at] >= DateTime.AddDays(DateTime.LocalNow(), -30))
in
    FilteredRows
```

---

## 🚀 Performance Tips

### 1. Use Query Folding

- เลือก DirectQuery mode สำหรับ real-time data
- ใช้ WHERE clauses ใน SQL ก่อน load เข้า Power BI
- Avoid custom columns ที่ซับซ้อนใน Power Query

### 2. Index Important Columns

Run ใน PostgreSQL:

```sql
-- Index form_id in submissions
CREATE INDEX idx_submissions_form_id ON submissions(form_id);

-- Index user_id in submissions
CREATE INDEX idx_submissions_user_id ON submissions(user_id);

-- Index submitted_at for date filtering
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);
```

### 3. Limit Data Range

```sql
-- Get only last 90 days
SELECT * FROM submissions
WHERE submitted_at >= CURRENT_DATE - INTERVAL '90 days';
```

---

## 🔧 Troubleshooting

### ❌ Cannot connect to database

**ปัญหา**: "Could not connect to the server"

**วิธีแก้**:
1. ตรวจสอบว่า PostgreSQL service กำลัง running
   ```bash
   # Windows
   net start postgresql-x64-14

   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. ตรวจสอบว่า port 5432 เปิดอยู่
   ```bash
   netstat -an | findstr 5432
   ```

3. ตรวจสอบ firewall settings

---

### ❌ Authentication failed

**ปัญหา**: "Password authentication failed"

**วิธีแก้**:
1. ตรวจสอบ username และ password ใน Settings page
2. ลอง reset password ใน database:
   ```sql
   ALTER USER qcollector WITH PASSWORD 'qcollector_dev_2025';
   ```

---

### ❌ Table not found

**ปัญหา**: "relation does not exist"

**วิธีแก้**:
1. ตรวจสอบว่า migrations ทำงานครบถ้วน
   ```bash
   cd backend
   npm run migrate
   ```

2. ตรวจสอบ table ใน database:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

---

## 🌐 Remote Database Connection

ถ้าต้องการเชื่อมต่อ database จาก remote server:

### Update pg_hba.conf

```conf
# Allow connections from specific IP
host    qcollector_db    qcollector    192.168.1.0/24    md5

# Allow all connections (NOT RECOMMENDED for production)
host    all              all           0.0.0.0/0          md5
```

### Update postgresql.conf

```conf
listen_addresses = '*'    # Listen on all interfaces
port = 5432
```

### Restart PostgreSQL

```bash
# Windows
net stop postgresql-x64-14
net start postgresql-x64-14

# Linux/Mac
sudo systemctl restart postgresql
```

### Update Power BI Connection

```
Server: your-server-ip-or-domain
Port: 5432
Database: qcollector_db
Username: qcollector
Password: qcollector_dev_2025
```

---

## 📈 Sample DAX Measures

### Total Submissions

```dax
Total Submissions = COUNTROWS(submissions)
```

### Submissions This Month

```dax
Submissions This Month =
CALCULATE(
    COUNTROWS(submissions),
    MONTH(submissions[submitted_at]) = MONTH(TODAY()),
    YEAR(submissions[submitted_at]) = YEAR(TODAY())
)
```

### Submission Growth Rate

```dax
Submission Growth =
VAR CurrentMonth = [Submissions This Month]
VAR LastMonth =
    CALCULATE(
        COUNTROWS(submissions),
        MONTH(submissions[submitted_at]) = MONTH(TODAY()) - 1,
        YEAR(submissions[submitted_at]) = YEAR(TODAY())
    )
RETURN
    DIVIDE(CurrentMonth - LastMonth, LastMonth, 0)
```

### Average Submission Time

```dax
Avg Submission Time =
AVERAGEX(
    submissions,
    DATEDIFF(submissions[created_at], submissions[submitted_at], DAY)
)
```

---

## 🔐 Security Best Practices

### 1. Use Read-Only User

สร้าง user แยกสำหรับ Power BI:

```sql
-- Create read-only user
CREATE USER powerbi_reader WITH PASSWORD 'secure_password_here';

-- Grant SELECT only
GRANT CONNECT ON DATABASE qcollector_db TO powerbi_reader;
GRANT USAGE ON SCHEMA public TO powerbi_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powerbi_reader;

-- Auto-grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO powerbi_reader;
```

### 2. Use Row-Level Security (RLS)

```sql
-- Create view with RLS
CREATE VIEW submissions_by_department AS
SELECT s.*
FROM submissions s
JOIN users u ON s.user_id = u.id
WHERE u.department = current_setting('app.department');

-- Grant access to view
GRANT SELECT ON submissions_by_department TO powerbi_reader;
```

### 3. Enable SSL Connection

```
Server: your-server.com:5432
Database: qcollector_db
Username: powerbi_reader
Password: secure_password

SSL Mode: require
```

---

## 📚 Additional Resources

### Power BI Documentation
- [PostgreSQL Connector](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-connect-postgresql)
- [DirectQuery vs Import](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about)
- [Query Folding](https://learn.microsoft.com/en-us/power-query/power-query-folding)

### Q-Collector Documentation
- [Database Schema](./qcollector.md#database-schema)
- [API Documentation](./qcollector.md#api-endpoints)
- [Backend Setup](./HOWTO.md#backend-setup)

---

## ✅ Checklist

ก่อนเชื่อมต่อ Power BI ตรวจสอบว่า:

- [ ] PostgreSQL service กำลัง running
- [ ] Database `qcollector_db` มีอยู่
- [ ] User `qcollector` สามารถเข้าถึง database
- [ ] Port 5432 เปิดอยู่ และไม่มี firewall block
- [ ] Tables มีข้อมูลอยู่ (ไม่ว่างเปล่า)
- [ ] Power BI Desktop ติดตั้งแล้ว (latest version)

---

**Created**: 2025-10-01
**Version**: 1.0.0
**For**: Q-Collector v0.5.4+
**Author**: Q-Collector Development Team
