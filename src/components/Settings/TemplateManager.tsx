import { useState, useCallback, useEffect, useRef } from 'react';
import { useTemplates } from '../../hooks/useTemplates';
import ContextMenu from '../common/ContextMenu';
import ConfirmDialog from '../common/ConfirmDialog';
import type { Template, TemplateField } from '../../types';

export default function TemplateManager() {
  const { templates, createTemplate, deleteTemplate, updateTemplate, updateTemplateFields } = useTemplates();
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; templateId: number } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (templates.length > 0 && !activeTemplateId) {
      setActiveTemplateId(templates[0].id);
      setFields(templates[0].fields);
    }
  }, [templates, activeTemplateId]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      setTimeout(() => editInputRef.current?.select(), 0);
    }
  }, [editingId]);

  const switchTemplate = useCallback(async (id: number) => {
    if (activeTemplateId) {
      await updateTemplateFields(activeTemplateId, fields);
    }
    setActiveTemplateId(id);
    const t = templates.find(t => t.id === id);
    if (t) setFields(t.fields);
  }, [activeTemplateId, fields, templates, updateTemplateFields]);

  const handleAddField = useCallback(() => {
    const newField: TemplateField = { id: Date.now(), name: '', value: '' };
    const newFields = [...fields, newField];
    setFields(newFields);
    if (activeTemplateId) updateTemplateFields(activeTemplateId, newFields);
  }, [fields, activeTemplateId, updateTemplateFields]);

  const handleUpdateField = useCallback((fieldId: number, key: 'name' | 'value', value: string) => {
    const newFields = fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f);
    setFields(newFields);
    if (activeTemplateId) updateTemplateFields(activeTemplateId, newFields);
  }, [fields, activeTemplateId, updateTemplateFields]);

  const handleDeleteField = useCallback((fieldId: number) => {
    const newFields = fields.filter(f => f.id !== fieldId);
    setFields(newFields);
    if (activeTemplateId) updateTemplateFields(activeTemplateId, newFields);
  }, [fields, activeTemplateId, updateTemplateFields]);

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  return (
    <div className="upload-template-container">
      <div className="template-sidebar">
        <div className="template-header">
          <div className="template-actions">
            <button className="template-create-btn" onClick={createTemplate}>
              <span className="icon">+</span><span>新建</span>
            </button>
            <button className="template-delete-btn" onClick={() => activeTemplateId && setDeleteTargetId(activeTemplateId)} disabled={!activeTemplateId}>
              <span className="icon">🗑️</span><span>删除</span>
            </button>
          </div>
        </div>
        <div className="template-list">
          {templates.map(t => (
            <div
              key={t.id}
              className={`template-item ${activeTemplateId === t.id ? 'active' : ''}`}
              onClick={() => switchTemplate(t.id)}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, templateId: t.id }); }}
            >
              <span className="template-icon">📄</span>
              {editingId === t.id ? (
                <div className="template-edit-container">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="template-edit-input"
                    autoFocus
                    onBlur={() => { updateTemplate(t.id, { name: editingName.trim() || t.name }); setEditingId(null); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { updateTemplate(t.id, { name: editingName.trim() || t.name }); setEditingId(null); }
                      else if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                </div>
              ) : t.name}
            </div>
          ))}
        </div>

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={[
              { label: '重命名', onClick: () => { const t = templates.find(x => x.id === contextMenu.templateId); if (t) { setEditingId(t.id); setEditingName(t.name); } } },
              { label: '删除', onClick: () => setDeleteTargetId(contextMenu.templateId), danger: true },
            ]}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>

      <div className="template-editor">
        <h3 className="section-title">Prompt 配置</h3>
        {activeTemplate ? (
          <>
            <div className="fields-container">
              {fields.map(field => (
                <div key={field.id} className="field-form">
                  <div className="field-name-row">
                    <input type="text" placeholder="字段名" value={field.name}
                      onChange={e => handleUpdateField(field.id!, 'name', e.target.value)}
                      className="field-name-input" spellCheck="false" />
                    <button className="delete-field-btn" onClick={() => handleDeleteField(field.id!)} title="删除此字段">
                      <span>×</span>
                    </button>
                  </div>
                  <textarea placeholder="字段值" value={field.value}
                    onChange={e => handleUpdateField(field.id!, 'value', e.target.value)}
                    className="field-value-input" spellCheck="false" />
                </div>
              ))}
            </div>
            <button className="add-field-btn" onClick={handleAddField}>
              <span className="icon">+</span><span>添加字段</span>
            </button>
          </>
        ) : (
          <div className="no-template-message">请先创建一个模板</div>
        )}
      </div>

      {deleteTargetId !== null && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除模板"${templates.find(t => t.id === deleteTargetId)?.name || ''}"吗？此操作不可恢复。`}
          confirmText="删除"
          onConfirm={() => { deleteTemplate(deleteTargetId); setDeleteTargetId(null); }}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
}
