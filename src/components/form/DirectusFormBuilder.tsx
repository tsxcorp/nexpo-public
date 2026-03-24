import { Form, useForm } from 'react-hook-form';
import { FormField } from '@/directus/types';
import { cn } from '@/lib/utils/tw';
import Image from 'next/image';

interface DirectusFormBuilderProps {
  element: FormField;
  hookForm: any;
  disabled?: boolean;
  required?: boolean;
}

export default function DirectusFormBuilder({ element, hookForm, disabled, required }: DirectusFormBuilderProps) {
  console.log('DirectusFormBuilder - Received element:', element);
  console.log('DirectusFormBuilder - Hook form:', hookForm);

  if (!element?.name) {
    console.log('DirectusFormBuilder - No element name found');
    return null;
  }

  const { register } = hookForm;
  console.log('DirectusFormBuilder - Register function:', register);

  // Get the first translation for now (we can add language support later)
  const translation = element.translations?.[0];

  // Use only neutral or variable-based colors for styling
  const commonProps = {
    id: element.name,
    name: element.name,
    className: 'form-input w-full rounded-md px-4 py-4 bg-[var(--color-bg,theme(colors.white))] text-gray-900 border border-gray-300 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] disabled:bg-gray-100 disabled:cursor-not-allowed',
    placeholder: translation?.placeholder || '',
    'aria-label': translation?.label || element.label || element.name,
    style: { borderColor: 'var(--color-border, #d1d5db)' },
    disabled: disabled,
  };

  console.log('DirectusFormBuilder - Common props:', commonProps);
  console.log('DirectusFormBuilder - Element type:', element.type);

  // Xác định trạng thái bắt buộc (động hoặc từ schema)
  const isRequired = required !== undefined ? required : (element.is_required || element.validation?.includes('required'));

  // Common validation rules
  const getValidationRules = () => {
    const rules: any = {
      required: isRequired ? 'This field is required' : false
    };

    if (element.validation?.includes('email')) {
      rules.pattern = {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Invalid email address'
      };
    }

    return rules;
  };

  switch (element.$formkit || element.type) {
    case 'text':
    case 'input':
      console.log('DirectusFormBuilder - Rendering input field');
      return (
        <input 
          {...commonProps}
          type="text"
          {...register(element.name, getValidationRules())}
        />
      );

    case 'email':
      console.log('DirectusFormBuilder - Rendering email field');
      return (
        <input 
          {...commonProps}
          type="email"
          {...register(element.name, getValidationRules())}
        />
      );

    case 'number':
      console.log('DirectusFormBuilder - Rendering number field');
      return (
        <input 
          {...commonProps}
          type="number"
          {...register(element.name, {
            ...getValidationRules(),
            valueAsNumber: true
          })}
        />
      );

    case 'textarea':
      console.log('DirectusFormBuilder - Rendering textarea field');
      return (
        <textarea 
          {...commonProps}
          rows={5}
          {...register(element.name, getValidationRules())}
        />
      );

    case 'select':
      console.log('DirectusFormBuilder - Rendering select field with options:', element.options);
      return (
        <select 
          {...commonProps}
          {...register(element.name, getValidationRules())}
        >
          <option value="">Select an option</option>
          {element.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'multiselect':
      console.log('DirectusFormBuilder - Rendering multiselect field with options:', element.options);
      return (
        <div className="space-y-2">
          {element.options?.map((option) => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                value={option.value}
                className="form-checkbox h-4 w-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
                {...register(element.name, {
                  ...getValidationRules(),
                  validate: (value: string[] | undefined) => {
                    if (element.validation?.includes('required') && (!value || value.length === 0)) {
                      return 'Please select at least one option';
                    }
                    return true;
                  }
                })}
              />
              <span className="text-gray-800">{option.label}</span>
            </label>
          ))}
        </div>
      );

    case 'date':
      return (
        <input
          {...commonProps}
          type="date"
          placeholder={undefined}
          className={cn(commonProps.className, 'cursor-pointer')}
          {...register(element.name, getValidationRules())}
        />
      );

    case 'datetime':
      return (
        <input
          {...commonProps}
          type="datetime-local"
          placeholder={undefined}
          className={cn(commonProps.className, 'cursor-pointer')}
          {...register(element.name, getValidationRules())}
        />
      );

    case 'file':
    case 'image': {
      const isImage = (element.$formkit || element.type) === 'image';
      const fileValue = hookForm.watch(element.name);
      const hasFile = fileValue instanceof FileList && fileValue.length > 0;
      const urlValue = typeof fileValue === 'string' && (fileValue.startsWith('http://') || fileValue.startsWith('https://')) ? fileValue : '';

      return (
        <div className="space-y-2">
          {/* File upload */}
          <div className="relative">
            <input
              {...commonProps}
              type="file"
              accept={isImage ? 'image/*' : undefined}
              className={cn(
                commonProps.className,
                'file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary)]/90 cursor-pointer'
              )}
              {...register(element.name, {
                required: isRequired && !urlValue ? 'Please upload a file' : false,
                validate: (value: FileList | string | undefined) => {
                  if (isRequired && !urlValue && (!value || (value instanceof FileList && value.length === 0))) {
                    return 'This field is required';
                  }
                  return true;
                },
              })}
            />
          </div>

          {/* Image preview from file */}
          {isImage && hasFile && fileValue[0] instanceof File && (
            <div className="mt-2 relative w-40 h-40 border rounded-md overflow-hidden bg-gray-50">
              <Image
                src={URL.createObjectURL(fileValue[0])}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
                onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
              />
            </div>
          )}
          {hasFile && (
            <div className="text-xs text-gray-500">
              Selected: {fileValue[0]?.name} ({(fileValue[0]?.size / 1024).toFixed(1)} KB)
            </div>
          )}

          {/* Separator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-xs text-gray-400">or paste URL</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          {/* URL input */}
          <input
            type="url"
            value={urlValue}
            placeholder="https://..."
            disabled={commonProps.disabled}
            className={commonProps.className}
            style={commonProps.style}
            onChange={(e) => {
              hookForm.setValue(element.name, e.target.value, { shouldValidate: true });
            }}
          />
          {/* URL preview */}
          {urlValue && (
            <div className="space-y-1">
              {isImage && (
                <div className="relative w-40 h-40 border rounded-md overflow-hidden bg-gray-50">
                  <Image src={urlValue} alt="Preview" fill className="object-cover" unoptimized />
                </div>
              )}
              <a href={urlValue} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 truncate block">
                {urlValue}
              </a>
            </div>
          )}
        </div>
      );
    }

    default:
      console.log('DirectusFormBuilder - No matching field type found');
      return null;
  }
}