import React from 'react';

/**
 * The option list shown when a Dropdown is open.
 *
 * This is the single source of truth for how every dropdown menu looks and
 * behaves: font, size, padding, hover/active highlight, and empty state are all
 * defined here so all dropdowns stay visually consistent.
 *
 * Props:
 *  - options       array of option values to render
 *  - activeIndex   index of the currently highlighted option
 *  - onHover       (index) => void, called when an option is hovered
 *  - onSelect      (option) => void, called when an option is chosen
 *  - renderLabel   (option) => node, customizes how each option is displayed
 *  - emptyText     text shown when there are no options
 */
export default function DropdownMenu({
  options,
  activeIndex,
  onHover,
  onSelect,
  renderLabel,
  emptyText = 'No matching option found',
}) {
  return (
    <ul className="absolute top-full left-0 z-50 mt-1 max-h-[250px] w-full list-none overflow-y-auto rounded-[8px] border border-[#E2E8F0] bg-white p-0 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3)]">
      {options.length > 0 ? (
        options.map((option, index) => (
          <li
            key={`${option}-${index}`}
            className={`cursor-pointer px-4 py-[10px] text-[0.95rem] font-normal text-[#1E293B] transition-colors max-[768px]:min-h-[44px] max-[768px]:py-3 ${index === activeIndex ? 'bg-[#F1F5F9]' : 'bg-white hover:bg-[#F1F5F9]'}`}
            onMouseEnter={() => onHover?.(index)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect?.(option);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              onSelect?.(option);
            }}
          >
            {renderLabel ? renderLabel(option) : option}
          </li>
        ))
      ) : (
        <li className="cursor-default px-4 py-[10px] text-[0.9rem] text-[#64748B]">{emptyText}</li>
      )}
    </ul>
  );
}
