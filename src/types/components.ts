/**
 * Enhanced React Component Types with proper event handlers and form validation
 */

import React from 'react';
import { z } from 'zod';

// Base Component Props
export interface BaseComponentProps {
  className?: string;
  id?: string;
  'data-testid'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  children?: React.ReactNode;
}

// Enhanced React.FC with better prop inference
export type ReactFC<P = {}> = React.FunctionComponent<P & BaseComponentProps>;

// Event Handler Types with proper generic typing
export interface EventHandlers<T = HTMLElement> {
  onClick?: (event: React.MouseEvent<T>) => void | Promise<void>;
  onDoubleClick?: (event: React.MouseEvent<T>) => void;
  onMouseDown?: (event: React.MouseEvent<T>) => void;
  onMouseUp?: (event: React.MouseEvent<T>) => void;
  onMouseEnter?: (event: React.MouseEvent<T>) => void;
  onMouseLeave?: (event: React.MouseEvent<T>) => void;
  onMouseMove?: (event: React.MouseEvent<T>) => void;
  onMouseOver?: (event: React.MouseEvent<T>) => void;
  onMouseOut?: (event: React.MouseEvent<T>) => void;
}

export interface KeyboardEventHandlers<T = HTMLElement> {
  onKeyDown?: (event: React.KeyboardEvent<T>) => void;
  onKeyUp?: (event: React.KeyboardEvent<T>) => void;
  onKeyPress?: (event: React.KeyboardEvent<T>) => void;
}

export interface FocusEventHandlers<T = HTMLElement> {
  onFocus?: (event: React.FocusEvent<T>) => void;
  onBlur?: (event: React.FocusEvent<T>) => void;
}

export interface FormEventHandlers<T = HTMLFormElement> {
  onSubmit?: (event: React.FormEvent<T>) => void | Promise<void>;
  onReset?: (event: React.FormEvent<T>) => void;
}

export interface InputEventHandlers<T = HTMLInputElement> {
  onChange?: (event: React.ChangeEvent<T>) => void;
  onInput?: (event: React.FormEvent<T>) => void;
  onSelect?: (event: React.SyntheticEvent<T>) => void;
}

// Combined Event Handler Types
export type AllEventHandlers<T = HTMLElement> = EventHandlers<T> &
  KeyboardEventHandlers<T> &
  FocusEventHandlers<T>;

export type FormElementEventHandlers<T = HTMLInputElement> = AllEventHandlers<T> &
  InputEventHandlers<T>;

// Form Validation Types
export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  message?: string;
}

export interface FieldValidation<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
}

export interface FormValidation<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  fields: Partial<Record<keyof T, FieldValidation<T[keyof T]>>>;
}

// Zod-based Form Validation
export type ZodFormSchema<T> = z.ZodSchema<T>;

export interface ZodFormValidation<T extends Record<string, any>> extends FormValidation<T> {
  schema: ZodFormSchema<T>;
  validate: (values: Partial<T>) => Promise<Partial<Record<keyof T, string>>>;
  validateField: (field: keyof T, value: T[keyof T]) => Promise<string | undefined>;
}

// Form Hook Types
export interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T;
  validationSchema?: ZodFormSchema<T>;
  onSubmit: (values: T) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
}

export interface UseFormReturn<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  handleChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (field: keyof T) => (event: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent) => void;
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  resetForm: () => void;
  validateForm: () => Promise<boolean>;
  validateField: (field: keyof T) => Promise<void>;
}

// Button Component Types
export interface ButtonProps extends BaseComponentProps, EventHandlers<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// Input Component Types
export interface InputProps extends BaseComponentProps, FormElementEventHandlers<HTMLInputElement> {
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'search'
    | 'date'
    | 'time'
    | 'datetime-local';
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  validation?: ValidationRule<string | number>;
}

// Select Component Types
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps<T = string>
  extends BaseComponentProps,
    FormElementEventHandlers<HTMLSelectElement> {
  value?: T;
  defaultValue?: T;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
}

// Textarea Component Types
export interface TextareaProps
  extends BaseComponentProps,
    FormElementEventHandlers<HTMLTextAreaElement> {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
  cols?: number;
  maxLength?: number;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  validation?: ValidationRule<string>;
}

