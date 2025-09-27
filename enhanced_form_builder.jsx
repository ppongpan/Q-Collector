import React, { useState } from "react";

const FIELD_TYPES = [
  "short_answer",
  "paragraph",
  "email",
  "phone",
  "number",
  "url",
  "file_upload",
  "image_upload",
  "date",
  "time",
  "datetime",
  "multiple_choice",
  "dropdown",
  "checkboxes",
  "rating",
  "slider"
];

const MULTIPLE_CHOICE_DISPLAY_OPTIONS = [
  { value: "radio", label: "Radio Buttons" },
  { value: "buttons", label: "Button Group" },
  { value: "dropdown", label: "Dropdown" }
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function FieldPreview({ field }) {
  const renderFieldInput = () => {
    switch (field.type) {
      case "short_answer":
        return <input className="w-full border border-input rounded px-3 py-2 bg-background text-foreground" placeholder="กรอกข้อความสั้น ๆ" />;

      case "paragraph":
        return <textarea className="w-full border border-input rounded px-3 py-2 min-h-[100px] bg-background text-foreground" placeholder="กรอกข้อความยาว ๆ" />;

      case "email":
        return <input type="email" className="w-full border border-input rounded px-3 py-2 bg-background text-foreground" placeholder="example@email.com" />;

      case "phone":
        return <input type="tel" className="w-full border border-input rounded px-3 py-2 bg-background text-foreground" placeholder="0xx-xxx-xxxx" />;

      case "number":
        return <input type="number" className="w-full border border-input rounded px-3 py-2 bg-background text-foreground" placeholder="กรอกตัวเลข" />;

      case "url":
        return <input type="url" className="w-full border border-input rounded px-3 py-2 bg-background text-foreground" placeholder="https://example.com" />;

      case "file_upload":
        return (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <div className="text-muted-foreground">📎 คลิกเพื่อแนบไฟล์หรือลากไฟล์มาวางที่นี่</div>
            <input type="file" className="hidden" />
          </div>
        );

      case "image_upload":
        return (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <div className="text-muted-foreground">🖼️ คลิกเพื่อแนบรูปภาพหรือลากรูปมาวางที่นี่</div>
            <input type="file" accept="image/*" className="hidden" />
          </div>
        );

      case "date":
        return <input type="date" className="border border-input rounded px-3 py-2 bg-background text-foreground dark:text-foreground" />;

      case "time":
        return <input type="time" className="border border-input rounded px-3 py-2 bg-background text-foreground" />;

      case "datetime":
        return <input type="datetime-local" className="border border-input rounded px-3 py-2 bg-background text-foreground" />;

      case "multiple_choice":
        if (!field.options || field.options.length === 0) {
          return <div className="text-muted-foreground italic">โปรดเพิ่มตัวเลือก</div>;
        }

        if (field.displayStyle === "dropdown") {
          return (
            <select className="w-full border border-input rounded px-3 py-2 bg-background text-foreground">
              <option value="">เลือกตัวเลือก</option>
              {field.options.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          );
        }

        if (field.displayStyle === "buttons") {
          return (
            <div className="flex flex-wrap gap-2">
              {field.options.map((opt, idx) => (
                <button key={idx} className="px-4 py-2 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors bg-card text-card-foreground">
                  {opt}
                </button>
              ))}
            </div>
          );
        }

        return (
          <div className="space-y-2">
            {field.options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                <input
                  type={field.allowMultiple ? "checkbox" : "radio"}
                  name={field.id}
                  className="rounded"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <select className="w-full border border-input rounded px-3 py-2 bg-background text-foreground">
            <option value="">เลือกตัวเลือก</option>
            {field.options?.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case "checkboxes":
        return (
          <div className="space-y-2">
            {field.options?.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );

      case "rating":
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className="text-2xl text-muted-foreground hover:text-yellow-400 transition-colors">
                ⭐
              </button>
            ))}
          </div>
        );

      case "slider":
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={field.sliderMin || 0}
              max={field.sliderMax || 100}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{field.sliderMin || 0}</span>
              <span>{field.sliderMax || 100}</span>
            </div>
          </div>
        );

      default:
        return <input className="w-full border border-input rounded px-3 py-2 bg-background text-foreground" placeholder="ไม่รู้จักประเภทนี้" />;
    }
  };

  return (
    <div className="mt-3 p-4 bg-muted rounded-lg border border-border">
      <div className="text-sm font-medium text-muted-foreground mb-2">ตัวอย่างการแสดงผล:</div>
      {renderFieldInput()}
    </div>
  );
}

function FieldEditor({ field, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, index, total }) {
  const handleFieldTypeChange = (newType) => {
    let updatedField = { ...field, type: newType };

    if (newType === "multiple_choice" || newType === "dropdown" || newType === "checkboxes") {
      if (!updatedField.options || updatedField.options.length === 0) {
        updatedField.options = ["ตัวเลือก 1", "ตัวเลือก 2"];
      }
      if (newType === "multiple_choice") {
        updatedField.displayStyle = updatedField.displayStyle || "radio";
        updatedField.allowMultiple = updatedField.allowMultiple || false;
      }
    }

    if (newType === "slider") {
      updatedField.sliderMin = updatedField.sliderMin || 0;
      updatedField.sliderMax = updatedField.sliderMax || 100;
    }

    onChange(updatedField);
  };

  const requiresOptions = ["multiple_choice", "dropdown", "checkboxes"].includes(field.type);

  return (
    <div className="border border-border rounded-lg p-4 bg-card text-card-foreground shadow-sm mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-4">
          <input
            className="text-lg font-medium w-full mb-2 border-b border-border pb-1 focus:outline-none focus:border-primary bg-transparent text-foreground"
            value={field.title || ""}
            onChange={(e) => onChange({ ...field, title: e.target.value })}
            placeholder="คำถาม"
          />

          <input
            className="text-sm w-full mb-3 text-muted-foreground focus:outline-none bg-transparent"
            value={field.description || ""}
            onChange={(e) => onChange({ ...field, description: e.target.value })}
            placeholder="คำอธิบาย (ไม่บังคับ)"
          />

          <div className="flex flex-wrap gap-3 items-center mb-3">
            <select
              value={field.type}
              onChange={(e) => handleFieldTypeChange(e.target.value)}
              className="border border-input rounded px-3 py-2 bg-background text-foreground"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => onChange({ ...field, required: e.target.checked })}
                className="rounded"
              />
              บังคับตอบ
            </label>
          </div>

          {field.type === "multiple_choice" && (
            <div className="space-y-3 mb-3">
              <div className="flex gap-3">
                <select
                  value={field.displayStyle || "radio"}
                  onChange={(e) => onChange({ ...field, displayStyle: e.target.value })}
                  className="border rounded px-3 py-1 text-sm"
                >
                  {MULTIPLE_CHOICE_DISPLAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.allowMultiple || false}
                    onChange={(e) => onChange({ ...field, allowMultiple: e.target.checked })}
                    className="rounded"
                  />
                  เลือกได้หลายตัวเลือก
                </label>
              </div>
            </div>
          )}

          {field.type === "slider" && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">ค่าต่ำสุด</label>
                <input
                  type="number"
                  value={field.sliderMin || 0}
                  onChange={(e) => onChange({ ...field, sliderMin: parseInt(e.target.value) || 0 })}
                  className="w-full border border-input rounded px-3 py-1 text-sm bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">ค่าสูงสุด</label>
                <input
                  type="number"
                  value={field.sliderMax || 100}
                  onChange={(e) => onChange({ ...field, sliderMax: parseInt(e.target.value) || 100 })}
                  className="w-full border border-input rounded px-3 py-1 text-sm bg-background text-foreground"
                />
              </div>
            </div>
          )}

          {requiresOptions && (
            <div className="mt-3">
              <div className="text-sm text-muted-foreground mb-2">ตัวเลือก</div>
              {field.options?.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <input
                    value={opt || ""}
                    onChange={(e) => {
                      const opts = [...(field.options || [])];
                      opts[i] = e.target.value;
                      onChange({ ...field, options: opts });
                    }}
                    className="flex-1 border border-input px-3 py-2 rounded focus:outline-none focus:border-primary bg-background text-foreground"
                    placeholder={`ตัวเลือก ${i + 1}`}
                  />
                  <button
                    onClick={() => {
                      const opts = (field.options || []).filter((_, idx) => idx !== i);
                      onChange({ ...field, options: opts });
                    }}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => onChange({
                  ...field,
                  options: [...(field.options || []), `ตัวเลือก ${((field.options || []).length + 1)}`]
                })}
                className="text-sm px-3 py-2 border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors bg-background text-foreground"
              >
                + เพิ่มตัวเลือก
              </button>
            </div>
          )}

          <FieldPreview field={field} />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onDuplicate}
            className="px-3 py-2 bg-muted text-muted-foreground rounded hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            คัดลอก
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-sm"
          >
            ลบ
          </button>
          <div className="flex flex-col gap-1">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:bg-accent hover:text-accent-foreground transition-colors text-sm bg-background text-foreground"
            >
              ↑
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:bg-accent hover:text-accent-foreground transition-colors text-sm bg-background text-foreground"
            >
              ↓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EnhancedFormBuilder() {
  const [title, setTitle] = useState('ฟอร์มใหม่');
  const [description, setDescription] = useState('คำอธิบายฟอร์ม');

  const [fields, setFields] = useState([
    {
      id: uid('f'),
      type: 'short_answer',
      title: 'ชื่อ-นามสกุล',
      description: '',
      required: true,
      options: []
    }
  ]);

  const [preview, setPreview] = useState(false);

  const addField = () => {
    setFields([...fields, {
      id: uid('f'),
      type: 'short_answer',
      title: 'คำถามใหม่',
      description: '',
      required: false,
      options: []
    }]);
  };

  const updateField = (i, next) => {
    const arr = [...fields];
    arr[i] = next;
    setFields(arr);
  };

  const deleteField = (i) => {
    setFields(fields.filter((_, idx) => idx !== i));
  };

  const duplicateField = (i) => {
    const f = { ...fields[i], id: uid('f'), title: fields[i].title + ' (สำเนา)' };
    setFields([...fields.slice(0, i + 1), f, ...fields.slice(i + 1)]);
  };

  const moveField = (i, dir) => {
    const arr = [...fields];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setFields(arr);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-3xl font-bold w-full mb-2 focus:outline-none bg-transparent border-b-2 border-transparent hover:border-border focus:border-primary transition-colors text-foreground"
              placeholder="ชื่อฟอร์ม"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-lg w-full text-muted-foreground focus:outline-none bg-transparent"
              placeholder="คำอธิบายฟอร์ม"
            />
          </div>
          <div className="flex gap-3 ml-6">
            <button
              onClick={() => setPreview(p => !p)}
              className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                preview
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-card text-card-foreground border border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {preview ? '✏️ แก้ไข' : '👁️ ดูตัวอย่าง'}
            </button>
          </div>
        </div>

        {!preview && (
          <>
            <div className="mb-6">
              {fields.map((f, i) => (
                <FieldEditor
                  key={f.id}
                  field={f}
                  index={i}
                  total={fields.length}
                  onChange={(next) => updateField(i, next)}
                  onDelete={() => deleteField(i)}
                  onDuplicate={() => duplicateField(i)}
                  onMoveUp={() => moveField(i, -1)}
                  onMoveDown={() => moveField(i, 1)}
                />
              ))}
            </div>

            <div className="mb-6">
              <button
                onClick={addField}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                + เพิ่มคำถาม
              </button>
            </div>
          </>
        )}

        {preview && (
          <div className="bg-card text-card-foreground p-8 rounded-lg shadow-lg border border-border">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
              <p className="text-lg text-muted-foreground">{description}</p>
            </div>

            <form className="space-y-6">
              {fields.map((f) => (
                <div key={f.id} className="p-6 border border-border rounded-lg bg-muted">
                  <div className="mb-4">
                    <label className="block text-lg font-medium text-foreground mb-1">
                      {f.title}{f.required ? ' *' : ''}
                    </label>
                    {f.description && (
                      <p className="text-sm text-muted-foreground">{f.description}</p>
                    )}
                  </div>

                  <FieldPreview field={f} />
                </div>
              ))}

              <div className="pt-6">
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  ส่งฟอร์ม
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}