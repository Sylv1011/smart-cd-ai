export const SparkleIcon = ({ className, style }) => (
  <svg className={className} style={style} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 0L9.44444 6.55556L16 8L9.44444 9.44444L8 16L6.55556 9.44444L0 8L6.55556 6.55556L8 0Z" fill="currentColor" />
  </svg>
);

export const LockIcon = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

export const SolidLockIcon = ({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 10V7A5 5 0 0 1 17 7V10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <rect x="4" y="10" width="16" height="11" rx="2.5" fill="currentColor" />
    <circle cx="12" cy="15.5" r="2.2" fill="white" />
  </svg>
);

export const DocumentIcon = ({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

export const CloseIcon = ({ className, onClick }) => (
  <svg className={`${className || ''} cursor-pointer`} onClick={onClick} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export const ShieldCheckIcon = ({ className, style }) => (
  <svg className={className} style={style} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export const ChevronDownIcon = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export const ChevronUpIcon = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

export const ChevronLeftIcon = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

export const SortIcon = ({ active, direction }) => {
  const upActive = active && direction === 'asc';
  const downActive = active && direction === 'desc';

  const base = 'transition-colors';
  const upClass = `${base} ${upActive ? 'text-[#22C55E]' : active ? 'text-[#E2E8F0]' : 'text-[#475569]'}`;
  const downClass = `${base} ${downActive ? 'text-[#22C55E]' : active ? 'text-[#E2E8F0]' : 'text-[#475569]'}`;

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2L9 5H3L6 2Z" className={upClass} fill="currentColor" />
      <path d="M6 10L3 7H9L6 10Z" className={downClass} fill="currentColor" />
    </svg>
  );
};

export const FilterIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

export const HeaderSearchIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"></circle>
    <line x1="20" y1="20" x2="16.6" y2="16.6"></line>
  </svg>
);

export const ClockIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

export const ExternalLinkIcon = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

export const StrategyTabIcon = ({ id, active }) => {
  const color = active ? '#FFFFFF' : id === 'ladder' ? '#FACC15' : '#FFFFFF';
  if (id === 'best-rate') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="m12 2.4 2.92 5.92 6.54.95-4.73 4.61 1.12 6.51L12 17.31l-5.85 3.08 1.12-6.51-4.73-4.61 6.54-.95L12 2.4Z" />
      </svg>
    );
  }
  if (id === 'ladder') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={color} aria-hidden="true">
        <path d="M13 2 4 14h7l-1 8 10-13h-7V2Z" />
      </svg>
    );
  }
  if (id === 'barbell') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
        <path d="m12 3 9 9-9 9-9-9 9-9Z" />
        <path d="m12 7 5 5-5 5-5-5 5-5Z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
};

export const SunIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93l1.41 1.41" />
    <path d="M17.66 17.66l1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M4.93 19.07l1.41-1.41" />
    <path d="M17.66 6.34l1.41-1.41" />
  </svg>
);

export const MoonIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
  </svg>
);

