import { useState } from 'react';
import styles from './Detail.module.css';

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
      className={`${styles.promptCard} ${isSelected ? styles.selected : ''}`}
      onClick={() => isMultiSelectMode && onToggleSelect(fieldName)}
    >
      <div className={styles.promptCardHeader}>
        <div className={styles.promptFieldHeader} style={{ flex: 1, marginRight: '16px' }}>
          {isMultiSelectMode && (
            <input type="checkbox" className={styles.fieldCheckbox} checked={isSelected}
              onChange={e => { e.stopPropagation(); onToggleSelect(fieldName); }} />
          )}
          <span className={styles.promptFieldName}>{fieldName}</span>
        </div>
        <div className="prompt-card-actions">
          <button className={`${styles.copyButton} ${copiedField === fieldName ? styles.copied : ''}`}
            onClick={e => { e.stopPropagation(); onCopy(fieldName, fieldValue); }}>
            {copiedField === fieldName ? '已复制' : '复制'}
          </button>
        </div>
      </div>
      <div className={styles.promptCardContent}>{fieldValue}</div>
    </div>
  );
}
