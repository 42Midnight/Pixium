import { useState, useCallback, useEffect } from 'react';
import type { Template } from '../types';
import { isElectronAvailable } from '../services/electron';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);

  const loadTemplates = useCallback(async () => {
    try {
      if (isElectronAvailable()) {
        const api = window.electronAPI!;
        const result = await api.loadTemplates();
        if (result.success) {
          setTemplates(result.data);
        }
      } else {
        const saved = localStorage.getItem('templates');
        if (saved) {
          setTemplates(JSON.parse(saved));
        }
      }
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  }, []);

  const saveTemplates = useCallback(async (newTemplates: Template[]) => {
    setTemplates(newTemplates);
    try {
      if (isElectronAvailable()) {
        await window.electronAPI!.saveTemplates(newTemplates);
      } else {
        localStorage.setItem('templates', JSON.stringify(newTemplates));
      }
    } catch (error) {
      console.error('保存模板失败:', error);
    }
  }, []);

  const createTemplate = useCallback(async () => {
    const newTemplate: Template = {
      id: Date.now(),
      name: '新建模板',
      fields: [],
    };
    await saveTemplates([...templates, newTemplate]);
    return newTemplate;
  }, [templates, saveTemplates]);

  const updateTemplate = useCallback(async (id: number, updates: Partial<Template>) => {
    const updated = templates.map(t => t.id === id ? { ...t, ...updates } : t);
    await saveTemplates(updated);
  }, [templates, saveTemplates]);

  const deleteTemplate = useCallback(async (id: number) => {
    await saveTemplates(templates.filter(t => t.id !== id));
  }, [templates, saveTemplates]);

  const updateTemplateFields = useCallback(async (id: number, fields: Template['fields']) => {
    await updateTemplate(id, { fields });
  }, [updateTemplate]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loadTemplates,
    saveTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    updateTemplateFields,
  };
}
