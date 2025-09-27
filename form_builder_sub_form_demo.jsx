import React, { useState } from "react";

// Single-file React demo for a Form Builder with SubForms (no right sidebar)
// Usage: Paste into a React app (e.g. App.jsx) with TailwindCSS enabled.

const FIELD_TYPES = [
  "short_answer",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "date",
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function FieldEditor({ field, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, index, total }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card text-card-foreground shadow-sm mb-3">
      <div className="flex justify-between items-start">
        <div>
          <input
            className="text-lg font-medium w-full mb-1 border-b pb-1"
            value={field.title}
            onChange={(e) => onChange({ ...field, title: e.target.value })}
            placeholder="Question title"
          />
          <input
            className="text-sm w-full mb-2 text-muted-foreground bg-transparent"
            value={field.description}
            onChange={(e) => onChange({ ...field, description: e.target.value })}
            placeholder="Description (optional)"
          />
          <div className="flex gap-2 items-center">
            <select
              value={field.type}
              onChange={(e) => onChange({ ...field, type: e.target.value, options: e.target.value === 'multiple_choice' || e.target.value === 'checkboxes' ? (field.options || ["Option 1"]) : [] })}
              className="border rounded px-2 py-1"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <label className="ml-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={field.required} onChange={(e) => onChange({ ...field, required: e.target.checked })} />
              Required
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button onClick={onDuplicate} className="px-3 py-1 bg-gray-100 rounded">Duplicate</button>
          <button onClick={onDelete} className="px-3 py-1 bg-red-50 text-red-600 rounded">Delete</button>
          <div className="flex flex-col">
            <button onClick={onMoveUp} disabled={index === 0} className="px-2 py-1 border rounded mb-1 disabled:opacity-40">▲</button>
            <button onClick={onMoveDown} disabled={index === total - 1} className="px-2 py-1 border rounded disabled:opacity-40">▼</button>
          </div>
        </div>
      </div>

      {(field.type === "multiple_choice" || field.type === "checkboxes") && (
        <div className="mt-3">
          <div className="text-sm text-gray-600 mb-2">Options</div>
          {field.options?.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center mb-2">
              <input value={opt} onChange={(e) => {
                const opts = [...field.options]; opts[i] = e.target.value; onChange({ ...field, options: opts });
              }} className="flex-1 border px-2 py-1 rounded" />
              <button onClick={() => { const opts = field.options.filter((_, idx) => idx !== i); onChange({ ...field, options: opts }); }} className="px-2 py-1 bg-red-50 text-red-600 rounded">x</button>
            </div>
          ))}
          <button onClick={() => onChange({ ...field, options: [ ...(field.options||[]), `Option ${ (field.options||[]).length + 1 }` ] })} className="text-sm px-3 py-1 border rounded">Add option</button>
        </div>
      )}
    </div>
  );
}

