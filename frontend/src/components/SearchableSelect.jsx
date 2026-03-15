import React, { useState, useEffect, useRef } from 'react';

const ChevronDownIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function SearchableSelect({ 
  value, 
  onChange, 
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
    <div className={`searchable-select-wrapper ${disabled ? 'disabled' : ''}`} ref={wrapperRef}>
      <div className="searchable-input-container">
        <input
          type="text"
          className={`custom-input dark-theme-input ${hasError ? 'error-border' : ''}`}
          value={inputValue}
          onChange={handleInputChange}
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
          style={{ fontWeight: '400' }}
        />
        <div className="searchable-icon" onClick={() => {
          if (!disabled) {
            if (!showDropdown) setFilteredOptions(options);
            setShowDropdown(!showDropdown);
          }
        }}>
          <ChevronDownIcon className="dropdown-chevron" />
        </div>
      </div>
      {showDropdown && !disabled && filteredOptions.length > 0 && (
        <ul className="searchable-dropdown-list" style={{ backgroundColor: '#FFFFFF' }}>
          {filteredOptions.map((option, index) => (
            <li 
              key={index} 
              className={`searchable-option ${option === value ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
              style={{ 
                fontWeight: '400', 
                backgroundColor: option === value ? '#F1F5F9' : '#FFFFFF', 
                color: '#1E293B',
                cursor: 'pointer',
                padding: '10px 16px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#F1F5F9';
                e.target.style.color = '#1E293B';
              }}
              onMouseLeave={(e) => {
                if (option !== value) {
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.color = '#1E293B';
                } else {
                  e.target.style.backgroundColor = '#F1F5F9';
                }
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
