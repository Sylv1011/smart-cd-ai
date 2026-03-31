import React, { useState, useEffect, useRef } from 'react';

const ChevronDownIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function SearchableSelect({ 
  value, 
  onChange, 
  onBlur,
  options, 
  placeholder, 
  disabled = false,
  hasError = false,
  name
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && inputValue !== value && showDropdown) {
        const lowerVal = inputValue.toLowerCase();
        setFilteredOptions(options.filter(opt => opt.toLowerCase().includes(lowerVal)));
      } else {
        setFilteredOptions(options);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue, options, value, showDropdown]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange({ target: { name, value: val } });
    if (!showDropdown && !disabled) setShowDropdown(true);
  };

  const handleOptionClick = (option) => {
    setInputValue(option);
    onChange({ target: { name, value: option } });
    setShowDropdown(false);
  };

  return (
    <div className={`relative w-full ${disabled ? 'opacity-70' : ''}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          id={name}
          className={`w-full pr-9 py-4 px-4 text-base font-normal rounded-[8px] border outline-none bg-white text-[#111827] box-border transition-all placeholder:text-[#9CA3AF] focus:border-[#22C55E] ${hasError ? 'border-[#FF5252] shadow-[0_0_0_2px_rgba(255,82,82,0.2)]' : 'border-[#E5E7EB] focus:shadow-[0_0_0_2px_rgba(29,141,238,0.3)]'}`}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={(e) => onBlur?.(e)}
          onFocus={(e) => {
            if (!disabled) {
              setFilteredOptions(options);
              setShowDropdown(true);
              e.target.select();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={!inputValue && !disabled}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] cursor-pointer flex items-center justify-center h-full w-6" onClick={() => {
          if (!disabled) {
            if (!showDropdown) setFilteredOptions(options);
            setShowDropdown(!showDropdown);
          }
        }}>
          <ChevronDownIcon className="dropdown-chevron" />
        </div>
      </div>
      {showDropdown && !disabled && filteredOptions.length > 0 && (
        <ul className="absolute top-full left-0 w-full max-h-[250px] overflow-y-auto bg-white border border-[#E2E8F0] rounded-[8px] mt-1 p-0 list-none z-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)]">
          {filteredOptions.map((option, index) => (
            <li 
              key={index} 
              className={`px-4 py-[10px] text-[#1E293B] cursor-pointer text-[0.95rem] transition-colors font-normal max-[768px]:min-h-[44px] max-[768px]:py-3 ${option === value ? 'bg-[#F1F5F9]' : 'bg-white hover:bg-[#F1F5F9]'}`}
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
