// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — FormSelect (react-hook-form + custom Select)
// ═══════════════════════════════════════════════════════════════

import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Select, SelectOption } from './Select';

type FormSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  options: SelectOption[];
  label?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  maxVisibleItems?: number;
  creatable?: boolean;
  toValue?: (raw: string) => unknown;
  toString?: (value: unknown) => string;
  shortcutType?: string;
  shortcutGroup?: string;
};

export function FormSelect<T extends FieldValues>({
  control,
  name,
  options,
  label,
  error,
  placeholder,
  required,
  disabled,
  searchable = true,
  clearable = true,
  maxVisibleItems = 10,
  creatable = false,
  toValue = (v) => v,
  toString,
  shortcutType,
  shortcutGroup,
}: FormSelectProps<T>) {
  const stringify =
    toString && toString !== Object.prototype.toString
      ? toString
      : (v: unknown) => (v == null || v === '' ? '' : String(v));

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          label={label}
          options={options}
          value={stringify(field.value) || (name === 'status' ? 'ACTIVE' : '')}
          onChange={(next) => field.onChange(toValue(next))}
          placeholder={placeholder}
          error={error}
          required={required}
          disabled={disabled}
          searchable={searchable}
          clearable={clearable}
          maxVisibleItems={maxVisibleItems}
          creatable={creatable}
          shortcutType={shortcutType}
          shortcutGroup={shortcutGroup}
        />
      )}
    />
  );
}