// Checkbox Component Types
export interface CheckboxProps
  extends BaseComponentProps,
    FormElementEventHandlers<HTMLInputElement> {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  label?: string;
  error?: string;
  indeterminate?: boolean;
}

// Radio Component Types
export interface RadioProps extends BaseComponentProps, FormElementEventHandlers<HTMLInputElement> {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  label?: string;
  error?: string;
}

// Modal Component Types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  returnFocusOnClose?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  finalFocusRef?: React.RefObject<HTMLElement>;
}

// Loading Component Types
export interface LoadingProps extends BaseComponentProps {
  variant?: 'spinner' | 'dots' | 'bars' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  overlay?: boolean;
}

// Toast/Notification Component Types
export interface ToastProps extends BaseComponentProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Layout Component Types
export interface LayoutProps extends BaseComponentProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string | number;
  centered?: boolean;
  padding?: string | number;
}

// Card Component Types
export interface CardProps extends BaseComponentProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  disabled?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

// Table Component Types
export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: boolean | ((a: T, b: T) => number);
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
}

export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: keyof T | ((record: T) => string);
  rowSelection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[], selectedRows: T[]) => void;
    type?: 'checkbox' | 'radio';
  };
  onRow?: (record: T, index: number) => AllEventHandlers<HTMLTableRowElement>;
  scroll?: { x?: number; y?: number };
}

// Pagination Component Types
export interface PaginationProps extends BaseComponentProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  disabled?: boolean;
  hideOnSinglePage?: boolean;
}

// Search Component Types
export interface SearchProps extends Omit<InputProps, 'type'> {
  onSearch?: (value: string) => void;
  loading?: boolean;
  enterButton?: boolean | React.ReactNode;
  allowClear?: boolean;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

// Date Picker Component Types
export interface DatePickerProps extends BaseComponentProps {
  value?: Date | string;
  defaultValue?: Date | string;
  onChange?: (date: Date | null) => void;
  format?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
  clearable?: boolean;
}

// File Upload Component Types
export interface FileUploadProps extends BaseComponentProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  onFileSelect?: (files: File[]) => void;
  onFileRemove?: (file: File, index: number) => void;
  preview?: boolean;
  dragAndDrop?: boolean;
  uploadUrl?: string;
  onUploadProgress?: (progress: number) => void;
  onUploadSuccess?: (response: any) => void;
  onUploadError?: (error: Error) => void;
}

// Utility Types for Component Composition
export type ComponentWithVariants<T, V extends string> = T & { variant?: V };
export type ComponentWithSizes<T, S extends string> = T & { size?: S };
export type ComponentWithStates<T> = T & { loading?: boolean; disabled?: boolean; error?: boolean };

// Higher-Order Component Types
export interface WithLoadingProps {
  loading: boolean;
}

export interface WithErrorProps {
  error?: string | Error | null;
}

export interface WithDataProps<T> {
  data: T;
  loading: boolean;
  error?: string | Error | null;
  refetch?: () => void;
}

// Render Props Types
export interface RenderProps<T> {
  children: (props: T) => React.ReactNode;
}

export interface DataRenderProps<T> extends RenderProps<WithDataProps<T>> {}

// Generic Component Factory Types
export interface ComponentFactory<P> {
  (props: P): React.JSX.Element;
  displayName?: string;
  defaultProps?: Partial<P>;
}

// Form Field Factory Types
export interface FormFieldFactory<T, P = {}> {
  (props: P & { value?: T; onChange?: (value: T) => void; error?: string }): React.JSX.Element;
}

// Theme-aware Component Types
export interface ThemeProps {
  theme?: 'light' | 'dark' | 'auto';
}

export interface ResponsiveProps<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}

// Animation Component Types
export interface AnimationProps {
  animate?: boolean;
  duration?: number;
  delay?: number;
  easing?: string;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
}

// Accessibility Component Types
export interface A11yProps {
  role?: string;
  tabIndex?: number;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-activedescendant'?: string;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
}

// Combined Props for Complex Components
export type FullComponentProps<T = {}> = BaseComponentProps &
  AllEventHandlers &
  ThemeProps &
  A11yProps &
  T;
