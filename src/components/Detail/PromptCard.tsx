import { useState } from 'react';

interface PromptCardProps {
  fieldName: string;
  fieldValue: string;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onToggleSelect: (fieldName: string) => void;
  onCopy: (fieldName: string, value: string) => void;
  copiedField: string | null;
}

export default function PromptCard({
  fieldName, fieldValue, isSelected, isMultiSelectMode,
  onToggleSelect, onCopy, copiedField,
}: PromptCardProps) {
  return (
    <div
      className={`prompt-card ${isSelected ? 'selected' : ''}`}
      onClick={() => isMultiSelectMode && onToggleSelect(fieldName)}
    >
      <div className="prompt-card-header">
        <div className="prompt-field-header" style={{ flex: 1, marginRight: '16px' }}>
          {isMultiSelectMode && (
            <input type="checkbox" className="field-checkbox" checked={isSelected}
              onChange={e => { e.stopPropagation(); onToggleSelect(fieldName); }} />
          )}
          <span className="prompt-field-name">{fieldName}</span>
        </div>
        <div className="prompt-card-actions">
          <button className={`copy-button ${copiedField === fieldName ? 'copied' : ''}`}
            onClick={e => { e.stopPropagation(); onCopy(fieldName, fieldValue); }}>
            {copiedField === fieldName ? '已复制' : '复制'}
          </button>
        </div>
      </div>
      <div className="prompt-card-content">{fieldValue}</div>
    </div>
  );
}
