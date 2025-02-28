import React from 'react';

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 简化版的CheckboxField组件，专为Zustand版本设计
 * 不依赖TopStore和UndoManager
 */
const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = ''
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className={`checkbox-field ${className}`}>
      <label className={disabled ? 'disabled' : ''}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
        />
        <span className="checkbox-label">{label}</span>
      </label>
    </div>
  );
};

export default CheckboxField; 