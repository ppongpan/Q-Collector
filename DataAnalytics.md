# Data Analysis Page Development Guide

## 1. Objective

สร้างหน้า **Data Analysis** สำหรับ webapp ที่บันทึกข้อมูลลง PostgreSQL (ใน Docker) โดยให้ผู้ใช้สามารถ:

1. ดูรายการตาราง (tables) ที่มีอยู่ในฐานข้อมูล
2. ดูรายละเอียด field/column ของแต่ละตาราง
3. เลือกตารางที่ต้องการวิเคราะห์
4. เลือก field ที่จะใช้ในการวิเคราะห์
5. กำหนดเงื่อนไขเบื้องต้น (filter/condition) เช่น:
   - ข้อมูลเฉพาะปีนี้
   - เปรียบเทียบปีนี้กับปีที่แล้ว
   - ข้อมูลรายวัน
   - ระบุค่าแกน X และแกน Y
6. กด **Generate** เพื่อสร้างกราฟหรือ chart อัตโนมัติ

---

## 2. Recommended Tools & Libraries

### Backend (Python)

- **SQLAlchemy** หรือ `psycopg2` → สำหรับเชื่อมต่อ PostgreSQL
- **Pandas** → แปลง query results เป็น DataFrame เพื่อวิเคราะห์
- **Matplotlib / Plotly / Altair** → สำหรับสร้าง chart
  - Plotly (interactive, ฟรี, export JSON/HTML ได้ง่าย)
  - Matplotlib (เบา, classic, chart หลัก ๆ)
- **FastAPI** หรือ Flask → สำหรับ API ที่รับ request จาก frontend

### Frontend (Webapp)

- **React + ShadCN UI + Tailwind** → สำหรับ UI/UX
- **Chart.js** หรือ Plotly.js → แสดงผลกราฟ
- Dropdown/checkbox UI สำหรับเลือก table/field
- Text input / datepicker สำหรับกำหนด filter

### Deployment & Cost-saving

- PostgreSQL รันใน **Docker Desktop** → ควบคุมต้นทุน
- Hugging Face Spaces (free tier) → deploy frontend/backend ได้ (Gradio หรือ Streamlit ก็เป็นตัวเลือก)
- ถ้าอยากลดภาระ server → ใช้ **Python + Gradio/Streamlit** รันเป็น interactive app เชื่อมต่อ DB โดยตรง

---

## 3. Workflow (User Journey)

1. **Connect to Database**  
   ระบบ query PostgreSQL → ดึง list ของตารางทั้งหมด
2. **Select Table**  
   ผู้ใช้เลือกตาราง → ระบบแสดง field/column
3. **Select Fields**  
   ผู้ใช้ติ๊ก field ที่ต้องการวิเคราะห์
4. **Define Filters**
   - เลือกช่วงเวลา (ปี/เดือน/วัน)
   - เปรียบเทียบปี vs ปี
   - เงื่อนไข WHERE เช่น `field = value`
5. **Define Axes**
   - Assign field ให้เป็นแกน X
   - Assign field ให้เป็นแกน Y
6. **Generate Chart**  
   ระบบ query ข้อมูล → แปลงเป็น DataFrame → สร้าง chart (line, bar, pie, scatter, etc.)
7. **Display & Export**  
   แสดง chart บนหน้าเว็บ  
   (option: export JSON, CSV, PNG, HTML)

---

## 4. Example Prompts for Claude (Development Instructions)

```prompt
You are a coding assistant.
I want to build a "Data Analysis Page" for my webapp. The webapp already saves data into PostgreSQL running inside Docker.

Tasks:
1. Write Python code (FastAPI or Flask) to:
   - Connect to PostgreSQL
   - Fetch list of tables
   - Fetch columns/fields of a selected table
   - Run queries with dynamic filters and conditions
   - Return query results as JSON

2. Write React (with Tailwind + ShadCN UI) frontend that:
   - Shows dropdown of available tables
   - When user selects a table → fetch and show fields
   - Allow user to select fields to analyze
   - Provide filter inputs (year, compare year vs last year, daily view, custom conditions)
   - Provide dropdown to set X-axis and Y-axis
   - On "Generate" → send request to backend and receive chart data

3. Integrate Chart.js or Plotly.js to render interactive charts from the returned data.

Constraints:
- Must be cost-efficient (prefer open-source libraries)
- Backend in Python, deployable on Hugging Face Spaces or local server
- Frontend in React with Tailwind, must look clean and usable
- Ensure modular design: user can extend to add new filter conditions or chart types later
5. Example Python Snippet (Backend Skeleton)
python
Copy code
from fastapi import FastAPI
import psycopg2
import pandas as pd

app = FastAPI()

def get_connection():
    return psycopg2.connect(
        host="localhost",
        port=5432,
        user="postgres",
        password="yourpassword",
        dbname="yourdb"
    )

@app.get("/tables")
def list_tables():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""SELECT table_name FROM information_schema.tables
                   WHERE table_schema='public'""")
    tables = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return {"tables": tables}

@app.get("/columns/{table_name}")
def list_columns(table_name: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}'")
    cols = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return {"columns": cols}
6. Example Frontend Flow
Dropdown (tables) → load via /tables

Checkbox list (fields) → load via /columns/{table}

Filter input section → date range, year selector, custom condition

Generate Button → call /query API

Chart component → render result with Chart.js

7. Next Steps
Finalize UI wireframe

Choose charting library (Plotly.js if interactive needed, Chart.js if lightweight enough)

Implement backend /query endpoint with flexible SQL builder

Add export features (CSV, PNG)
```
