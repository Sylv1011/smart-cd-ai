import React, { useState, useEffect, useRef } from 'react';

const ChevronDownIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function StrictSelect({ 
  value, 
  onChange, 
  onBlur,
  options, 
  placeholder, 
  disabled = false,
  hasError = false,
  hasSeparators = false,
  theme = 'light',
  name
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (option) => {
    onChange({ target: { name, value: option } });
    setShowDropdown(false);
  };

  return (
    <div className={`relative w-full ${disabled ? 'opacity-70' : ''}`} ref={wrapperRef}>
      <div 
        className={`relative flex items-center rounded-[8px] h-12 ${theme === 'dark' ? 'bg-[#0D1B2D] border border-[#1A3050]' : 'bg-white border border-[#E5E7EB]'} ${hasError ? 'border-[#EF4444] shadow-[0_0_0_2px_rgba(255,82,82,0.2)]' : ''}`} 
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <input
          type="text"
          id={name}
          className={`w-full pr-9 px-4 text-base font-normal rounded-[8px] border-0 ${theme === 'dark' ? 'bg-transparent text-white' : 'bg-transparent text-[#111827]'} outline-none`}
          value={value || ''}
          placeholder={placeholder}
          disabled={disabled}
          onBlur={(e) => onBlur?.(e)}
          readOnly
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] flex items-center justify-center h-full w-6">
          <ChevronDownIcon className={`${theme === 'dark' ? 'text-white' : ''}`} />
        </div>
      </div>
      {showDropdown && !disabled && options.length > 0 && (
        <ul className={`absolute top-full left-0 ${theme === 'dark' ? 'bg-[#0D1B2D]' : 'bg-white'} w-full min-w-full ${theme === 'dark' ? 'whitespace-nowrap' : ''} max-h-[250px] overflow-y-auto border border-[#E2E8F0] rounded-[8px] mt-1 p-0 list-none z-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)]`}>
          {options.map((option, index) => (
            <li 
              key={index} 
              className={`px-4 py-[10px] text-[16px] font-normal cursor-pointer transition-colors max-[768px]:min-h-[44px] max-[768px]:py-3 ${hasSeparators && index !== options.length - 1 ? 'border-b border-dotted border-[#E2E8F0]' : ''} ${option === value ? 'bg-[#F1F5F9] text-[#1E293B]' : theme === 'dark' ? 'bg-[#0D1B2D] text-white hover:bg-[#F1F5F9] hover:text-[#1E293B]' : 'bg-white text-[#1E293B] hover:bg-[#F1F5F9]'}`}
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
