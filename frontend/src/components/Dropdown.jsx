import React, { useEffect, useMemo, useRef, useState } from 'react';
import DropdownMenu from './DropdownMenu';

const ChevronDownIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const toTitleCase = (text) =>
  String(text || '')
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');

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

/**
 * Unified dropdown used by every select in the investment form.
 *
 * Modes:
 *  - searchable=false  -> strict select (read-only input, pick from the list)
 *  - searchable=true   -> type-to-filter autocomplete
 *
 * Search tuning (only relevant when searchable):
 *  - matchMode 'prefix' | 'contains'
 *  - maxResults          cap the number of filtered results
 *  - pinOther            keep an "other" option pinned to the bottom
 *  - titleCase           display options/value in Title Case
 */
export default function Dropdown({
  name,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled = false,
  hasError = false,
  searchable = false,
  matchMode = 'prefix',
  maxResults,
  pinOther = false,
  titleCase = false,
  noResultsText = 'No matching option found',
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const selectingOptionRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [hasTyped, setHasTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const display = (text) => (titleCase ? toTitleCase(text) : String(text || ''));

  useEffect(() => {
    setInputValue(display(value || ''));
    setHasTyped(false);
  }, [value, titleCase]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const orderedOptions = useMemo(() => {
    const all = (options || []).slice();
    if (!searchable) return all;
    if (pinOther) {
      const hasOther = all.some((opt) => String(opt).toLowerCase() === 'other');
      const rest = all
        .filter((opt) => String(opt).toLowerCase() !== 'other')
        .sort((a, b) => String(a).localeCompare(String(b)));
      return hasOther ? [...rest, 'other'] : rest;
    }
    return all.sort((a, b) => String(a).localeCompare(String(b)));
  }, [options, searchable, pinOther]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !hasTyped) return orderedOptions;

    const query = (inputValue || '').trim().toLowerCase();
    if (!query) return orderedOptions;

    if (matchMode === 'contains') {
      const prefix = [];
      const contains = [];
      for (const opt of options || []) {
        const lower = String(opt || '').toLowerCase();
        if (!lower) continue;
        if (lower.startsWith(query)) prefix.push(opt);
        else if (lower.includes(query)) contains.push(opt);
      }
      const sortAlpha = (a, b) => String(a).localeCompare(String(b));
      prefix.sort(sortAlpha);
      contains.sort(sortAlpha);
      const results = [...prefix, ...contains];
      const limited = maxResults ? results.slice(0, maxResults) : results;
      return limited.length ? limited : orderedOptions;
    }

    const prefix = [];
    for (const opt of orderedOptions) {
      if (pinOther && String(opt).toLowerCase() === 'other') continue;
      if (String(opt).toLowerCase().startsWith(query)) prefix.push(opt);
    }
    if (prefix.length) return maxResults ? prefix.slice(0, maxResults) : prefix;
    return pinOther ? ['other'] : [];
  }, [searchable, hasTyped, inputValue, orderedOptions, options, matchMode, maxResults, pinOther]);

  const openDropdown = () => {
    if (disabled) return;
    setIsOpen(true);
    setActiveIndex(0);
  };

  const selectOption = (option) => {
    selectingOptionRef.current = true;
    setInputValue(display(option));
    setHasTyped(false);
    onChange?.({ target: { name, value: option } });
    setIsOpen(false);
    window.setTimeout(() => {
      selectingOptionRef.current = false;
    }, 0);
  };

  const handleInputChange = (e) => {
    if (!searchable) return;
    setInputValue(e.target.value);
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
          name={name}
          className={`w-full pr-9 py-4 px-4 text-base font-normal rounded-[8px] border outline-none bg-white text-[#111827] box-border transition-all placeholder:text-[#9CA3AF] focus:border-[#22C55E] ${hasError ? 'border-[#FF5252] shadow-[0_0_0_2px_rgba(255,82,82,0.2)]' : 'border-[#E5E7EB] focus:shadow-[0_0_0_2px_rgba(29,141,238,0.3)]'}`}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => openDropdown()}
          onClick={() => openDropdown()}
          onBlur={(e) => {
            if (!selectingOptionRef.current) {
              onBlur?.({ target: { name, value: e.target.value } });
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!searchable}
          required={searchable && !inputValue && !disabled}
          autoComplete="off"
          style={{ cursor: disabled ? 'not-allowed' : searchable ? 'text' : 'pointer' }}
        />
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-full w-6 cursor-pointer items-center justify-center text-[#9CA3AF]"
          onClick={() => {
            if (disabled) return;
            setIsOpen((v) => !v);
            inputRef.current?.focus();
          }}
        >
          <ChevronDownIcon className="dropdown-chevron" />
        </div>
      </div>

      {isOpen && !disabled && (
        <DropdownMenu
          options={filteredOptions}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onSelect={selectOption}
          emptyText={noResultsText}
          renderLabel={(option) =>
            searchable ? highlightMatch(display(option), inputValue) : display(option)
          }
        />
      )}
    </div>
  );
}
