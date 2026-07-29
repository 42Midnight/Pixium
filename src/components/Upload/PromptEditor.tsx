import { useState } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import type { TemplateField } from '../../types';
import styles from './Upload.module.css';

interface PromptEditorProps {
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
}

export default function PromptEditor({ fields, onChange }: PromptEditorProps) {
  const { templates, loadTemplates } = useTemplates();
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const addField = () => onChange([...fields, { name: '', value: '' }]);

  const clearAllText = () => onChange(
    fields.map(f => ({ ...f, value: '' }))
  );

  const hasAnyText = fields.some(f => f.value.trim());

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
    <div className={styles.promptSection}>
      <div className={styles.promptHeader}>
        <h3 className={styles.sectionTitle}>文本内容</h3>
        <button type="button" className={styles.loadTemplateBtn} onClick={() => { loadTemplates(); setShowTemplateModal(true); }}>
          加载模板
        </button>
      </div>

      <div className={styles.promptFields}>
        {fields.map((field, index) => (
          <div key={index} className={styles.promptFieldItem}>
            <div className={styles.promptFieldRow}>
              <input type="text" value={field.name} onChange={e => updateField(index, 'name', e.target.value)}
                placeholder="小标题" className={styles.promptFieldNameInput} spellCheck="false" />
              {fields.length > 1 && (
                <button type="button" className={styles.removeFieldBtn} onClick={() => removeField(index)}>×</button>
              )}
            </div>
            <textarea value={field.value} onChange={e => updateField(index, 'value', e.target.value)}
              placeholder="内容" className={styles.promptFieldValueInput} rows={3} spellCheck="false" />
          </div>
        ))}
      </div>

      <div className={styles.promptFooter}>
        <button
          type="button"
          className={styles.clearTextBtn}
          onClick={clearAllText}
          disabled={!hasAnyText}
        >
          清空文本
        </button>
        <button type="button" className={styles.addFieldBtn} onClick={addField}>添加字段</button>
      </div>

      {showTemplateModal && (
        <div className={styles.templateModalOverlay} onClick={() => setShowTemplateModal(false)}>
          <div className={styles.templateModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>选择模板</h3>
              <button className={styles.closeModalBtn} onClick={() => setShowTemplateModal(false)}>×</button>
            </div>
            <div className={styles.templateList}>
              {templates.length === 0 ? (
                <p className={styles.noTemplates}>暂无模板</p>
              ) : (
                templates.map(t => (
                  <div key={t.id} className={styles.templateItem} onClick={() => applyTemplate(t)}>
                    <div className={styles.templateName}>{t.name}</div>
                    <div className={styles.templatePreview}>
                      {t.fields?.slice(0, 3).map((f, i) => (
                        <span key={i} className={styles.templateTag}>{f.name || '未命名字段'}</span>
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
