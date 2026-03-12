import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

// Utility function for className merging
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  headerText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  label,
  error,
  disabled = false,
  className,
  headerText,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sizeStyles = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  return (
    <div className={cn('w-full', className)}>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 text-left transition-all outline-none',
            sizeStyles[size],
            'hover:border-gray-300 hover:bg-white',
            'focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500',
            isOpen && 'border-emerald-500 bg-white ring-2 ring-emerald-500',
            disabled && 'cursor-not-allowed opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            !disabled && 'cursor-pointer'
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            {selectedOption?.color && <span className={cn('h-2 w-2 shrink-0 rounded-full', selectedOption.color)} />}
            {selectedOption?.icon}
            <span className={cn('truncate', selectedOption ? 'text-gray-900' : 'text-gray-400')}>{selectedOption ? selectedOption.label : placeholder}</span>
          </div>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && !disabled && (
          <div className="animate-fade-in-up absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl drop-shadow-2xl">
            {headerText && (
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
                <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">{headerText}</p>
              </div>
            )}
            <div className="max-h-[280px] overflow-y-auto bg-white p-1.5">
              {options.map((option) => {
                const isSelected = value === option.value;
                const isDisabled = !!option.disabled;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isDisabled}
                    title={isDisabled ? option.disabledReason || 'Not available' : undefined}
                    onClick={() => {
                      if (isDisabled) return;
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-all',
                      isDisabled
                        ? 'cursor-not-allowed bg-white text-gray-400 opacity-70'
                        : isSelected
                          ? 'bg-emerald-50 font-medium text-emerald-700'
                          : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {option.color && <span className={cn('h-2 w-2 shrink-0 rounded-full', option.color, isDisabled && 'opacity-60')} />}
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                    {isSelected && !isDisabled && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Dropdown;
