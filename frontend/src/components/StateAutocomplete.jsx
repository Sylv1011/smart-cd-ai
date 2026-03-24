import React, { useEffect, useMemo, useRef, useState } from 'react';

const ChevronDownIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const MAX_RESULTS = 10;

const getFilteredStates = (states, query) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];

  const prefix = [];
  const contains = [];

  for (const s of states) {
    const lower = String(s || '').toLowerCase();
    if (!lower) continue;
    if (lower.startsWith(q)) prefix.push(s);
    else if (lower.includes(q)) contains.push(s);
  }

  const sortAlpha = (a, b) => String(a).localeCompare(String(b));
  prefix.sort(sortAlpha);
  contains.sort(sortAlpha);

  return [...prefix, ...contains].slice(0, MAX_RESULTS);
};

const highlightMatch = (text, query) => {
  const t = String(text || '');
  const q = (query || '').trim();
  if (!t || !q) return t;

  const idx = t.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return t;

  const before = t.slice(0, idx);
  const match = t.slice(idx, idx + q.length);
  const after = t.slice(idx + q.length);

  return (
    <>
      {before}
      <span className="font-semibold text-[#1557F5]">{match}</span>
      {after}
    </>
  );
};

export default function StateAutocomplete({
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  hasError = false,
}) {
  const wrapperRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [hasTyped, setHasTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const all = (options || []).slice().sort((a, b) => String(a).localeCompare(String(b)));
    if (!hasTyped) return all;
    const results = getFilteredStates(options || [], inputValue);
    return results.length ? results : all;
  }, [options, inputValue, hasTyped]);

  useEffect(() => {
    setInputValue(value || '');
    setHasTyped(false);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        const normalized = (inputValue || '').trim();
        if (normalized && !((options || []).includes(normalized))) {
          setInputValue(value || '');
          setHasTyped(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, options, value]);

  const selectOption = (opt) => {
    setInputValue(opt);
    setHasTyped(false);
    onChange?.({ target: { name, value: opt } });
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${disabled ? 'opacity-70' : ''}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          id={name}
          className={`w-full pr-9 py-4 px-4 text-base font-normal rounded-[8px] border outline-none bg-white text-[#111827] box-border transition-all placeholder:text-[#9CA3AF] focus:border-[#22C55E] ${hasError ? 'border-[#FF5252] shadow-[0_0_0_2px_rgba(255,82,82,0.2)]' : 'border-[#E5E7EB] focus:shadow-[0_0_0_2px_rgba(29,141,238,0.3)]'}`}
          value={inputValue}
          onChange={(e) => {
            const next = e.target.value;
            setInputValue(next);
            setHasTyped(true);
            setActiveIndex(0);
            if (!disabled) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setHasTyped(false);
              setActiveIndex(0);
            }
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              setIsOpen(true);
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
              setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, filtered.length - 1)));
              return;
            }

            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
              return;
            }

            if (e.key === 'Enter') {
              e.preventDefault();
              const chosen = filtered[activeIndex];
              if (chosen) selectOption(chosen);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={!inputValue && !disabled}
        />
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] cursor-pointer flex items-center justify-center h-full w-6"
          onClick={() => {
            if (disabled) return;
            setIsOpen((v) => !v);
            setHasTyped(false);
            setActiveIndex(0);
          }}
        >
          <ChevronDownIcon className="dropdown-chevron" />
        </div>
      </div>

      {isOpen && !disabled && filtered.length > 0 && (
        <ul className="absolute top-full left-0 w-full max-h-[250px] overflow-y-auto bg-white border border-[#E2E8F0] rounded-[8px] mt-1 p-0 list-none z-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)]">
          {filtered.map((opt, idx) => (
            <li
              key={opt}
              className={`px-4 py-[10px] text-[#1E293B] cursor-pointer text-[0.95rem] transition-colors font-normal max-[768px]:min-h-[44px] max-[768px]:py-3 ${idx === activeIndex ? 'bg-[#F1F5F9]' : 'bg-white hover:bg-[#F1F5F9]'}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => selectOption(opt)}
            >
              {highlightMatch(opt, inputValue)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
