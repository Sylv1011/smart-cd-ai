import React, { useState, useEffect, useRef } from 'react';

const ChevronDownIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function StrictSelect({ 
  value, 
  onChange, 
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
    <div className={`searchable-select-wrapper strict-select-wrapper theme-${theme} ${disabled ? 'disabled' : ''}`} ref={wrapperRef}>
      <div 
        className={`searchable-input-container strict-input-container theme-${theme} ${hasError ? 'error-border' : ''}`} 
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <input
          type="text"
          className={`custom-input dark-theme-input`}
          value={value || ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          style={{ 
            cursor: disabled ? 'not-allowed' : 'pointer', 
            backgroundColor: 'transparent', 
            outline: 'none',
            fontWeight: '400',
            fontSize: '16px'
          }}
        />
        <div className="searchable-icon">
          <ChevronDownIcon className="dropdown-chevron" />
        </div>
      </div>
      {showDropdown && !disabled && options.length > 0 && (
        <ul className={`searchable-dropdown-list strict-dropdown-list ${hasSeparators ? 'with-separators' : ''}`}>
          {options.map((option, index) => (
            <li 
              key={index} 
              className={`searchable-option ${option === value ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
              style={{ 
                fontWeight: '400', 
                backgroundColor: option === value ? '#F1F5F9' : (theme === 'dark' ? '#0D1B2D' : '#FFFFFF'), 
                color: option === value ? '#1E293B' : (theme === 'dark' ? '#FFFFFF' : '#1E293B'),
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#F1F5F9';
                e.target.style.color = '#1E293B';
                e.target.style.fontWeight = '400';
              }}
              onMouseLeave={(e) => {
                if (option !== value) {
                  e.target.style.backgroundColor = theme === 'dark' ? '#0D1B2D' : '#FFFFFF';
                  e.target.style.color = theme === 'dark' ? '#FFFFFF' : '#1E293B';
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
