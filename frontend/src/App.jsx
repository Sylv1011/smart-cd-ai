import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { locationData } from './utils/locationData';
import { usStates } from './utils/statesData';
import { stateNameToCode } from './utils/stateCodes';
import AIAssistant from './AIAssistant';
import Dropdown from './components/Dropdown';
import BankBadge from './components/BankBadge';
import BulletStrategyMockup from './components/BulletStrategyMockup';
import BarbellTab from './components/BarbellTab';
import LadderTab from './components/LadderTab';
import Footer from './components/Footer';
import CD_header from './components/CD_header';

// Per-strategy accent colors for the results tab bar.
// Full static class strings (not interpolated) so Tailwind's JIT generates them.
// NOTE: exact shades are an educated guess pending Figma confirmation.
const STRATEGY_TAB_COLORS = {
  'best-rate': {
    text: 'text-[#3B82F6]',
    active: 'border-[#3B82F6] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28),0_0_0_1px_rgba(59,130,246,0.2)]',
    hover: 'hover:border-[#3B82F6]/25 hover:shadow-[0_0_22px_rgba(59,130,246,0.07),inset_0_0_0_1px_rgba(59,130,246,0.12)]',
  },
  ladder: {
    text: 'text-[#10B981]',
    active: 'border-[#10B981] shadow-[inset_0_0_0_1px_rgba(16,185,129,0.28),0_0_0_1px_rgba(16,185,129,0.2)]',
    hover: 'hover:border-[#10B981]/25 hover:shadow-[0_0_22px_rgba(16,185,129,0.07),inset_0_0_0_1px_rgba(16,185,129,0.12)]',
  },
  barbell: {
    text: 'text-[#A855F7]',
    active: 'border-[#A855F7] shadow-[inset_0_0_0_1px_rgba(168,85,247,0.28),0_0_0_1px_rgba(168,85,247,0.2)]',
    hover: 'hover:border-[#A855F7]/25 hover:shadow-[0_0_22px_rgba(168,85,247,0.07),inset_0_0_0_1px_rgba(168,85,247,0.12)]',
  },
  bullet: {
    text: 'text-[#F59E0C]',
    active: 'border-[#F59E0C] shadow-[inset_0_0_0_1px_rgba(245,158,11,0.28),0_0_0_1px_rgba(245,158,11,0.2)]',
    hover: 'hover:border-[#F59E0C]/25 hover:shadow-[0_0_22px_rgba(245,158,11,0.07),inset_0_0_0_1px_rgba(245,158,11,0.12)]',
  },
};

const SparkleIcon = ({ className, style }) => (
  <svg className={className} style={style} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 0L9.44444 6.55556L16 8L9.44444 9.44444L8 16L6.55556 9.44444L0 8L6.55556 6.55556L8 0Z" fill="currentColor" />
  </svg>
);