function SubFormBuilder({ subForm, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, index, total }) {
  const updateField = (i, next) => {
    const fields = [...subForm.fields]; fields[i] = next; onChange({ ...subForm, fields });
  };

  const addField = () => {
    const f = { id: uid('f'), type: 'short_answer', title: 'Untitled', description: '', required: false, options: [] };
    onChange({ ...subForm, fields: [...subForm.fields, f] });
  };

  const deleteField = (i) => { const fields = subForm.fields.filter((_, idx) => idx !== i); onChange({ ...subForm, fields }); };
  const duplicateField = (i) => { const f = { ...subForm.fields[i], id: uid('f') }; onChange({ ...subForm, fields: [...subForm.fields.slice(0, i+1), f, ...subForm.fields.slice(i+1)] }); };
  const moveField = (i, dir) => { const fields = [...subForm.fields]; const j = i + dir; if (j < 0 || j >= fields.length) return; [fields[i], fields[j]] = [fields[j], fields[i]]; onChange({ ...subForm, fields }); };

  return (
    <div className="border-2 rounded-lg p-3 bg-gray-50 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <input value={subForm.title} onChange={(e) => onChange({ ...subForm, title: e.target.value })} placeholder="Sub form title" className="text-lg font-semibold w-full" />
          <input value={subForm.description} onChange={(e) => onChange({ ...subForm, description: e.target.value })} placeholder="Sub form description" className="text-sm w-full text-gray-500" />
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onDuplicate} className="px-3 py-1 bg-gray-100 rounded">Duplicate</button>
          <button onClick={onDelete} className="px-3 py-1 bg-red-50 text-red-600 rounded">Delete</button>
          <div className="flex flex-col">
            <button onClick={onMoveUp} disabled={index===0} className="px-2 py-1 border rounded mb-1 disabled:opacity-40">▲</button>
            <button onClick={onMoveDown} disabled={index===total-1} className="px-2 py-1 border rounded disabled:opacity-40">▼</button>
          </div>
        </div>
      </div>

      <div>
        {subForm.fields.map((f, i) => (
          <FieldEditor
            key={f.id}
            field={f}
            index={i}
            total={subForm.fields.length}
            onChange={(next) => updateField(i, next)}
            onDelete={() => deleteField(i)}
            onDuplicate={() => duplicateField(i)}
            onMoveUp={() => moveField(i, -1)}
            onMoveDown={() => moveField(i, +1)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={addField} className="px-3 py-2 border border-border rounded bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">+ Add field</button>
      </div>
    </div>
  );
}

export default function FormBuilderDemo() {
  const [title, setTitle] = useState('Untitled form');
  const [description, setDescription] = useState('Form description');

  const [fields, setFields] = useState([
    { id: uid('f'), type: 'short_answer', title: 'Name', description: '', required: true, options: [] },
    { id: uid('f'), type: 'multiple_choice', title: 'Choose one', description: '', required: false, options: ['a','b'] },
  ]);

  const [subForms, setSubForms] = useState([
    { id: uid('s'), title: 'Sub form', description: 'Sub form description', fields: [ { id: uid('f'), type: 'date', title: 'Date', description: '', required: true, options: [] }, { id: uid('f'), type: 'short_answer', title: 'Short answer', description: '', required: false, options: [] } ] }
  ]);

  const addField = () => setFields([...fields, { id: uid('f'), type: 'short_answer', title: 'Untitled', description: '', required: false, options: [] }]);
  const updateField = (i, next) => { const arr = [...fields]; arr[i] = next; setFields(arr); };
  const deleteField = (i) => setFields(fields.filter((_, idx) => idx !== i));
  const duplicateField = (i) => { const f = { ...fields[i], id: uid('f') }; setFields([...fields.slice(0,i+1), f, ...fields.slice(i+1)]); };
  const moveField = (i, dir) => { const arr = [...fields]; const j = i+dir; if (j<0||j>=arr.length) return; [arr[i],arr[j]]=[arr[j],arr[i]]; setFields(arr); };

  const addSubForm = () => setSubForms([...subForms, { id: uid('s'), title: 'Untitled Subform', description: '', fields: [] }]);
  const updateSubForm = (i, next) => { const arr = [...subForms]; arr[i] = next; setSubForms(arr); };
  const deleteSubForm = (i) => setSubForms(subForms.filter((_, idx) => idx !== i));
  const duplicateSubForm = (i) => { const s = JSON.parse(JSON.stringify(subForms[i])); s.id = uid('s'); s.title += ' (copy)'; setSubForms([...subForms.slice(0,i+1), s, ...subForms.slice(i+1)]); };
  const moveSubForm = (i, dir) => { const arr = [...subForms]; const j = i+dir; if (j<0||j>=arr.length) return; [arr[i],arr[j]]=[arr[j],arr[i]]; setSubForms(arr); };

  const [preview, setPreview] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="text-2xl font-bold w-full" />
            <input value={description} onChange={(e)=>setDescription(e.target.value)} className="text-sm w-full text-gray-600" />
          </div>
          <button onClick={()=>setPreview(p=>!p)} className="px-3 py-1 border rounded ml-4">{preview? 'Edit' : 'Preview'}</button>
        </div>

        {!preview && (
          <>
            {fields.map((f,i)=> (
              <FieldEditor
                key={f.id}
                field={f}
                index={i}
                total={fields.length}
                onChange={(next)=>updateField(i,next)}
                onDelete={()=>deleteField(i)}
                onDuplicate={()=>duplicateField(i)}
                onMoveUp={()=>moveField(i,-1)}
                onMoveDown={()=>moveField(i,1)}
              />
            ))}

            <div className="mb-6">
              <button onClick={addField} className="px-4 py-2 bg-background text-foreground border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors">+ Add field</button>
            </div>

            <div className="mb-6">
              <div className="text-lg font-semibold mb-2">Sub forms</div>
              {subForms.map((s,i)=> (
                <SubFormBuilder
                  key={s.id}
                  subForm={s}
                  index={i}
                  total={subForms.length}
                  onChange={(next)=>updateSubForm(i,next)}
                  onDelete={()=>deleteSubForm(i)}
                  onDuplicate={()=>duplicateSubForm(i)}
                  onMoveUp={()=>moveSubForm(i,-1)}
                  onMoveDown={()=>moveSubForm(i,1)}
                />
              ))}
              <button onClick={addSubForm} className="px-4 py-2 bg-background text-foreground border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors">+ Add sub form</button>
            </div>
          </>
        )}

        {preview && (
          <div className="bg-card text-card-foreground p-6 rounded shadow border border-border">
            <h3 className="text-2xl font-bold">{title}</h3>
            <p className="text-gray-600">{description}</p>

            <div className="mt-4 space-y-4">
              {fields.map((f)=> (
                <div key={f.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{f.title}{f.required ? ' *' : ''}</div>
                      <div className="text-sm text-gray-500">{f.description}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    {f.type === 'short_answer' && <input className="w-full border rounded px-2 py-1" placeholder="Short answer" />}
                    {f.type === 'paragraph' && <textarea className="w-full border rounded px-2 py-1" placeholder="Long answer" />}
                    {f.type === 'multiple_choice' && f.options?.map((o,idx)=> (
                      <label key={idx} className="flex items-center gap-2"><input name={f.id} type="radio" />{o}</label>
                    ))}
                    {f.type === 'checkboxes' && f.options?.map((o,idx)=> (
                      <label key={idx} className="flex items-center gap-2"><input type="checkbox" />{o}</label>
                    ))}
                    {f.type === 'date' && <input type="date" className="border rounded px-2 py-1" />}
                  </div>
                </div>
              ))}

              {subForms.map((s, si) => (
                <details key={s.id} className="border rounded p-3">
                  <summary className="font-semibold">{s.title || 'Sub form'} - {s.description}</summary>
                  <div className="mt-3 space-y-3">
                    {s.fields.map((f) => (
                      <div key={f.id} className="p-2 border rounded">
                        <div className="font-medium">{f.title}{f.required ? ' *' : ''}</div>
                        <div className="text-sm text-gray-500">{f.description}</div>
                        <div className="mt-2">
                          {f.type === 'short_answer' && <input className="w-full border rounded px-2 py-1" placeholder="Short answer" />}
                          {f.type === 'paragraph' && <textarea className="w-full border rounded px-2 py-1" placeholder="Long answer" />}
                          {f.type === 'multiple_choice' && f.options?.map((o,idx)=> (
                            <label key={idx} className="flex items-center gap-2"><input name={f.id} type="radio" />{o}</label>
                          ))}
                          {f.type === 'checkboxes' && f.options?.map((o,idx)=> (
                            <label key={idx} className="flex items-center gap-2"><input type="checkbox" />{o}</label>
                          ))}
                          {f.type === 'date' && <input type="date" className="border rounded px-2 py-1" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
