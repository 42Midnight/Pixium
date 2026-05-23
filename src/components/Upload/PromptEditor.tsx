import { useState } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import type { TemplateField } from '../../types';

interface PromptEditorProps {
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
}

export default function PromptEditor({ fields, onChange }: PromptEditorProps) {
  const { templates, loadTemplates } = useTemplates();
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const addField = () => onChange([...fields, { name: '', value: '' }]);

  const updateField = (index: number, key: 'name' | 'value', value: string) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  };

  const removeField = (index: number) => {
    if (fields.length > 1) onChange(fields.filter((_, i) => i !== index));
  };

  const applyTemplate = (template: any) => {
    const newFields: TemplateField[] = [];
    if (template.fields?.length) {
      template.fields.forEach((f: TemplateField) => {
        if (f.name || f.value) newFields.push({ name: f.name || '', value: f.value || '' });
      });
    } else if (template.prompt) {
      Object.entries(template.prompt).forEach(([name, value]) => {
        newFields.push({ name, value: value as string });
      });
    }
    onChange(newFields.length ? newFields : [{ name: '', value: '' }]);
    setShowTemplateModal(false);
  };

  return (
    <div className="prompt-section">
      <div className="prompt-header">
        <h3 className="section-title">文本内容</h3>
        <button type="button" className="load-template-btn" onClick={() => { loadTemplates(); setShowTemplateModal(true); }}>
          加载模板
        </button>
      </div>

      <div className="prompt-fields">
        {fields.map((field, index) => (
          <div key={index} className="prompt-field-item">
            <div className="prompt-field-row">
              <input type="text" value={field.name} onChange={e => updateField(index, 'name', e.target.value)}
                placeholder="小标题" className="prompt-field-name-input" spellCheck="false" />
              {fields.length > 1 && (
                <button type="button" className="remove-field-btn" onClick={() => removeField(index)}>×</button>
              )}
            </div>
            <textarea value={field.value} onChange={e => updateField(index, 'value', e.target.value)}
              placeholder="内容" className="prompt-field-value-input" rows={3} spellCheck="false" />
          </div>
        ))}
      </div>

      <div className="prompt-footer">
        <button type="button" className="add-field-btn" onClick={addField}>+ 添加字段</button>
      </div>

      {showTemplateModal && (
        <div className="template-modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="template-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>选择模板</h3>
              <button className="close-modal-btn" onClick={() => setShowTemplateModal(false)}>×</button>
            </div>
            <div className="template-list">
              {templates.length === 0 ? (
                <p className="no-templates">暂无模板</p>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="template-item" onClick={() => applyTemplate(t)}>
                    <div className="template-name">{t.name}</div>
                    <div className="template-preview">
                      {t.fields?.slice(0, 3).map((f, i) => (
                        <span key={i} className="template-tag">{f.name || '未命名字段'}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
