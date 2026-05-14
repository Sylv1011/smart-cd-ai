import React, { useEffect, useMemo, useRef, useState } from 'react';

const ChevronDownIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const highlightMatch = (text, query) => {
  const t = String(text || '');
  const q = (query || '').trim();
  if (!t || !q) return t;
  const idx = t.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return t;
  return (
    <>
      {t.slice(0, idx)}
      <span className="font-semibold text-[#1557F5]">{t.slice(idx, idx + q.length)}</span>
      {t.slice(idx + q.length)}
    </>
  );
};

const toTitleCase = (text) =>
  String(text || '')
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');

export default function SearchableSelect({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled = false,
  hasError = false,
  name,
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const selectingOptionRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [hasTyped, setHasTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setInputValue(toTitleCase(value || ''));
    setHasTyped(false);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const all = (options || []).slice();
    const hasOther = all.some((opt) => String(opt).toLowerCase() === 'other');
    const withoutOther = all.filter((opt) => String(opt).toLowerCase() !== 'other');
    withoutOther.sort((a, b) => String(a).localeCompare(String(b)));
    const orderedAll = hasOther ? [...withoutOther, 'other'] : withoutOther;

    if (!hasTyped) return orderedAll;

    const query = (inputValue || '').trim().toLowerCase();
    if (!query) return orderedAll;

    const prefix = [];
    for (const opt of orderedAll) {
      if (String(opt).toLowerCase() === 'other') continue;
      const lower = String(opt).toLowerCase();
      if (lower.startsWith(query)) prefix.push(opt);
    }
    if (prefix.length) return prefix;
    return hasOther ? ['other'] : [];
  }, [inputValue, options, hasTyped]);

  const openDropdown = () => {
    if (disabled) return;
    setIsOpen(true);
    setActiveIndex(0);
  };

  const selectOption = (option) => {
    selectingOptionRef.current = true;
    setInputValue(toTitleCase(option));
    setHasTyped(false);
    onChange?.({ target: { name, value: option } });
    setIsOpen(false);
    window.setTimeout(() => {
      selectingOptionRef.current = false;
    }, 0);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setHasTyped(true);
    setActiveIndex(0);
    if (!isOpen) openDropdown();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      openDropdown();
      return;
    }

    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(filteredOptions.length - 1, 0)));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filteredOptions[activeIndex];
      if (chosen) selectOption(chosen);
    }
  };

  return (
    <div className={`relative w-full ${disabled ? 'opacity-70' : ''}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={name}
          className={`w-full pr-9 py-4 px-4 text-base font-normal rounded-[8px] border outline-none bg-white text-[#111827] box-border transition-all placeholder:text-[#9CA3AF] focus:border-[#22C55E] ${hasError ? 'border-[#FF5252] shadow-[0_0_0_2px_rgba(255,82,82,0.2)]' : 'border-[#E5E7EB] focus:shadow-[0_0_0_2px_rgba(29,141,238,0.3)]'}`}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={(e) => {
            if (!selectingOptionRef.current) {
              onBlur?.({ target: { name, value: e.target.value } });
            }
          }}
          onFocus={() => openDropdown()}
          onClick={() => openDropdown()}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={!inputValue && !disabled}
          autoComplete="off"
        />
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-full w-6 cursor-pointer items-center justify-center text-[#9CA3AF]"
          onClick={() => {
            if (!disabled) {
              setIsOpen((v) => !v);
              inputRef.current?.focus();
            }
          }}
        >
          <ChevronDownIcon className="dropdown-chevron" />
        </div>
      </div>

      {isOpen && !disabled && (
        <ul className="absolute top-full left-0 z-50 mt-1 max-h-[250px] w-full list-none overflow-y-auto rounded-[8px] border border-[#E2E8F0] bg-white p-0 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)]">
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <li
              key={option}
              className={`cursor-pointer px-4 py-[10px] text-[0.95rem] font-normal text-[#1E293B] transition-colors max-[768px]:min-h-[44px] max-[768px]:py-3 ${index === activeIndex ? 'bg-[#F1F5F9]' : 'bg-white hover:bg-[#F1F5F9]'}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                selectOption(option);
              }}
            >
              {highlightMatch(toTitleCase(option), inputValue)}
            </li>
          )) : (
            <li className="cursor-default px-4 py-[10px] text-[0.9rem] text-[#64748B]">
              No matching city/county found
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
