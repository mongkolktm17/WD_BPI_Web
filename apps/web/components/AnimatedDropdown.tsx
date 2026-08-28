'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AnimatedDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function AnimatedDropdown({
  options,
  value,
  onChange,
  placeholder = 'เลือก...',
  label,
  disabled = false,
  className = '',
}: AnimatedDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      )}
      <div className="dropdown-container">
        <div
          className={`dropdown-button ${isOpen ? 'active' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={`dropdown-button-text ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="dropdown-arrow">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className={`dropdown-menu ${isOpen ? 'open' : ''}`}>
          <svg className="dropdown-border" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect
              className={`dropdown-border-rect ${isOpen ? 'animate' : ''}`}
              x="0.5" y="0.5" width="99" height="99" rx="7"
              fill="white" fillOpacity="0"
              stroke="#c6c6cc" strokeWidth="1"
              strokeDasharray="400 400"
              strokeDashoffset={isOpen ? '0' : '-400'}
            />
          </svg>
          <div className="dropdown-shadow"></div>
          <div className={`dropdown-content ${isOpen ? 'visible' : ''}`}>
            {options.map((option) => (
              <div
                key={option.value}
                className={`dropdown-row ${option.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.icon && <span className="flex-shrink-0 mr-2">{option.icon}</span>}
                <span>{option.label}</span>
                {option.value === value && (
                  <svg className="ml-auto flex-shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
