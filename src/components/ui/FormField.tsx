import React, { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldWrapperProps {
  id: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  id,
  label,
  error,
  helperText,
  required,
  children,
  className = ''
}) => {
  return (
    <div className={`form-group ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="form-label">
          <span>
            {label}
            {required && <span style={{ color: 'var(--status-error)', marginLeft: '4px' }} aria-hidden="true">*</span>}
          </span>
        </label>
      )}
      {children}
      {error ? (
        <div id={`${id}-error`} className="form-error-text" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p id={`${id}-helper`} className="form-helper-text">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, helperText, required, className = '', ...props }, ref) => {
    const inputId = id || props.name || 'input';
    return (
      <FormFieldWrapper id={inputId} label={label} error={error} helperText={helperText} required={required}>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={`form-input ${error ? 'input-error' : ''} ${className}`.trim()}
          {...props}
        />
      </FormFieldWrapper>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, error, helperText, required, className = '', ...props }, ref) => {
    const textareaId = id || props.name || 'textarea';
    return (
      <FormFieldWrapper id={textareaId} label={label} error={error} helperText={helperText} required={required}>
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          className={`form-textarea ${error ? 'input-error' : ''} ${className}`.trim()}
          {...props}
        />
      </FormFieldWrapper>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ label: string; value: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, error, helperText, required, options, children, className = '', ...props }, ref) => {
    const selectId = id || props.name || 'select';
    return (
      <FormFieldWrapper id={selectId} label={label} error={error} helperText={helperText} required={required}>
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          className={`form-select ${error ? 'input-error' : ''} ${className}`.trim()}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
      </FormFieldWrapper>
    );
  }
);
Select.displayName = 'Select';