const LockIcon = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const SolidLockIcon = ({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 10V7A5 5 0 0 1 17 7V10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <rect x="4" y="10" width="16" height="11" rx="2.5" fill="currentColor" />
    <circle cx="12" cy="15.5" r="2.2" fill="white" />
  </svg>
);

const DocumentIcon = ({ className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const CloseIcon = ({ className, onClick }) => (
  <svg className={`${className || ''} cursor-pointer`} onClick={onClick} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ShieldCheckIcon = ({ className, style }) => (
  <svg className={className} style={style} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ChevronDownIcon = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUpIcon = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const ChevronLeftIcon = ({ className, onClick }) => (
  <svg className={className} onClick={onClick} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const SortIcon = ({ active, direction }) => {
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

const FilterIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const ExternalLinkIcon = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const StrategyTabIcon = ({ id }) => {
  if (id === 'best-rate') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m12 2.4 2.92 5.92 6.54.95-4.73 4.61 1.12 6.51L12 17.31l-5.85 3.08 1.12-6.51-4.73-4.61 6.54-.95L12 2.4Z" />
      </svg>
    );
  }
  if (id === 'ladder') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13 2 4 14h7l-1 8 10-13h-7V2Z" />
      </svg>
    );
  }
  if (id === 'barbell') {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m12 3 9 9-9 9-9-9 9-9Z" />
        <path d="m12 7 5 5-5 5-5-5 5-5Z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
};

const SunIcon = ({ className }) => (
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

const MoonIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
  </svg>
);


const STATES_WITH_LOCAL_TAX = ['New York', 'Maryland', 'Indiana', 'Michigan'];

const normalizeFilingStatusForRanker = (value) => {
  const v = (value || '').trim().toLowerCase();
  if (!v) return 'single';
  if (v.startsWith('single')) return 'single';
  if (v.startsWith('head')) return 'hoh';
  if (v.startsWith('married filing jointly') || v.includes('jointly') || v.includes('surviving')) return 'joint';
  // Ranking engine treats unsupported statuses best-effort; use single for MFS to avoid surprises.
  return 'single';
};

const parseTermToMonths = (label) => {
  const v = (label || '').trim();
  const m = v.match(/^(\d+)\s*(Month|Year)/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = (m[2] || '').toLowerCase();
    return unit.startsWith('year') ? n * 12 : n;
  }
  if (/^5\s*Year/i.test(v)) return 60;
  // Safe fallback: 12 months
  return 12;
};

const toBulletTermLabel = (searchTermLabel) => {
  const months = parseTermToMonths(searchTermLabel);
  return `${months} months`;
};

const normalizeBarbellSplit = (value) => {
  const allowed = [20, 30, 40, 50];
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return allowed.reduce((closest, current) =>
    Math.abs(current - numeric) < Math.abs(closest - numeric) ? current : closest
  , allowed[0]);
};

const isSupportedBarbellSplit = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 20 && numeric <= 50 && numeric % 10 === 0;
};

const buildBarbellFormData = (formData, barbellControls) => ({
  ...formData,
  term_length_months: barbellControls?.term || formData.term_length_months,
  investment_amount: barbellControls?.amount || formData.investment_amount,
});

const ALLOWED_TERM_MONTHS = [3, 6, 9, 12, 18, 24, 36, 48, 60];
const TERM_LENGTH_OPTIONS = [
  '3 Month',
  '6 Month',
  '9 Month',
  '12 Month',
  '18 Month',
  '24 Month',
  '3 Year',
  '4 Year',
  '5 Year',
];

const INCOME_RANGE_OPTIONS = [
  '<$25,000',
  '$25,000 - $50,000',
  '$50,000 - $75,000',
  '$75,000 - $100,000',
  '$100,000 - $150,000',
  '$150,000 - $200,000',
  '$200,000+',
];

const FILING_STATUS_OPTIONS = [
  'Single',
  'Married Filing Jointly (includes Qualifying Surviving Spouse)',
  'Married Filing Separately',
  'Head of Household',
];

const LAST_SEARCH_STORAGE_KEY = 'smartcd:last_rank_inputs:v1';
const getSearchStorage = () => window.sessionStorage;
const clearSearchStorage = () => {
  try {
    getSearchStorage().removeItem(LAST_SEARCH_STORAGE_KEY);
  } catch {
    // ignore
  }
};
const hasRestorableResultsSession = () => {
  try {
    return Boolean(getSearchStorage().getItem(LAST_SEARCH_STORAGE_KEY));
  } catch {
    return false;
  }
};

const normalizeSavedTermLabel = (value) => {
  const v = (value || '').trim();
  if (TERM_LENGTH_OPTIONS.includes(v)) return v;
  if (/^5\s*Year\s*and\s*Above$/i.test(v)) return '5 Year';
  return v;
};

const normalizeSavedIncomeLabel = (value) => {
  const v = (value || '').trim();
  const map = {
    'less than $25,000': '<$25,000',
    '$25,000 - $35,000': '$25,000 - $50,000',
    '$35,000 - $50,000': '$25,000 - $50,000',
    '$200,000 - $250,000': '$200,000+',
    '$250,000 above': '$200,000+',
  };
  return map[v] || v;
};

  const formatMoney = (n) => {
    const x = Number(n);
    if (!isFinite(x)) return '$0.00';
    return `$${x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const splitWhyThisFitsText = (text) => {
    const normalized = String(text ?? '').replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const paragraphs = normalized
      .split(/\n{2,}/g)
      .map((s) => s.trim())
      .filter(Boolean);

    if (paragraphs.length > 1) return paragraphs;

    const sentences = (normalized.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [])
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length <= 1) return [normalized];

    const grouped = [];
    for (let i = 0; i < sentences.length; i += 2) {
      grouped.push(sentences.slice(i, i + 2).join(' '));
    }
    return grouped;
  };

  const adaptRankResponseToUiResults = (rankPayload) => {
  const bank = Array.isArray(rankPayload?.bank_cds) ? rankPayload.bank_cds : [];
  const brokered = Array.isArray(rankPayload?.brokered_cds) ? rankPayload.brokered_cds : [];
  const treasuries = Array.isArray(rankPayload?.treasuries) ? rankPayload.treasuries : [];
  const overallTop = Array.isArray(rankPayload?.overall_top) ? rankPayload.overall_top : [];

  const toProductType = (pt) => {
    if (pt === 'treasury') return 'Treasuries';
    if (pt === 'brokered_cd') return 'Brokerage CDs';
    return 'Bank CDs';
  };

  const toInstitutionType = (pt, o) => {
    if (pt === 'Treasuries') return 'Backed by U.S. Government';
    if (pt === 'Brokerage CDs') {
      const broker = o?.brokerage_firm ? `Issued through ${o.brokerage_firm}` : 'Brokered';
      return `Member of FDIC, ${broker}`;
    }
    return 'Member of FDIC';
  };

  const toWhyThisFits = (pt) => {
    if (pt === 'Treasuries') return 'Treasury interest is exempt from state and local taxes.';
    if (pt === 'Brokerage CDs') return 'Often competitive rates with brokerage access and FDIC insurance.';
    return 'FDIC-insured CDs with strong after-tax returns for your term.';
  };

  const mapOffer = (o) => {
    const productType = toProductType(o?.product_type);
    const provider =
      o?.institution_name ||
      o?.issuing_bank ||
      o?.brokerage_firm ||
      'Unknown';

    const grossInterest = Number(o?.nominal_interest_usd ?? 0);
    const totalTax = grossInterest - Number(o?.after_tax_interest_usd ?? 0);
    // For treasuries, savings = state+local tax avoided (API returns the user's actual marginal
    // rates even for treasuries, so we use the raw fields here, not the zeroed stateRate/localRate).
    const estimatedSavings = productType === 'Treasuries'
      ? Math.max(0, grossInterest * (Number(o?.state_rate ?? 0) + Number(o?.local_rate ?? 0)))
      : 0;

    const rankOverall = Number(o?.rank_overall);
    const topPickRank = Number.isFinite(rankOverall) && rankOverall >= 1 && rankOverall <= 3 ? rankOverall : null;

    const linkKey = o?.destination_url || o?.source_url || '';
    const idBase = `${productType}-${provider}-${o?.term_months ?? ''}-${o?.apy_nominal ?? ''}-${linkKey}`;
    const detailsUrl = typeof o?.destination_url === 'string' && o.destination_url.trim()
      ? o.destination_url.trim()
      : (typeof o?.source_url === 'string' && o.source_url.trim() ? o.source_url.trim() : null);

    return {
      id: idBase,
      provider,
      institutionType: toInstitutionType(productType, o),
      productType,
      apiProductType: o?.product_type ?? null,
      institutionName: o?.institution_name || o?.issuing_bank || null,
      brokerageFirm: o?.brokerage_firm || null,
      termMonths: Number(o?.term_months ?? 0) || null,
      apyNominal: o?.apy_nominal ?? null,
      afterTaxApy: o?.after_tax_apy ?? null,
      afterTaxInterestUsd: o?.after_tax_interest_usd ?? null,
      minimumDeposit: o?.minimum_deposit ?? null,
      fdicInsured: o?.fdic_insured ?? null,
      rankOverall: Number.isFinite(rankOverall) ? rankOverall : null,
      nominalRate: Number(o?.apy_nominal ?? 0),
      afterTaxYield: Number(o?.after_tax_apy ?? 0),
      minDeposit: Number(o?.minimum_deposit ?? 0),
      isTopPick: Boolean(topPickRank),
      topPickRank,
      detailsUrl,
      taxBreakdown: {
        interestEarned: formatMoney(grossInterest),
        totalTax: totalTax > 0 ? `-${formatMoney(totalTax)}` : '$0.00',
        totalSavings: formatMoney(estimatedSavings),
      },
      netReturn: formatMoney(Number(o?.after_tax_interest_usd ?? 0)),
      whyThisFits: toWhyThisFits(productType),
      matchPercentage: Number(o?.match_percentage ?? 0),
    };
  };

  const sourceOffers = overallTop.length > 0 ? overallTop : [...bank, ...brokered, ...treasuries];
  const mappedOffers = sourceOffers.map(mapOffer);
  const uniqueTopTen = [];
  const seenIds = new Set();

  for (const offer of mappedOffers) {
    if (seenIds.has(offer.id)) {
      continue;
    }
    seenIds.add(offer.id);
    uniqueTopTen.push(offer);

    if (uniqueTopTen.length === 10) {
      break;
    }
  }

  return uniqueTopTen;
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [rankResponse, setRankResponse] = useState(null);
  const [bulletSimulation, setBulletSimulation] = useState(null);
  const [barbellSimulation, setBarbellSimulation] = useState(null);
  const [ladderSimulation, setLadderSimulation] = useState(null);
  const [bulletLoading, setBulletLoading] = useState(false);
  const [barbellLoading, setBarbellLoading] = useState(false);
  const [ladderLoading, setLadderLoading] = useState(false);
  const [bulletError, setBulletError] = useState(null);
  const [barbellError, setBarbellError] = useState(null);
  const [ladderError, setLadderError] = useState(null);
  const [ladderControls, setLadderControls] = useState({ horizon: '5', filterType: 'All Products', amount: '20000' });
  const [ladderControlsDirty, setLadderControlsDirty] = useState(false);
  const [bulletAlternativesByTranche, setBulletAlternativesByTranche] = useState({});
  const [bulletControls, setBulletControls] = useState({ term: '12 months', amount: '20000' });
  const [bulletControlsDirty, setBulletControlsDirty] = useState(false);
  const [barbellControls, setBarbellControls] = useState({
    term: '12 months',
    amount: '20000',
    split: 50,
    shortTerm: '3 months',
    longTerm: '12 months',
  });
  const [barbellControlsDirty, setBarbellControlsDirty] = useState(false);
  const [barbellTermOverrides, setBarbellTermOverrides] = useState({ shortTerm: null, longTerm: null });
  const aiBase = import.meta.env.VITE_AI_LAYER_URL;
  const [showPrivacy, setShowPrivacy] = useState(false);
  const THEME_STORAGE_KEY = 'smartcd:theme:v1';
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [showResults, setShowResults] = useState(
    window.location.pathname === '/results' && hasRestorableResultsSession()
  );
  const [viewMode, setViewMode] = useState('combined');
  const [strategyView, setStrategyView] = useState('best-rate');
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [productTypeFilter, setProductTypeFilter] = useState('All products');
  const [sortColumn, setSortColumn] = useState(null); // 'nominalRate' | 'afterTaxYield' | 'minDeposit' | null
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const latestRequestIdRef = useRef(0);
  const latestBulletRequestIdRef = useRef(0);
  const latestBarbellRequestIdRef = useRef(0);
  const latestLadderRequestIdRef = useRef(0);
  const didRestoreRef = useRef(false);
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [whyThisFitsOverrides, setWhyThisFitsOverrides] = useState({});
  const [whyThisFitsLoading, setWhyThisFitsLoading] = useState({});
  const [whyThisFitsFetched, setWhyThisFitsFetched] = useState({});
  const [whyThisFitsExpanded, setWhyThisFitsExpanded] = useState({});

  const resetResultsState = () => {
    setShowResults(false);
    setStrategyView('best-rate');
    setRankResponse(null);
    setResults([]);
    setBulletSimulation(null);
    setBarbellSimulation(null);
    setLadderSimulation(null);
    setBulletLoading(false);
    setBarbellLoading(false);
    setLadderLoading(false);
    setBulletError(null);
    setBarbellError(null);
    setLadderError(null);
    setLadderControlsDirty(false);
    setBulletAlternativesByTranche({});
    setBarbellTermOverrides({ shortTerm: null, longTerm: null });
    setExpandedCardId(null);
    setProductTypeFilter('All products');
    setSortColumn(null);
    setSortDirection('desc');
  };

  const pushResultsHistoryState = (nextStrategyView) => {
    window.history.pushState(
      { page: 'results', strategyView: nextStrategyView },
      '',
      '/results'
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage failures
    }
    // Keep the privacy overlay visually stable by not applying theme overrides to it.
    document.documentElement.classList.toggle('theme-light', theme === 'light' && !showPrivacy);
  }, [theme, showPrivacy]);

  useEffect(() => {
    if (!showPrivacy) return;

    const scrollY = window.scrollY || 0;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.left = previous.left;
      document.body.style.right = previous.right;
      document.body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [showPrivacy]);

  const explainWhyThisFits = async (result) => {
    const id = result?.id;
    if (!id) return;
    
    if (!aiBase) {
      setWhyThisFitsOverrides((prev) => ({ ...prev, [id]: 'AI is not configured. Set VITE_AI_LAYER_URL to enable this explanation.' }));
      return;
    }

    if (whyThisFitsLoading[id]) return;
    if (whyThisFitsFetched[id]) return;

    const normalizeProductType = () => {
      const raw = String(result?.apiProductType ?? '').trim().toLowerCase();
      if (raw) return raw;

      const pretty = String(result?.productType ?? '').trim().toLowerCase();
      if (pretty === 'bank cds') return 'bank_cd';
      if (pretty === 'brokerage cds') return 'brokered_cd';
      if (pretty === 'treasuries') return 'treasury';
      return 'unknown';
    };

    const payload = {
      product_type: normalizeProductType(),
      institution_name: result?.institutionName ?? result?.brokerageFirm ?? null,
      term_months: result?.termMonths ?? null,
      apy_nominal: result?.apyNominal ?? null,
      after_tax_apy: result?.afterTaxApy ?? null,
      minimum_deposit: result?.minimumDeposit ?? null,
      after_tax_interest_usd: result?.afterTaxInterestUsd ?? null,
      fdic_insured: result?.fdicInsured ?? null,
      rank_overall: result?.rankOverall ?? null,
    };

    setWhyThisFitsLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${aiBase}/explain-why-this-fits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload.detail || 'AI explanation request failed.');
      }
      
      const data = await res.json().catch(() => ({}));
      const headline = String(data?.headline ?? '').trim();
      const insight = String(data?.insight ?? '').trim();
      if (!headline || !insight) {
        throw new Error('No explanation returned from AI service.');
      }

      setWhyThisFitsOverrides((prev) => ({ ...prev, [id]: { headline, insight } }));
      setWhyThisFitsFetched((prev) => ({ ...prev, [id]: true }));
    } catch (e) {
      setWhyThisFitsOverrides((prev) => ({ ...prev, [id]: e?.message || 'Unable to reach the AI service right now.' }));
    } finally {
      setWhyThisFitsLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleSort = (column) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('desc');
      return;
    }

    if (sortDirection === 'desc') {
      setSortDirection('asc');
      return;
    }

    // Third click restores default sorting.
    setSortColumn(null);
    setSortDirection('desc');
  };

  const effectiveSortColumn = sortColumn || 'afterTaxYield';
  const effectiveSortDirection = sortColumn ? sortDirection : 'desc';

  const sortResults = (items) => {
    const dir = effectiveSortDirection === 'asc' ? 1 : -1;

    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const cmp = (a, b) => {
      const av = toNum(a?.[effectiveSortColumn]);
      const bv = toNum(b?.[effectiveSortColumn]);

      const aNan = Number.isNaN(av);
      const bNan = Number.isNaN(bv);
      if (aNan && bNan) return 0;
      if (aNan) return 1;
      if (bNan) return -1;

      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    };

    return [...items].sort(cmp);
  };

  useEffect(() => {
    if (window.location.pathname === '/results' && !hasRestorableResultsSession()) {
      window.history.replaceState({ page: 'home' }, '', '/');
      resetResultsState();
    }

    const handlePopState = (event) => {
      if (window.location.pathname === '/results' && hasRestorableResultsSession()) {
        setShowResults(true);
        setStrategyView(event.state?.strategyView || 'best-rate');
      } else {
        if (window.location.pathname === '/results') {
          window.history.replaceState({ page: 'home' }, '', '/');
        }
        clearSearchStorage();
        resetResultsState();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [formData, setFormData] = useState({
    investment_amount: '',
    term_length_months: '3 Month',
    income_range: '',
    state_selection: '',
    city_county: '',
    tax_filing_status: 'Single',
    zip_code: '11201'
  });
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const refreshTimeoutRef = useRef(null);
  const cashInputRef = useRef(null);
  const cashCursorRef = useRef(null);
  const bulletRefreshTimeoutRef = useRef(null);
  const ladderRefreshTimeoutRef = useRef(null);

  const getAllowedAreas = (stateSelection) => {
    const state = (stateSelection || '').trim();
    return state ? (locationData[state] || []) : [];
  };

  const getFieldError = (fieldName, data = formData) => {
    const amount = parseFloat(data.investment_amount);
    const state = (data.state_selection || '').trim();
    const income = (data.income_range || '').trim();
    const filing = (data.tax_filing_status || '').trim();
    const term = (data.term_length_months || '').trim();
    const cityCounty = (data.city_county || '').trim();
    const cityCountyLower = cityCounty.toLowerCase();
    const isCityRequired = STATES_WITH_LOCAL_TAX.includes(state);
    const allowedAreas = getAllowedAreas(state);
    const allowedAreasLower = allowedAreas.map((x) => String(x).toLowerCase());

    if (fieldName === 'investment_amount') {
      if (!data.investment_amount) return 'Please enter a cash amount.';
      if (!Number.isFinite(amount)) return 'Please enter a valid amount.';
      if (amount < 5000) return 'Minimum cash amount is $5,000.';
      return '';
    }

    if (fieldName === 'term_length_months') {
      if (!term) return 'Please select a duration.';
      if (!ALLOWED_TERM_MONTHS.includes(parseTermToMonths(term))) return 'Please select a valid duration.';
      return '';
    }

    if (fieldName === 'income_range') {
      if (!income) return 'Please select an annual income range.';
      if (!INCOME_RANGE_OPTIONS.includes(income)) return 'Please select a valid income range.';
      return '';
    }

    if (fieldName === 'state_selection') {
      if (!state) return 'Please select a state.';
      if (!usStates.includes(state)) return 'Please select a valid U.S. state from the list.';
      return '';
    }

    if (fieldName === 'city_county') {
      if (!isCityRequired) return '';
      if (!cityCounty) return 'Please select a city/county for this state.';
      if (cityCountyLower !== 'other' && !allowedAreasLower.includes(cityCountyLower)) {
        return 'Please select a valid city/county from the list.';
      }
      return '';
    }

    if (fieldName === 'tax_filing_status') {
      if (!filing) return 'Please select a filing status.';
      if (!FILING_STATUS_OPTIONS.includes(filing)) return 'Please select a valid filing status.';
      return '';
    }

    return '';
  };

  const getVisibleFieldError = (fieldName) => {
    if (!showErrors && !touchedFields[fieldName]) {
      return '';
    }
    return getFieldError(fieldName);
  };

  const persistLastSearch = (nextFormData, options = {}) => {
    try {
      const storage = getSearchStorage();
      let existing = null;
      try {
        existing = JSON.parse(storage.getItem(LAST_SEARCH_STORAGE_KEY) || 'null');
      } catch {
        existing = null;
      }

      const existingTermsAgreed = Boolean(existing?.termsAgreed);
      const nextTermsAgreed =
        typeof options.termsAgreed === 'boolean'
          ? options.termsAgreed
          : Boolean(termsAgreed || existingTermsAgreed);

      const payload = {
        formData: nextFormData,
        termsAgreed: nextTermsAgreed,
        savedAt: Date.now(),
      };
      storage.setItem(LAST_SEARCH_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // best-effort only
    }
  };

  const fetchRankResults = async (nextFormData, options = {}) => {
    const { navigateToResults = false, scrollToTop = false, persistTermsAgreed } = options;
    const amt = parseFloat(nextFormData.investment_amount);
    const requestId = ++latestRequestIdRef.current;

    persistLastSearch(nextFormData, { termsAgreed: persistTermsAgreed });
    setLoading(true);
    setError(null);

    try {
      const rankBase =
        import.meta.env.VITE_RANKING_API_URL ||
        import.meta.env.VITE_API_URL ||
        'http://localhost:8001';

      const rankRequest = {
        investment_amount: amt,
        term_months: parseTermToMonths(nextFormData.term_length_months),
        state: selectedStateCode || stateNameToCode[nextFormData.state_selection] || nextFormData.state_selection,
        income_range: nextFormData.income_range,
        filing_status: normalizeFilingStatusForRanker(nextFormData.tax_filing_status),
        local_area: nextFormData.city_county || null,
        top_n_bank_cds: 10,
        top_n_brokered_cds: 10,
        top_n_treasuries: 3,
        top_n_overall: 10,
      };

      const response = await fetch(`${rankBase}/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rankRequest),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Failed to fetch results.');
      }

      const payload = await response.json();

      // Ignore stale responses when users change duration quickly.
      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      setRankResponse(payload);
      setResults(adaptRankResponseToUiResults(payload));

      if (navigateToResults) {
        setBulletControlsDirty(false);
        setBarbellControlsDirty(false);
        setLadderControlsDirty(false);
        pushResultsHistoryState('best-rate');
        setShowResults(true);
        setStrategyView('best-rate');
      }
      if (scrollToTop) {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      setError(err.message || 'Unable to fetch results. Please try again.');
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchBulletSimulation = async (nextFormData, options = {}) => {
    const requestId = ++latestBulletRequestIdRef.current;
    const { silent = false, controlsOverride = null } = options;
    const effectiveControls = controlsOverride || bulletControls;
    const controlsAmount = parseFloat(String(effectiveControls.amount || '').replace(/[^0-9.]/g, ''));
    const formAmount = parseFloat(nextFormData.investment_amount);
    const amt = Number.isFinite(controlsAmount) && controlsAmount > 0 ? controlsAmount : formAmount;

    if (!Number.isFinite(amt) || amt < 5000) {
      return;
    }

    const rankBase =
      import.meta.env.VITE_RANKING_API_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:8001';

    const termLabel = (effectiveControls.term || '').trim() || nextFormData.term_length_months;
    const termMonths = parseTermToMonths(termLabel);
    const horizonYears = Math.round((termMonths / 12) * 10) / 10;

    const payload = {
      strategy_type: 'bullet',
      investment_amount: amt,
      state: selectedStateCode || stateNameToCode[nextFormData.state_selection] || nextFormData.state_selection,
      income_range: nextFormData.income_range,
      filing_status: normalizeFilingStatusForRanker(nextFormData.tax_filing_status),
      local_area: nextFormData.city_county || null,
      time_horizon: String(horizonYears),
    };

    if (!silent) {
      setBulletLoading(true);
    }
    setBulletError(null);

    try {
      const response = await fetch(`${rankBase}/strategies/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (requestId !== latestBulletRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.detail || 'Failed to fetch bullet simulation.');
      }

      const simulationPayload = await response.json();
      if (requestId !== latestBulletRequestIdRef.current) {
        return;
      }
      setBulletSimulation(simulationPayload);
      const tranches = Array.isArray(simulationPayload?.tranches) ? simulationPayload.tranches : [];
      const rankBaseForAlternatives =
        import.meta.env.VITE_RANKING_API_URL ||
        import.meta.env.VITE_API_URL ||
        'http://localhost:8001';
      const altMap = {};
      for (const t of tranches) {
        const termMonthsForRank = Number(t?.target_maturity_months ?? t?.actual_term_months ?? 0) || 0;
        if (!termMonthsForRank) continue;
        const allocAmount = Number(t?.allocation_amount ?? amt) || amt;
        const rankReq = {
          investment_amount: Math.max(5000, allocAmount),
          term_months: termMonthsForRank,
          state: selectedStateCode || stateNameToCode[nextFormData.state_selection] || nextFormData.state_selection,
          income_range: nextFormData.income_range,
          filing_status: normalizeFilingStatusForRanker(nextFormData.tax_filing_status),
          local_area: nextFormData.city_county || null,
          top_n_bank_cds: 3,
          top_n_brokered_cds: 3,
          top_n_treasuries: 2,
          top_n_overall: 5,
        };
        try {
          const rankRes = await fetch(`${rankBaseForAlternatives}/rank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rankReq),
          });
          if (requestId !== latestBulletRequestIdRef.current) {
            return;
          }
          if (rankRes.ok) {
            const rankPayload = await rankRes.json();
            if (requestId !== latestBulletRequestIdRef.current) {
              return;
            }
            altMap[String(t?.tranche)] = Array.isArray(rankPayload?.overall_top) ? rankPayload.overall_top : [];
          } else {
            altMap[String(t?.tranche)] = [];
          }
        } catch {
          altMap[String(t?.tranche)] = [];
        }
      }
      if (requestId !== latestBulletRequestIdRef.current) {
        return;
      }
      setBulletAlternativesByTranche(altMap);
    } catch (err) {
      if (requestId !== latestBulletRequestIdRef.current) {
        return;
      }
      setBulletError(err.message || 'Unable to fetch bullet simulation.');
      setBulletAlternativesByTranche({});
    } finally {
      if (!silent && requestId === latestBulletRequestIdRef.current) {
        setBulletLoading(false);
      }
    }
  };

  const fetchBarbellSimulation = async (nextFormData, options = {}) => {
    const requestId = ++latestBarbellRequestIdRef.current;
    const effectiveControls = {
      term:
        options?.controlsOverride?.term ||
        barbellControls.term ||
        toBulletTermLabel(nextFormData.term_length_months),
      amount:
        String(options?.controlsOverride?.amount || barbellControls.amount || nextFormData.investment_amount || '')
          .replace(/[^0-9.]/g, '') || '20000',
      split: Number(options?.controlsOverride?.split ?? barbellControls.split ?? 50),
    };

    const rankBase =
      import.meta.env.VITE_RANKING_API_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:8001';

    const termMonths = parseTermToMonths(effectiveControls.term);
    const payload = {
      strategy_type: 'barbell',
      investment_amount:
        parseFloat(effectiveControls.amount) || parseFloat(nextFormData.investment_amount),
      state: selectedStateCode || stateNameToCode[nextFormData.state_selection] || nextFormData.state_selection,
      income_range: nextFormData.income_range,
      filing_status: normalizeFilingStatusForRanker(nextFormData.tax_filing_status),
      local_area: nextFormData.city_county || null,
      time_horizon: String(Math.round((termMonths / 12) * 10) / 10),
      target_maturity_months: termMonths,
      short_term_percentage: normalizeBarbellSplit(effectiveControls.split),
      ...(barbellTermOverrides.shortTerm !== null && {
        short_term_months: parseTermToMonths(barbellTermOverrides.shortTerm),
      }),
      ...(barbellTermOverrides.longTerm !== null && {
        long_term_months: parseTermToMonths(barbellTermOverrides.longTerm),
      }),
    };

    setBarbellLoading(true);
    setBarbellError(null);

    try {
      const response = await fetch(`${rankBase}/strategies/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (requestId !== latestBarbellRequestIdRef.current) {
        return;
      }

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        const detail = errPayload?.detail;
        const detailMessage = Array.isArray(detail)
          ? detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join(' ')
          : typeof detail === 'string'
            ? detail
            : null;
        throw new Error(detailMessage || errPayload?.message || 'Failed to fetch barbell simulation.');
      }

      const simulationPayload = await response.json();
      if (requestId !== latestBarbellRequestIdRef.current) {
        return;
      }

      setBarbellSimulation(simulationPayload);
      setBarbellControls({
        term: effectiveControls.term,
        amount: effectiveControls.amount,
        split: effectiveControls.split,
        shortTerm: barbellControls.shortTerm,
        longTerm: barbellControls.longTerm,
      });
    } catch (err) {
      if (requestId !== latestBarbellRequestIdRef.current) {
        return;
      }
      console.error('Error fetching barbell simulation:', err);
      setBarbellError(err.message || 'Unable to fetch barbell simulation.');
    } finally {
      if (requestId === latestBarbellRequestIdRef.current) {
        setBarbellLoading(false);
      }
    }
  };

  const fetchLadderSimulation = async (nextFormData, options = {}) => {
    const requestId = ++latestLadderRequestIdRef.current;
    const { controlsOverride = null } = options;
    const effectiveControls = controlsOverride || ladderControls;
    const controlsAmount = parseFloat(String(effectiveControls.amount || '').replace(/[^0-9.]/g, ''));
    const formAmount = parseFloat(nextFormData.investment_amount);
    const amt = Number.isFinite(controlsAmount) && controlsAmount > 0 ? controlsAmount : formAmount;

    if (!Number.isFinite(amt) || amt < 5000) return;

    const rankBase =
      import.meta.env.VITE_RANKING_API_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:8001';

    const payload = {
      strategy_type: 'ladder',
      investment_amount: amt,
      state: selectedStateCode || stateNameToCode[nextFormData.state_selection] || nextFormData.state_selection,
      income_range: nextFormData.income_range,
      filing_status: normalizeFilingStatusForRanker(nextFormData.tax_filing_status),
      local_area: nextFormData.city_county || null,
      time_horizon: effectiveControls.horizon || '5',
      product_type_filter: effectiveControls.filterType || 'All Products',
    };

    setLadderLoading(true);
    setLadderError(null);

    try {
      const response = await fetch(`${rankBase}/strategies/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (requestId !== latestLadderRequestIdRef.current) return;

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        const detail = errPayload?.detail;
        const detailMessage = Array.isArray(detail)
          ? detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join(' ')
          : typeof detail === 'string'
            ? detail
            : null;
        throw new Error(detailMessage || errPayload?.message || 'Failed to fetch ladder simulation.');
      }

      const simulationPayload = await response.json();
      if (requestId !== latestLadderRequestIdRef.current) return;

      setLadderSimulation(simulationPayload);
    } catch (err) {
      if (requestId !== latestLadderRequestIdRef.current) return;
      setLadderError(err.message || 'Unable to fetch ladder simulation.');
    } finally {
      if (requestId === latestLadderRequestIdRef.current) {
        setLadderLoading(false);
      }
    }
  };

  const canAutoRefreshRank = (nextFormData) => {
    const amt = parseFloat(nextFormData.investment_amount);
    const state = (nextFormData.state_selection || '').trim();
    const isStateValid = usStates.includes(state);
    const isCityCountyRequired = STATES_WITH_LOCAL_TAX.includes(state);
    const cityCounty = (nextFormData.city_county || '').trim().toLowerCase();
    const allowedAreasLower = getAllowedAreas(state).map((x) => String(x).toLowerCase());
    const isCityCountyValid = isCityCountyRequired
      ? Boolean(cityCounty) && (cityCounty === 'other' || allowedAreasLower.includes(cityCounty))
      : true;

    const parsedMonths = parseTermToMonths(nextFormData.term_length_months);
    const isAllowedTerm = ALLOWED_TERM_MONTHS.includes(parsedMonths);

    const isIncomeAllowed = INCOME_RANGE_OPTIONS.includes(nextFormData.income_range);
    const isFilingAllowed = FILING_STATUS_OPTIONS.includes(nextFormData.tax_filing_status);

    return (
      nextFormData.investment_amount &&
      !isNaN(amt) &&
      amt >= 5000 &&
      nextFormData.term_length_months &&
      isAllowedTerm &&
      nextFormData.income_range &&
      isIncomeAllowed &&
      isStateValid &&
      isCityCountyValid &&
      isFilingAllowed
    );
  };

  const scheduleAutoRefreshRank = (nextFormData) => {
    if (!showResults) return;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      if (canAutoRefreshRank(nextFormData)) {
        fetchRankResults(nextFormData);
      }
    }, 250);
  };

  const handleTabChange = (tabId) => {
    if (showResults && strategyView !== tabId) {
      pushResultsHistoryState(tabId);
    }

    setStrategyView(tabId);

    if (tabId === 'bullet' && canAutoRefreshRank(formData)) {
      const syncedControls = bulletControlsDirty
        ? bulletControls
        : {
            term: toBulletTermLabel(formData.term_length_months),
            amount: String(formData.investment_amount || '').replace(/[^0-9]/g, '') || '20000',
          };
      setBulletControls(syncedControls);
      fetchBulletSimulation(formData, {
        silent: false,
        controlsOverride: syncedControls,
      });
      return;
    }

    if (tabId === 'barbell' && canAutoRefreshRank(formData)) {
      const syncedControls = barbellControlsDirty
        ? barbellControls
        : {
            term: toBulletTermLabel(formData.term_length_months),
            shortTerm: barbellControls.shortTerm || '3 months',
            longTerm: barbellControls.longTerm || '12 months',
            amount:
              String(formData.investment_amount || '').replace(/[^0-9]/g, '') ||
              barbellControls.amount ||
              '20000',
            split: Number(barbellControls.split ?? 50),
          };

      setBarbellControls(syncedControls);
      if (isSupportedBarbellSplit(syncedControls.split)) {
        fetchBarbellSimulation(buildBarbellFormData(formData, syncedControls), {
          controlsOverride: syncedControls,
        });
      }
    }

    if (tabId === 'ladder' && canAutoRefreshRank(formData)) {
      const syncedControls = ladderControlsDirty
        ? ladderControls
        : {
            ...ladderControls,
            amount:
              String(formData.investment_amount || '').replace(/[^0-9]/g, '') ||
              ladderControls.amount ||
              '20000',
          };
      setLadderControls(syncedControls);
      fetchLadderSimulation(formData, { controlsOverride: syncedControls });
    }
  };

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (bulletRefreshTimeoutRef.current) {
        clearTimeout(bulletRefreshTimeoutRef.current);
      }
      if (ladderRefreshTimeoutRef.current) {
        clearTimeout(ladderRefreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showResults) return;
    if (didRestoreRef.current) return;
    if (rankResponse) return;

    const redirectToSearch = (message) => {
      window.history.replaceState({ page: 'home' }, '', '/?error=missing_inputs');
      setShowResults(false);
      setError(message || 'No results available. Please enter your criteria first.');
      didRestoreRef.current = true;
    };

    let saved = null;
    try {
      saved = JSON.parse(getSearchStorage().getItem(LAST_SEARCH_STORAGE_KEY) || 'null');
    } catch {
      saved = null;
    }

    const savedFormData = saved?.formData;
    if (!savedFormData || saved?.termsAgreed === false) {
      redirectToSearch('No results available. Please enter your criteria first.');
      return;
    }

    const nextState = (savedFormData.state_selection || '').trim();
    const isLocalTaxState = STATES_WITH_LOCAL_TAX.includes(nextState);
    const allowedAreas = isLocalTaxState ? (locationData[nextState] || []) : [];

    const normalized = {
      ...formData,
      ...savedFormData,
      term_length_months: normalizeSavedTermLabel(savedFormData.term_length_months),
      income_range: normalizeSavedIncomeLabel(savedFormData.income_range),
      city_county: isLocalTaxState
        ? (() => {
          const area = (savedFormData.city_county || '').trim().toLowerCase();
          if (!area) return '';
          return allowedAreas.includes(area) ? area : 'other';
        })()
        : '',
    };

    setFormData(normalized);
    setSelectedStateCode(stateNameToCode[normalized.state_selection] || '');
    setTermsAgreed(true);
    didRestoreRef.current = true;

    if (canAutoRefreshRank(normalized)) {
      fetchRankResults(normalized, { navigateToResults: false, scrollToTop: true, persistTermsAgreed: true });
    } else {
      redirectToSearch('No results available. Please enter your criteria first.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, rankResponse]);

  useEffect(() => {
    if (!showResults) return;

    if (strategyView === 'bullet') {
      if (!canAutoRefreshRank(formData)) return;
      if (bulletRefreshTimeoutRef.current) {
        clearTimeout(bulletRefreshTimeoutRef.current);
      }
      bulletRefreshTimeoutRef.current = setTimeout(() => {
        fetchBulletSimulation(formData, { silent: false });
      }, 500);
      return;
    }

    if (bulletRefreshTimeoutRef.current) {
      clearTimeout(bulletRefreshTimeoutRef.current);
      bulletRefreshTimeoutRef.current = null;
    }

    if (strategyView === 'barbell') {
      const nextBarbellFormData = buildBarbellFormData(formData, barbellControls);
      if (!canAutoRefreshRank(nextBarbellFormData)) return;
      if (!isSupportedBarbellSplit(barbellControls.split)) return;
      fetchBarbellSimulation(nextBarbellFormData, { controlsOverride: barbellControls });
    }

    if (strategyView === 'ladder') {
      if (!canAutoRefreshRank(formData)) return;
      if (ladderRefreshTimeoutRef.current) {
        clearTimeout(ladderRefreshTimeoutRef.current);
      }
      ladderRefreshTimeoutRef.current = setTimeout(() => {
        fetchLadderSimulation(formData, { controlsOverride: ladderControls });
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    strategyView,
    showResults,
    formData.investment_amount,
    formData.term_length_months,
    formData.income_range,
    formData.state_selection,
    formData.city_county,
    formData.tax_filing_status,
    selectedStateCode,
    barbellControls.term,
    bulletControls.term,
    bulletControls.amount,
    barbellControls.amount,
    barbellControls.split,
    barbellControls.shortTerm,
    barbellControls.longTerm,
    ladderControls.filterType,
    ladderControls.horizon,
    ladderControls.amount,
  ]);

  useEffect(() => {
    if (cashCursorRef.current !== null && cashInputRef.current) {
      const pos = cashInputRef.current.value.length - cashCursorRef.current;
      cashInputRef.current.setSelectionRange(pos, pos);
      cashCursorRef.current = null;
    }
  }, [formData.investment_amount]);

  const isAutoRefreshField = (name) => (
    name === 'investment_amount' ||
    name === 'term_length_months' ||
    name === 'income_range' ||
    name === 'state_selection' ||
    name === 'city_county' ||
    name === 'tax_filing_status'
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'state_selection') {
      const isCityCountyEnabled = STATES_WITH_LOCAL_TAX.includes(value);
      const allowedAreas = isCityCountyEnabled ? getAllowedAreas(value) : [];
      const nextCityCounty =
        isCityCountyEnabled
          ? (allowedAreas.includes(formData.city_county) ? formData.city_county : '')
          : '';
      setSelectedStateCode(stateNameToCode[value] || '');
      const nextFormData = {
        ...formData,
        [name]: value,
        city_county: nextCityCounty,
      };
      setFormData(nextFormData);
      if (showResults) {
        scheduleAutoRefreshRank(nextFormData);
      }
      return;
    }

    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);

    if (isAutoRefreshField(name) && showResults) {
      scheduleAutoRefreshRank(nextFormData);
    }
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    if (!name) {
      return;
    }

    if (name === 'state_selection' && value !== formData.state_selection) {
      const isCityCountyEnabled = STATES_WITH_LOCAL_TAX.includes(value);
      const allowedAreas = isCityCountyEnabled ? getAllowedAreas(value) : [];
      const nextCityCounty =
        isCityCountyEnabled
          ? (allowedAreas.includes(formData.city_county) ? formData.city_county : '')
          : '';

      setSelectedStateCode(stateNameToCode[value] || '');
      setFormData((prev) => ({
        ...prev,
        state_selection: value,
        city_county: nextCityCounty,
      }));
    }

    setTouchedFields((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    const hasFieldValidationError = [
      'investment_amount',
      'term_length_months',
      'income_range',
      'state_selection',
      'city_county',
      'tax_filing_status',
    ].some((fieldName) => Boolean(getFieldError(fieldName)));

    if (hasFieldValidationError || !termsAgreed) {
      setTouchedFields((prev) => ({
        ...prev,
        investment_amount: true,
        term_length_months: true,
        income_range: true,
        state_selection: true,
        city_county: true,
        tax_filing_status: true,
      }));
      setShowErrors(true);
      setError("Please enter at least $5,000 and complete all selections.");
      return;
    }

    setShowErrors(false);
    await fetchRankResults(formData, { navigateToResults: true, scrollToTop: true });
  };

  const renderResultCard = (result, showProductType = false) => {
    const isExpanded = expandedCardId === result.id;
    const toggleExpand = () => {
      setExpandedCardId(isExpanded ? null : result.id);
      setWhyThisFitsExpanded((prev) => ({ ...prev, [result.id]: false }));
    };
    const safeMatch = Math.max(0, Math.min(100, Number(result.matchPercentage) || 0));
    const isWhyLoading = Boolean(whyThisFitsLoading?.[result.id]);
    const isWhyExpanded = Boolean(whyThisFitsExpanded?.[result.id]);
    const whyEntry = (whyThisFitsOverrides && Object.prototype.hasOwnProperty.call(whyThisFitsOverrides, result.id))
        ? whyThisFitsOverrides[result.id]
        : null;
    const whyHeadline = typeof whyEntry === 'string' ? whyEntry : (whyEntry?.headline ?? '');
    const whyInsight  = typeof whyEntry === 'string' ? '' : (whyEntry?.insight ?? '');
    const whyChunks = splitWhyThisFitsText(whyHeadline);
      
    const openProviderLink = () => {
      const url = result?.detailsUrl;
      if (!url) {
        return;
      }

      try {
        new URL(url);
      } catch {
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    };

    const rowSurfaceClass = isExpanded
      ? (theme === 'light' ? 'bg-[#F8FAFC] border-b-0' : 'bg-[#0A1E14] border-b-0')
      : result.isTopPick
        ? (theme === 'light' ? 'bg-[#EEF4FF] border-b border-[#E2E8F0]' : 'bg-[#062314] border-b border-[#1E293B]')
        : (theme === 'light' ? 'bg-white border-b border-[#E2E8F0]' : 'bg-[#081329] border-b border-[#1E293B]');
    const expandedSurfaceClass = theme === 'light' ? 'bg-[#F8FAFC]' : 'bg-[#050d1f]';
    const expandedBorderClass = theme === 'light' ? 'border-t border-[#E2E8F0]' : 'border-t border-[rgba(255,255,255,0.2)]';
    const taxCardClass = theme === 'light'
      ? 'rounded-[10px] border border-[#D7E7D9] bg-[linear-gradient(105deg,#F8FFFA_0%,#ECFDF3_68%)] p-4'
      : 'rounded-[10px] border border-[#0B5C2A] bg-[linear-gradient(105deg,rgba(6,50,31,0.88)_0%,rgba(2,14,22,0.95)_68%)] p-4';
    const taxHeadingClass = theme === 'light'
      ? 'mb-3 border-b border-[rgba(34,197,94,0.12)] pb-3 text-[13px] font-bold leading-none text-[#0F172A]'
      : 'mb-3 border-b border-[rgba(34,197,94,0.14)] pb-3 text-[13px] font-bold leading-none text-[#F8FAFC]';
    const taxLabelClass = theme === 'light' ? 'text-[#475569]' : 'text-[#8FB3C4]';
    const taxDividerClass = theme === 'light' ? 'my-4 border-t border-[rgba(34,197,94,0.10)]' : 'my-4 border-t border-[rgba(34,197,94,0.12)]';
    const netReturnClass = theme === 'light'
      ? 'flex items-center justify-between rounded-[10px] border border-[#B7E2C4] bg-[linear-gradient(92deg,#F0FDF4_0%,#DCFCE7_100%)] px-3 py-2 text-[13px] font-bold'
      : 'flex items-center justify-between rounded-[10px] border border-[#0B5C2A] bg-[linear-gradient(92deg,rgba(8,58,36,0.85)_0%,rgba(3,36,23,0.9)_100%)] px-3 py-2 text-[13px] font-bold';
    const whyPanelClass = theme === 'light'
      ? (
          isWhyExpanded
            ? 'h-[231px] border border-[#BFDBFE] bg-[linear-gradient(180deg,#FFFFFF_0%,#EFF6FF_100%)] shadow-[inset_0_0_0_1px_rgba(21,87,245,0.08)]'
            : 'h-[52px] border border-[#BFDBFE] bg-[#F8FBFF] shadow-[inset_0_0_0_1px_rgba(21,87,245,0.12)]'
        )
      : (
          isWhyExpanded
            ? 'h-[231px] border border-[#1557F5] bg-[linear-gradient(180deg,#07170F_0%,#06120D_100%)] shadow-[inset_0_0_0_1px_rgba(140,194,255,0.18)]'
            : 'h-[52px] border border-[#1557F5] bg-[#07170F] shadow-[inset_0_0_0_1px_rgba(140,194,255,0.26)]'
        );
    const whyHeaderClass = theme === 'light'
      ? (isWhyExpanded
          ? 'relative mt-[6px] h-[52px] rounded-[12px] border border-[rgba(21,87,245,0.18)] bg-[#F8FBFF]'
          : 'relative h-full')
      : (isWhyExpanded
          ? 'relative mt-[6px] h-[52px] rounded-[12px] border border-[rgba(21,87,245,0.45)] bg-[#07170F]'
          : 'relative h-full');
    const whyBodyClass = theme === 'light'
      ? 'rounded-xl border border-[rgba(21,87,245,0.14)] bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] max-[768px]:px-3 max-[768px]:py-3'
      : 'rounded-xl border border-[rgba(29,141,238,0.22)] bg-[rgba(2,10,22,0.55)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] max-[768px]:px-3 max-[768px]:py-3';

    return (
      <div key={result.id}>
        <div
          className={`smartcd-result-row ${result.isTopPick ? 'smartcd-top-pick' : ''} relative transition-colors max-[768px]:flex max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3 max-[768px]:px-4 max-[768px]:py-3 md:grid md:items-center md:gap-4 md:px-5 md:hover:bg-[rgba(29,141,238,0.05)] ${result.isTopPick ? 'md:pt-8 md:pb-5' : 'md:py-5'} ${showProductType ? 'md:grid-cols-[minmax(220px,2.05fr)_minmax(145px,1.12fr)_minmax(118px,0.9fr)_minmax(150px,1.02fr)_minmax(130px,0.9fr)_220px]' : 'md:grid-cols-[minmax(220px,2.2fr)_minmax(118px,0.95fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_220px]'} ${rowSurfaceClass}`}
        >
          <div className={`flex items-center max-[768px]:order-1 max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-2 max-[768px]:border-b max-[768px]:pb-3 ${theme === 'light' ? 'max-[768px]:border-[#E2E8F0]' : 'max-[768px]:border-[#1E293B]'}`}>
            {result.isTopPick && <span className="theme-keep-white inline-flex shrink-0 rounded-full bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)] px-3 py-1 text-[0.64rem] font-extrabold uppercase tracking-[0.04em] text-white md:hidden">★ TOP PICK</span>}
            <div className="flex w-full min-w-0 items-center gap-3 md:pr-3">
              <BankBadge result={result} />
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="break-words text-[1.02rem] font-bold tracking-[-0.01em] text-[#F8FAFC] max-[480px]:text-[0.95rem]">{result.provider}</span>
                </div>
                <div className="break-words text-[0.72rem] leading-[1.35] tracking-[0.005em] text-[#5F7EA6]">{result.institutionType}</div>
              </div>
            </div>
            {result.isTopPick && <span className="theme-keep-white absolute left-4 top-2 hidden shrink-0 rounded-full bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)] px-3 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.04em] text-white md:inline-flex">★ TOP PICK</span>}
          </div>

          {showProductType && (
            <div className="flex w-full justify-between text-left text-[0.9rem] font-medium text-[#E2E8F0] md:w-auto md:justify-self-center md:items-center md:justify-center md:text-center md:before:hidden max-[768px]:order-2">
              <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">Product Type</span>
              <span>{result.productType || 'Other'}</span>
            </div>
          )}

          <div className="flex w-full justify-between text-left text-[1.1rem] font-bold text-white md:w-auto md:justify-self-center md:items-center md:justify-center md:text-center max-[768px]:order-4">
            <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">Nominal Rate</span>
            <span className="flex items-center justify-center">{result.nominalRate.toFixed(2)} <span className="ml-0.5 text-[0.75rem] text-[#6B7280]">%</span></span>
          </div>

          <div className="flex w-full justify-between text-left text-[1.1rem] font-bold text-[#22C55E] md:w-auto md:justify-self-center md:items-center md:justify-center md:text-center max-[768px]:order-3">
            <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">After-Tax Yield</span>
            <span className="flex items-center justify-center max-[768px]:text-[1.25rem]">{result.afterTaxYield.toFixed(2)} <span className="ml-0.5 text-[0.75rem] text-[#10B981]">%</span></span>
          </div>

          <div className="flex w-full justify-between text-left text-[0.9rem] font-medium text-[#E2E8F0] md:w-auto md:justify-self-center md:items-center md:justify-center md:text-center max-[768px]:order-5">
            <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">Min Deposit</span>
            <span>${result.minDeposit.toLocaleString()}</span>
          </div>

          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-end max-[768px]:order-6 max-[768px]:pt-1">
            <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">Actions</span>
            <div className="mt-1 flex w-full flex-col items-stretch gap-2 md:mt-0 md:w-auto md:flex-row md:items-center md:justify-end">
              <button
                type="button"
                className="theme-keep-white flex h-11 min-w-[154px] w-full max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-[#1A3050] px-4 text-[0.82rem] font-bold text-[#EEF2FF] transition-all hover:bg-[#2F568F] appearance-none border-none focus:outline-none ring-0 shadow-none md:h-[50px] md:w-[138px] md:min-w-0 md:px-3 md:text-[0.82rem]"
                onClick={toggleExpand}
                aria-expanded={isExpanded}
              >
                Tax Breakdown
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 shrink-0" />
                )}
              </button>
              <button
                type="button"
                className="theme-keep-white flex h-11 min-w-[140px] w-full max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-[#FFFFFF] px-5 text-[0.82rem] font-bold text-black transition-all enabled:hover:bg-[linear-gradient(180deg,#D3D3D3_0%,#FFFFFF_100%)] appearance-none border-none focus:outline-none ring-0 shadow-none md:h-[50px] md:w-[106px] md:min-w-0 md:px-3 md:text-[0.86rem] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={openProviderLink}
                disabled={!result.detailsUrl}
              >
                Provider <ExternalLinkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className={`${expandedSurfaceClass} px-0 pb-0 pt-0`}>
            <div className={`grid grid-cols-2 gap-4 px-6 py-5 max-[768px]:grid-cols-1 max-[768px]:px-3 max-[768px]:py-3 ${expandedBorderClass}`}>
              <div className={taxCardClass}>
                <div className={taxHeadingClass}>
                  Read Tax Breakdown
                </div>
                <div className="space-y-4 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className={taxLabelClass}>Interest Earned :</span>
                    <span className="font-bold text-[#22C55E]">{result.taxBreakdown.interestEarned}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={taxLabelClass}>Total Tax :</span>
                    <span className="font-bold text-[#FF3B3B]">{result.taxBreakdown.totalTax}</span>
                  </div>
                </div>
                <div className={taxDividerClass}></div>
                <div className={netReturnClass}>
                  <span className={theme === 'light' ? 'text-[#0F172A]' : 'text-[#E2E8F0]'}>Net Return :</span>
                  <span className="text-[17px] text-[#22C55E]">{result.netReturn}</span>
                </div>
                {result.productType === 'Treasuries' && (
                  <div className="mt-3 flex items-center justify-between gap-3 text-[0.78rem]">
                    <span className={theme === 'light' ? 'text-[#64748B]' : 'text-[#6B7280]'}>Includes <span className="font-bold text-[#22C55E]">{result.taxBreakdown.totalSavings}</span> in state &amp; local tax savings</span>
                  </div>
                )}
              </div>

              <div className={`overflow-hidden rounded-[12px] ${whyPanelClass}`}>
                <div className={`flex items-center ${whyHeaderClass}`}>
                  {!isWhyExpanded ? (
                    <>
                      <div className={`absolute left-[16px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none ${theme === 'light' ? 'text-[#0F172A]' : 'text-white'}`}>Why this Fits</div>
                      <div className="absolute left-[212px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none text-[#22C55E]">{safeMatch}% Match</div>
                      <button
                        type="button"
                        className={`absolute left-[411px] top-1/2 inline-flex h-[28px] w-[155px] -translate-y-1/2 items-center justify-center gap-1 rounded-[8px] border border-[#6A9ABE] bg-transparent px-[6px] py-[5px] text-[12px] font-bold leading-none text-[#6A9ABE] shadow-[inset_0_0_0_1px_rgba(106,154,190,0.35)] ${theme === 'light' ? 'hover:bg-[#EAF2FF]' : 'hover:bg-[#0f2a1f]'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isWhyLoading) return;
                          setWhyThisFitsExpanded((prev) => ({ ...prev, [result.id]: true }));
                          if (!whyThisFitsFetched?.[result.id]) explainWhyThisFits(result);
                        }}
                      >
                        <SparkleIcon className="h-[11px] w-[11px] text-[#6A9ABE]" />
                        Generate Summary
                      </button>
                    </>
                  ) : (
                    <div className="grid w-full min-w-0 grid-cols-[minmax(110px,1fr)_auto_minmax(90px,180px)_minmax(52px,auto)] items-center gap-4 px-4">
                      <div className={`whitespace-nowrap text-[14px] font-bold leading-none ${theme === 'light' ? 'text-[#0F172A]' : 'text-white'}`}>Why this Fits</div>
                      <div className={`whitespace-nowrap text-[12px] font-bold leading-none ${theme === 'light' ? 'text-[#64748B]' : 'text-[#3A6090]'}`}>Match Score</div>
                      <div className={`h-[6px] min-w-0 rounded-full ${theme === 'light' ? 'bg-[#DBEAFE]' : 'bg-[#0D2A1F]'}`}>
                        <div className="h-[6px] rounded-full bg-[#22C55E]" style={{ width: `${Math.max(0, Math.min(100, safeMatch))}%` }} />
                      </div>
                      <div className="whitespace-nowrap text-right text-[18px] font-bold leading-none text-[#22C55E]">{safeMatch}%</div>
                    </div>
                  )}
                </div>

                {isWhyExpanded && (
                  <div className="pb-4 pt-3">
                    <div className={whyBodyClass}>
                      <div className="grid grid-cols-[20px_1fr] items-start gap-x-2 gap-y-3 text-left">
                        {isWhyLoading ? (
                          <>
                            <span aria-hidden="true" className="h-5 w-5" />
                            <p className="m-0 break-words pl-28 text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#80A4CC] max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                              ✨ Loading Summary......
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center text-[#1D8DEE]">
                              <SparkleIcon className="h-3.5 w-3.5" />
                            </span>
                            <div className="mt-[5px] text-[0.72rem] tracking-[0.005em] text-[#4E76A8]">
                              AI analyzed based on your income, tax bracket, investment term
                            </div>

                            {(whyHeadline || whyInsight) ? (
                              <>
                                {whyChunks.length > 0 && whyChunks.map((chunk, idx) => (
                                  <React.Fragment key={`${result.id}-why-${idx}`}>
                                    <span aria-hidden="true" className="h-5 w-5" />
                                    <p className="m-0 break-words text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#80A4CC] max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                                      {chunk}
                                    </p>
                                  </React.Fragment>
                                ))}
                                {whyInsight && (
                                  <React.Fragment key={`${result.id}-why-insight`}>
                                    <span aria-hidden="true" className="h-5 w-5" />
                                    <p className="m-0 break-words text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#80A4CC]/70 italic max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                                      {whyInsight}
                                    </p>
                                  </React.Fragment>
                                )}
                              </>
                            ) : (
                              <>
                                <span aria-hidden="true" className="h-5 w-5" />
                                <p className="m-0 break-words text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#5C81AF] max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                                  Unable to generate summary. Please try again.
                                </p>
                              </>
                            )}
                          </>
                        )}

                        {!isWhyLoading && (
                          <>
                            <span className="mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#1D8DEE] text-[0.72rem] font-bold leading-none text-[#1D8DEE]">
                              i
                            </span>
                            <div className="mt-[3.6px] text-[0.74rem] tracking-[0.005em] text-[#5C81AF]">
                              Generated by <strong className="text-[#9BCBFF]">SmartCD.AI</strong> - Results may vary - Not financial advice
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const investmentAmountError = getVisibleFieldError('investment_amount');
  const termLengthError = getVisibleFieldError('term_length_months');
  const incomeRangeError = getVisibleFieldError('income_range');
  const stateSelectionError = getVisibleFieldError('state_selection');
  const cityCountyError = getVisibleFieldError('city_county');
  const filingStatusError = getVisibleFieldError('tax_filing_status');

  const hasAnyValidationError = [
    'investment_amount',
    'term_length_months',
    'income_range',
    'state_selection',
    'city_county',
    'tax_filing_status',
  ].some((fieldName) => Boolean(getFieldError(fieldName)));

  const isFormValid = !hasAnyValidationError && termsAgreed;

  const safeResults = Array.isArray(results) ? results : [];
  const strategyTabs = [
    { id: 'best-rate', title: 'Best Rate', subtitle: 'Highest single after-tax yield' },
    { id: 'ladder', title: 'CD Ladder', subtitle: 'Rolling liquidity every quarter' },
    { id: 'barbell', title: 'CD Barbell', subtitle: 'Short + long, skip the middle' },
    { id: 'bullet', title: 'CD Bullet', subtitle: 'All mature on your target date' },
  ];
  const showBulletStrategyMockup = false;

  const navigateToHome = () => {
    window.history.pushState({ page: 'home' }, '', '/');
    clearSearchStorage();
    resetResultsState();
  };

  const isBulletResultsView = showResults && strategyView === 'bullet';

  return (
    <div className="layout">
      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite" aria-label="Loading">
          <img
            src="/loading-state-logo.png"
            alt="Loading"
            className="loading-overlay-logo"
          />
        </div>
      )}
      {showPrivacy && (
        <div className="fixed inset-0 z-[2000] flex h-screen w-screen flex-col overflow-hidden overscroll-none bg-white text-[#374151]">
          <div className="relative flex h-full flex-col bg-white">

            <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain max-[768px]:w-full max-[768px]:overflow-x-hidden">
              <div className="mx-auto max-w-[900px] flex-1 bg-white px-6 py-10 max-[768px]:px-4 max-[768px]:py-6">
                {/* Logo Section */}
                <div className="mb-8 flex flex-col items-start">
                  <button type="button" className="flex items-center gap-1 border-none bg-transparent p-0 py-2 cursor-pointer font-sans text-[14px] font-[600] leading-[20px] tracking-normal text-[#111827] transition-opacity hover:opacity-70" onClick={() => setShowPrivacy(false)}>
                    <ChevronLeftIcon className="h-5 w-5" />
                    Back
                  </button>
                </div>

                {/* Privacy Notice Section */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF5FF]">
                    <SolidLockIcon className="h-5 w-5 text-[#1557F5]" />
                  </div>
                  <h2 className="m-0 text-[1.75rem] font-bold text-[#1557F5] max-[768px]:text-[1.35rem]">Privacy Notice</h2>
                </div>

                <p className="mb-4 text-base font-normal leading-[1.5] text-[#111827]">SmartCD.AI respects your privacy.</p>
                <p className="mb-4 text-[0.95rem] leading-[1.6] text-[#4B5563]">We may collect basic information you provide (such as income range, filing status, and residential state and city) to generate personalized CD and Treasury comparisons. We also collect limited usage data (like browser type and page visits) to improve our product.</p>

                <div className="my-6 flex items-start gap-3 rounded-xl border border-[#D1E5F9] bg-[#F0F7FF] px-5 py-4 max-[768px]:px-[14px] max-[768px]:py-3">
                  <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#1D8DEE]" />
                  <span className="text-[0.95rem] font-medium leading-[1.5] text-[#1D8DEE]"><strong>We do not collect Social Security numbers or bank account credentials. We do not sell your personal information.</strong></span>
                </div>

                <p className="mb-4 text-[0.95rem] leading-[1.6] text-[#4B5563]">Your data is used only to provide recommendations and improve our AI models.</p>
                <p className="mb-4 text-[0.95rem] leading-[1.6] text-[#4B5563]">By continuing to use SmartCD.AI, you agree to this Privacy Notice.</p>

                <hr className="my-10 border-0 border-t border-[#E5E7EB]" />

                {/* Terms of Service Section */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EBF5FF] text-blue">
                    <DocumentIcon className="h-5 w-5 text-[#1D8DEE]" />
                  </div>
                  <h2 className="m-0 text-[1.75rem] font-bold text-[#1557F5] max-[768px]:text-[1.35rem]">Terms of Service</h2>
                </div>

                <p className="mb-4 text-base font-bold leading-[1.5] text-[#111827]">By using SmartCD.AI, you agree to the following terms:</p>

                <div className="mb-10 grid grid-cols-2 gap-y-8 gap-x-16 max-[640px]:grid-cols-1 max-[640px]:gap-6">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> Informational Use Only</div>
                    <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">SmartCD.AI provides CD, brokerage CD, and Treasury comparisons for informational purposes only. We do not provide financial, investment, tax, or legal advice.</p>
                  </div>

                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> No Guarantees</div>
                    <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">Rates, yields, and tax estimates are based on available data and assumptions. We do not guarantee accuracy, completeness, or future performance.</p>
                  </div>

                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> User Responsibility</div>
                    <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">You are responsible for verifying product terms directly with financial institutions before making investment decisions.</p>
                  </div>

                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> Acceptable Use</div>
                    <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">You agree not to misuse, copy, scrape, reverse engineer, or disrupt the platform in any way.</p>
                  </div>

                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FEF3C7] bg-[#FFFBEB] px-3 py-1.5 text-[0.85rem] font-semibold text-[#D97706]"><span className="inline-block h-2 w-2 rounded-full bg-[#F59E0B]"></span> Limitation of Liability</div>
                    <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">SmartCD.AI is not liable for investment decisions, financial losses, or damages arising from use of this service.</p>
                  </div>

                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> Updates</div>
                    <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">We may update these terms at any time. Continued use of SmartCD.AI means you accept the updated terms.</p>
                  </div>
                </div>
              </div>
              
              <footer className="mt-auto flex w-full flex-col items-center justify-center bg-[#1E2941] px-16 pt-8 pb-6 max-[768px]:px-[14px] max-[768px]:pt-[22px] max-[768px]:pb-[22px]">
                <div className="mb-8 max-w-[1200px] text-center text-[0.75rem] font-medium leading-[1.5] text-[rgba(255,255,255,0.55)]">
                  SmartCD.AI is an AI-powered aggregator of publicly available information. Annual Percentage Yields (APY) are subject to change without notice. Minimum deposit requirements and regional availability may apply. This tool provides information for educational purposes only and does not constitute investment, financial, tax, or legal advice. Always verify rates directly with the financial institution before making investment decisions.
                </div>
                <div className="flex w-full max-w-[1200px] items-center justify-between border-t border-[rgba(255,255,255,0.1)] pt-6 max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-[10px] max-[768px]:pt-[14px]">
                  <div className="text-[0.8rem] font-medium text-[rgba(255,255,255,0.52)]">Last updated: March 2026</div>
                  <div className="text-[0.8rem] font-medium text-[rgba(255,255,255,0.85)]">© 2026 SmartCD.ai - All Rights Reserved</div>
                  <div className="text-[0.8rem] font-medium text-[rgba(255,255,255,0.52)] transition-opacity hover:opacity-80">
                    Privacy Policy · Terms of Service
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* Header*/}
      <CD_header theme={theme} onLogoClick={navigateToHome} setTheme={setTheme}/>

      
      {/* Main Content - Dark Background */}
      <main className="main-content">
        {showBulletStrategyMockup ? (
          <BulletStrategyMockup
            theme={theme}
            userState={formData.state_selection}
            userIncomeRange={formData.income_range}
          />
        ) : !showResults ? (
          <>
            <div className="text-center max-w-[900px] mb-[60px] flex flex-col items-center max-[768px]:mb-7">
              <div className="inline-flex items-center gap-2 bg-[rgba(29,141,238,0.1)] border border-[rgba(29,141,238,0.3)] text-[#92C5F9] px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] mb-8 normal-case max-[768px]:mb-[18px]">
                <SparkleIcon className="w-3 h-3 text-[#1D8DEE]" />
                AI Powered Fixed Income Analysis
              </div>

              <div className="border-0 outline-none shadow-none px-10 py-[10px] mb-6 relative max-[768px]:px-0 max-[768px]:py-2 max-[768px]:mb-4">
                <h1 className="text-[3.5rem] font-extrabold leading-[1.15] tracking-[-0.02em] max-[768px]:text-[clamp(1.8rem,8.5vw,2.4rem)] max-[768px]:leading-[1.2] max-[480px]:text-[clamp(1.6rem,9vw,2rem)]">
                  <span className="text-blue-light">
                    The Only AI That Calculates Your <br className="max-[768px]:hidden" />
                    True{' '}
                  </span>
                  <span className="text-green">After-Tax Winner.</span>
                </h1>
              </div>

              <p className="text-[1.125rem] text-[#8B9BB4] leading-[1.6] max-w-[760px] mx-auto mb-8 max-[768px]:text-[0.96rem] max-[768px]:leading-[1.5] max-[768px]:mb-5 max-[768px]:px-1">
                Our AI scans thousands of CDs and Treasuries to find your optimal investment —<br className="max-[768px]:hidden" />
                automatically factoring in state tax exemptions to reveal the true after-tax winner.
              </p>

              <div className="flex gap-4 justify-center max-[768px]:flex-wrap max-[768px]:gap-[10px]">
                <div className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#E2E8F0] px-[14px] py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] normal-case max-[480px]:px-3 max-[480px]:py-[5px] max-[480px]:text-[0.7rem]"><LockIcon className="w-3 h-3 text-[#FFD54F]" /> Secure</div>
                <div className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#E2E8F0] px-[14px] py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] normal-case max-[480px]:px-3 max-[480px]:py-[5px] max-[480px]:text-[0.7rem]"><SparkleIcon className="w-3 h-3 text-white" /> AI Powered</div>
                <div className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#E2E8F0] px-[14px] py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] normal-case max-[480px]:px-3 max-[480px]:py-[5px] max-[480px]:text-[0.7rem]"><ShieldCheckIcon className="w-3 h-3 text-[#4DD0E1]" /> Tax Aware</div>
              </div>
            </div>

            {/* Dashboard Layout */}
            <div className="dashboard-grid justify-center">
              <div className="card-container main-card">
                <h2 className="card-title">
                  <div className="title-icon-wrapper">
                    <SparkleIcon className="card-title-icon" />
                  </div>
                  Your Investment Preferences
                </h2>

                {error && <div role="alert" className="text-[#FF5252] mb-4 text-[0.9rem] text-center">{error}</div>}

                <form className="flex flex-col gap-6 max-[768px]:gap-4" onSubmit={handleSearch}>
                  <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1 max-[640px]:gap-4">
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="investment_amount" className="text-xs font-semibold text-[#6B7280] capitalize">Cash Amount</label>
                      <div className="relative flex items-center">
                        {formData.investment_amount && (
                          <span className="absolute left-4 text-[#1E293B] text-base font-normal pointer-events-none flex items-center">$</span>
                        )}
                        <input
                          ref={cashInputRef}
                          type="text"
                          inputMode="numeric"
                          id="investment_amount"
                          name="investment_amount"
                          value={formData.investment_amount ? Number(formData.investment_amount).toLocaleString('en-US') : ''}
                          onChange={(e) => {
                            cashCursorRef.current = e.target.value.length - e.target.selectionStart;
                            const digits = e.target.value.replace(/[^0-9]/g, '');
                            handleChange({ target: { name: 'investment_amount', value: digits } });
                          }}
                          onBlur={handleFieldBlur}
                          className={`w-full ${formData.investment_amount ? 'pl-8' : 'pl-4'} pr-4 py-4 text-base leading-6 font-normal box-border rounded-[8px] border outline-none bg-white text-[#1E293B] transition-all placeholder:text-[#9CA3AF] placeholder:font-normal appearance-none focus:shadow-[0_0_0_2px_rgba(29,141,238,0.3)] ${investmentAmountError ? 'border-[#FF5252] shadow-[0_0_0_2px_rgba(255,82,82,0.2)]' : 'border-[#E5E7EB]'}`}
                          placeholder="Enter amount ($5,000 minimum)"
                          required
                        />
                      </div>
                      {investmentAmountError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{investmentAmountError}</p>}
                    </div>
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="term_length_months" className="text-xs font-semibold text-[#6B7280] capitalize">Duration</label>
                      <Dropdown
                        name="term_length_months"
                        value={formData.term_length_months}
                        onChange={handleChange}
                        onBlur={handleFieldBlur}
                        options={TERM_LENGTH_OPTIONS}
                        placeholder="Select Duration"
                        hasError={Boolean(termLengthError)}
                      />
                      {termLengthError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{termLengthError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1 max-[640px]:gap-4">
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="state_selection" className="text-xs font-semibold text-[#6B7280] capitalize">State</label>
                      <Dropdown
                        name="state_selection"
                        value={formData.state_selection}
                        onChange={handleChange}
                        onBlur={handleFieldBlur}
                        options={usStates}
                        placeholder="Select State"
                        hasError={Boolean(stateSelectionError)}
                        searchable
                        matchMode="contains"
                        maxResults={10}
                        noResultsText="No matching state found"
                      />
                      {stateSelectionError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{stateSelectionError}</p>}
                    </div>
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="city_county" className="text-xs font-semibold text-[#6B7280] capitalize">City / County</label>
                      <Dropdown
                        name="city_county"
                        value={formData.city_county}
                        onChange={handleChange}
                        onBlur={handleFieldBlur}
                        options={
                          formData.state_selection 
                            ? (locationData[formData.state_selection] || []) 
                            : Object.values(locationData).flat()
                        }
                        placeholder="Select or type City/County"
                        hasError={Boolean(cityCountyError)}
                        disabled={!STATES_WITH_LOCAL_TAX.includes(formData.state_selection)}
                        searchable
                        matchMode="prefix"
                        pinOther
                        titleCase
                        noResultsText="No matching city/county found"
                      />
                      {cityCountyError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{cityCountyError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1 max-[640px]:gap-4">
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="income_range" className="text-xs font-semibold text-[#6B7280] capitalize">Annual Income Range</label>
                      <Dropdown
                        name="income_range"
                        value={formData.income_range}
                        onChange={handleChange}
                        onBlur={handleFieldBlur}
                        options={INCOME_RANGE_OPTIONS}
                        placeholder="Select Income Range"
                        hasError={Boolean(incomeRangeError)}
                      />
                      {incomeRangeError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{incomeRangeError}</p>}
                    </div>
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="tax_filing_status" className="text-xs font-semibold text-[#6B7280] capitalize">Tax Filing Status</label>
                      <Dropdown
                        name="tax_filing_status"
                        value={formData.tax_filing_status}
                        onChange={handleChange}
                        onBlur={handleFieldBlur}
                        options={FILING_STATUS_OPTIONS}
                        placeholder="Select Filing Status"
                        hasError={Boolean(filingStatusError)}
                      />
                      {filingStatusError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{filingStatusError}</p>}
                    </div>
                  </div>

                  <div className="flex justify-center items-center mt-3 mb-6 max-[768px]:mt-1.5 max-[768px]:mb-3.5">
                    <label className="flex items-center gap-2 text-[0.8rem] text-[#9CA3AF] normal-case font-medium cursor-pointer max-[768px]:items-start max-[768px]:leading-[1.4]">
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="w-4 h-4 accent-[#1D8DEE] cursor-pointer"
                      />
                      <span>
                        By continuing to use SmartCD.AI, you agree to our{' '}
                        <u className="text-[#E2E8F0] cursor-pointer underline" onClick={() => setShowPrivacy(true)}>Privacy Policy and Terms of Service</u>.
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-center mt-6 max-[768px]:mt-2">
                    <button type="submit" className="theme-keep-white flex items-center justify-center gap-3 w-full max-w-[500px] px-4 py-4 text-base font-bold tracking-[0.02em] text-white bg-[linear-gradient(90deg,#1C74E9_0%,#15B0F8_100%)] border-0 rounded-full cursor-pointer transition-all shadow-[0_10px_20px_-5px_rgba(29,141,238,0.4)] [&:not(:disabled):hover]:-translate-y-0.5 [&:not(:disabled):hover]:shadow-[0_14px_24px_-5px_rgba(29,141,238,0.5)] [&:not(:disabled):active]:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed max-[768px]:max-w-full" disabled={loading || !isFormValid}>
                      <SparkleIcon className="w-4 h-4" />
                      {loading ? "Submitting..." : "FIND BEST YIELDS"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-auto w-full max-w-[1288px]">
            {(strategyView === 'ladder' || strategyView === 'barbell' || strategyView === 'bullet') && (
              <div className="mb-4">
                <h1 className={`text-[20px] font-bold leading-[28px] ${theme === 'light' ? 'text-[#0F172A]' : 'text-white'}`}>
                  {strategyView === 'ladder'
                    ? 'Ladder Strategy'
                    : strategyView === 'barbell'
                    ? 'Barbell Strategy'
                    : 'Bullet Strategy'}
                </h1>
                <p className="text-[14px] leading-[20px] text-[#4A6A8A]">Compare all CDs with the best after-tax yields for your situation</p>
              </div>
            )}
            <section className="mb-6 w-full min-h-[114px] rounded-[10px] border border-[#23446A] bg-[#0D1B2D] p-[20px] shadow-[inset_0_0_0_1px_rgba(35,68,106,0.35)] md:p-[30px]">
              <div className="mx-auto flex w-full max-w-[1226px] flex-wrap items-center gap-x-[30px] gap-y-3 lg:flex-nowrap">
                {strategyTabs.map((tab) => {
                  const active = strategyView === tab.id;
                  const colors = STRATEGY_TAB_COLORS[tab.id] || STRATEGY_TAB_COLORS.bullet;
                  const textColorClass = active ? colors.text : 'text-[#94A3B8]';
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-[273px] flex h-[67px] shrink-0 items-center gap-3 border-0 bg-transparent text-left transition-all duration-300 ease-out ${
                        active
                          ? `rounded-[12px] border bg-[#0D1B2E] px-6 ${colors.active}`
                          : `cursor-pointer px-0 hover:rounded-[12px] hover:border hover:bg-[#0D1B2E] hover:px-4 ${colors.hover}`
                      }`}
                    >
                      <span className={`inline-flex h-5 w-5 items-center justify-center ${textColorClass}`}>
                        <StrategyTabIcon id={tab.id} />
                      </span>
                      <span className="relative h-[42px] w-[204px]">
                        <span className={`absolute left-0 top-0 text-[18px] font-semibold leading-[20px] ${textColorClass}`}>{tab.title}</span>
                        <span className={`absolute left-0 top-6 w-[200px] text-[14px] font-normal leading-[20px] ${textColorClass}`}>{tab.subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            {strategyView === 'bullet' ? (
              <>
                <BulletStrategyMockup
                  theme={theme}
                  embedded
                  hideTitle
                  initialTerm={bulletControls.term}
                  initialAmount={bulletControls.amount}
                  simulationData={bulletSimulation}
                  alternativesByTranche={bulletAlternativesByTranche}
                  simulationLoading={bulletLoading}
                  simulationError={bulletError}
                  onExportPdf={() => window.print()}
                  userState={formData.state_selection}
                  userIncomeRange={formData.income_range}
                  onControlsChange={(controls) => {
                    setBulletControlsDirty(true);
                    setBulletControls((prev) => {
                      const next = {
                        term: controls?.term || prev.term,
                        amount: controls?.amount || prev.amount,
                      };
                      if (next.term === prev.term && next.amount === prev.amount) {
                        return prev;
                      }
                      return next;
                    });
                  }}
                />
                <AIAssistant rankResponse={rankResponse} />
              </>
            ) : strategyView === 'ladder' ? (
              <LadderTab
                initialFilterType={ladderControls.filterType}
                initialHorizon={ladderControls.horizon}
                initialAmount={ladderControls.amount}
                simulationData={ladderSimulation}
                simulationLoading={ladderLoading}
                simulationError={ladderError}
                onExportPdf={() => window.print()}
                onSelectStrategy={handleTabChange}
                onControlsChange={(controls) => {
                  const nextFilterType = controls?.filterType || ladderControls.filterType;
                  const nextHorizon = controls?.horizon || ladderControls.horizon;
                  const nextAmount = controls?.amount || ladderControls.amount;
                  if (
                    nextFilterType === ladderControls.filterType &&
                    nextHorizon === ladderControls.horizon &&
                    nextAmount === ladderControls.amount
                  ) return;
                  setLadderControlsDirty(true);
                  setLadderControls({ filterType: nextFilterType, horizon: nextHorizon, amount: nextAmount });
                }}
              />
            ) : strategyView === 'barbell' ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#1E3A5F]">
                  <svg className="h-8 w-8 text-[#0077FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="mb-2 text-[22px] font-semibold text-white">CD Barbell — Coming Soon</h2>
                <p className="max-w-[420px] text-[15px] leading-relaxed text-[#6B7280]">
                  Split your investment between short and long-term CDs to balance liquidity and maximize your after-tax yield. This strategy is currently in development.
                </p>
              </div>
            ) : (
              <>
            <div className="mb-6 flex items-start justify-between max-[768px]:mb-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3">
              <div>
                <h1 className="mb-1.5 text-2xl font-bold text-white max-[768px]:text-[1.2rem] max-[768px]:leading-[1.3]">All Products - Ranked by After-Tax Yield</h1>
                <h2 className="m-0 text-base font-medium text-[#6B7280] max-[768px]:text-[0.9rem] max-[768px]:leading-[1.4]">Compare all CDs with the best after-tax yields for your situation</h2>
              </div>
              <div className="grid overflow-hidden rounded-[8px] bg-[#0F172A] max-[768px]:w-full max-[768px]:grid-cols-2 md:flex">
                <button
                  className={`theme-keep-white cursor-pointer border-none px-4 py-2 text-[0.85rem] font-semibold transition-all max-[768px]:min-h-11 max-[768px]:py-3 ${
                    viewMode === 'combined'
                      ? (theme === 'light' ? 'bg-[#1557F5] text-white' : 'bg-[#22C55E] text-white')
                      : 'bg-transparent text-[#9CA3AF]'
                  }`}
                  onClick={() => setViewMode('combined')}
                >
                  Combined View
                </button>
                <button
                  className={`theme-keep-white cursor-pointer border-none px-4 py-2 text-[0.85rem] font-semibold transition-all max-[768px]:min-h-11 max-[768px]:py-3 ${
                    viewMode === 'grouped'
                      ? (theme === 'light' ? 'bg-[#1557F5] text-white' : 'bg-[#22C55E] text-white')
                      : 'bg-transparent text-[#9CA3AF]'
                  }`}
                  onClick={() => setViewMode('grouped')}
                >
                  Group By Type
                </button>
              </div>
            </div>

            <div className="flex gap-6 mb-6 max-[768px]:flex-col max-[768px]:gap-3 max-[768px]:mb-[14px]">
              <div className="flex flex-col gap-2 w-auto max-[768px]:w-full">
                <label className="flex items-center gap-1.5 text-[14px] font-semibold text-[#6B7280] normal-case"><FilterIcon className="w-[14px] h-[14px]" /> Filter by type</label>
                <div className="relative w-[200px] max-[768px]:w-full">
                  <select 
                    className="w-full min-w-[200px] max-[768px]:min-w-0 h-12 rounded-[8px] px-4 pr-10 py-[10px] bg-[#0D1B2D] border border-[#1A3050] text-white text-[16px] font-normal appearance-none"
                    value={productTypeFilter}
                    onChange={(e) => setProductTypeFilter(e.target.value)}
                  >
                    <option value="All products">All products ({safeResults.length})</option>
                    <option value="Bank CDs">Bank CDs</option>
                    <option value="Brokerage CDs">Brokerage CDs</option>
                    <option value="Treasuries">US Treasuries</option>
                  </select>
                  <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-2 w-auto max-[768px]:w-full">
                <label className="flex items-center gap-1.5 text-[14px] font-semibold text-[#6B7280] normal-case"><ClockIcon className="w-[14px] h-[14px]" /> Duration</label>
                <div className="relative w-[200px] max-[768px]:w-full">
                  <select
                    name="term_length_months"
                    className="w-full min-w-[200px] max-[768px]:min-w-0 h-12 rounded-[8px] px-4 pr-10 py-[10px] bg-[#0D1B2D] border border-[#1A3050] text-white text-[16px] font-normal appearance-none"
                    value={formData.term_length_months}
                    onChange={handleChange}
                  >
                    <option value="3 Month">3 Month</option>
                    <option value="6 Month">6 Month</option>
                    <option value="9 Month">9 Month</option>
                    <option value="12 Month">12 Month</option>
                    <option value="18 Month">18 Month</option>
                    <option value="24 Month">24 Month</option>
                    <option value="30 Month">30 Month</option>
                    <option value="3 Year">3 Year</option>
                    <option value="4 Year">4 Year</option>
                    <option value="5 Year and Above">5 Year and Above</option>
                  </select>
                  <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
              </div>
            </div>

              <div className={`overflow-hidden rounded-2xl max-[768px]:overflow-visible max-[768px]:rounded-xl ${theme === 'light' ? 'border border-[#CBD5E1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]' : 'border border-[#1D8DEE] bg-[#081329] shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}`}>
              {/* Mobile sort controls */}
              <div className={`flex items-center justify-between gap-2 border-b px-[14px] py-3 md:hidden ${theme === 'light' ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-[#1E293B] bg-[#0A1429]'}`}>
                <div className="text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#94A3B8]">Sort</div>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-2 text-[0.72rem] font-bold uppercase tracking-[0.05em] ${theme === 'light' ? 'border-[#CBD5E1] bg-white text-[#334155]' : 'border-[#1A3050] bg-[#0D1B2D] text-[#E2E8F0]'}`}
                    onClick={() => toggleSort('nominalRate')}
                  >
                    Nominal <SortIcon active={sortColumn === 'nominalRate'} direction={sortDirection} />
                  </button>
                  <button
                    type="button"
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-2 text-[0.72rem] font-bold uppercase tracking-[0.05em] ${theme === 'light' ? 'border-[#CBD5E1] bg-white text-[#334155]' : 'border-[#1A3050] bg-[#0D1B2D] text-[#E2E8F0]'}`}
                    onClick={() => toggleSort('afterTaxYield')}
                  >
                    After-Tax <SortIcon active={sortColumn === 'afterTaxYield'} direction={sortDirection} />
                  </button>
                  <button
                    type="button"
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-2 text-[0.72rem] font-bold uppercase tracking-[0.05em] ${theme === 'light' ? 'border-[#CBD5E1] bg-white text-[#334155]' : 'border-[#1A3050] bg-[#0D1B2D] text-[#E2E8F0]'}`}
                    onClick={() => toggleSort('minDeposit')}
                  >
                    Deposit <SortIcon active={sortColumn === 'minDeposit'} direction={sortDirection} />
                  </button>
                </div>
              </div>

              <div className={`hidden md:grid md:gap-4 ${theme === 'light' ? 'border-b border-[#E2E8F0] bg-[#F8FAFC]' : 'border-b border-[#1E293B] bg-[#0A1429]'} ${viewMode === 'combined' ? 'md:grid-cols-[minmax(220px,2.05fr)_minmax(145px,1.12fr)_minmax(118px,0.9fr)_minmax(150px,1.02fr)_minmax(130px,0.9fr)_220px]' : 'md:grid-cols-[minmax(220px,2.2fr)_minmax(118px,0.95fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_220px]'}`}>
                <div className="flex items-center justify-center py-4 text-center text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8]">PROVIDER / INSTITUTION</div>
                {viewMode === 'combined' && <div className="flex items-center justify-center py-4 text-center text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8]">PRODUCT TYPE</div>}
                <div className="flex items-center justify-center gap-2 py-4 text-center text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8] whitespace-nowrap">
                  NOMINAL RATE
                  <button
                    type="button"
                    className="flex items-center justify-center border-none bg-transparent p-0 text-[#475569] hover:text-[#E2E8F0]"
                    onClick={() => toggleSort('nominalRate')}
                    aria-label="Sort by nominal rate"
                  >
                    <SortIcon active={sortColumn === 'nominalRate'} direction={sortDirection} />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 py-4 text-center text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8] whitespace-nowrap">
                  AFTER TAX YIELD
                  <button
                    type="button"
                    className="flex items-center justify-center border-none bg-transparent p-0 text-[#475569] hover:text-[#E2E8F0]"
                    onClick={() => toggleSort('afterTaxYield')}
                    aria-label="Sort by after-tax yield"
                  >
                    <SortIcon active={sortColumn === 'afterTaxYield'} direction={sortDirection} />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 py-4 text-center text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8] whitespace-nowrap">
                  MIN. DEPOSIT
                  <button
                    type="button"
                    className="flex items-center justify-center border-none bg-transparent p-0 text-[#475569] hover:text-[#E2E8F0]"
                    onClick={() => toggleSort('minDeposit')}
                    aria-label="Sort by minimum deposit"
                  >
                    <SortIcon active={sortColumn === 'minDeposit'} direction={sortDirection} />
                  </button>
                </div>
                <div className="flex items-center justify-start py-4 pl-4 text-left text-xs font-bold uppercase tracking-[0.05em] text-[#94A3B8]">ACTIONS</div>
              </div>
              <div>
                {(() => {
                  const filtered = safeResults.filter(r => 
                    productTypeFilter === 'All products' || r.productType === productTypeFilter
                  );

                  if (viewMode === 'combined') {
                    const sorted = sortResults(filtered);
                    return sorted.map(r => renderResultCard(r, true));
                  } else {
                    return (
                      <>
                        <div className={`border-y px-6 py-4 text-[0.9rem] font-bold max-[768px]:px-[14px] max-[768px]:py-3 max-[768px]:text-[0.82rem] ${theme === 'light' ? 'border-[#E2E8F0] bg-[#F8FAFC] text-[#334155]' : 'border-[#1E293B] bg-[#0A1429] text-[#E2E8F0]'}`}>Bank CDs</div>
                        {sortResults(filtered.filter(r => r.productType === 'Bank CDs')).map(r => renderResultCard(r, false))}

                        <div className={`mt-8 border-y px-6 py-4 text-[0.9rem] font-bold max-[768px]:px-[14px] max-[768px]:py-3 max-[768px]:text-[0.82rem] ${theme === 'light' ? 'border-[#E2E8F0] bg-[#F8FAFC] text-[#334155]' : 'border-[#1E293B] bg-[#0A1429] text-[#E2E8F0]'}`}>Brokerage CDs</div>
                        {sortResults(filtered.filter(r => r.productType === 'Brokerage CDs')).map(r => renderResultCard(r, false))}

                        <div className={`mt-8 border-y px-6 py-4 text-[0.9rem] font-bold max-[768px]:px-[14px] max-[768px]:py-3 max-[768px]:text-[0.82rem] ${theme === 'light' ? 'border-[#E2E8F0] bg-[#F8FAFC] text-[#334155]' : 'border-[#1E293B] bg-[#0A1429] text-[#E2E8F0]'}`}>US Treasury</div>
                        {sortResults(filtered.filter(r => r.productType === 'Treasuries')).map(r => renderResultCard(r, false))}
                      </>
                    );
                  }
                })()}
              </div>
            </div>
            <AIAssistant rankResponse={rankResponse} />
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer/>
    </div>
  );
}
