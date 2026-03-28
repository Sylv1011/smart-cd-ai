import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { locationData } from './utils/locationData';
import { usStates } from './utils/statesData';
import { stateNameToCode } from './utils/stateCodes';
import AIAssistant from './AIAssistant';
import SearchableSelect from './components/SearchableSelect';
import StrictSelect from './components/StrictSelect';
import StateAutocomplete from './components/StateAutocomplete';

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
    const fedRate = Number(o?.fed_rate ?? 0);
    const stateRate = productType === 'Treasuries' ? 0 : Number(o?.state_rate ?? 0);
    const localRate = productType === 'Treasuries' ? 0 : Number(o?.local_rate ?? 0);

    const fedTax = grossInterest * fedRate;
    const stateTax = grossInterest * stateRate;
    const localTax = grossInterest * localRate;
    const totalTax = fedTax + stateTax + localTax;
    const estimatedSavings = Math.max(0, stateTax + localTax);

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
  const aiBase = import.meta.env.VITE_AI_LAYER_URL;
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showResults, setShowResults] = useState(window.location.pathname === '/results');
  const [viewMode, setViewMode] = useState('combined');
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [productTypeFilter, setProductTypeFilter] = useState('All products');
  const [sortColumn, setSortColumn] = useState(null); // 'nominalRate' | 'afterTaxYield' | 'minDeposit' | null
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const latestRequestIdRef = useRef(0);
  const didRestoreRef = useRef(false);
  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [whyThisFitsOverrides, setWhyThisFitsOverrides] = useState({});
  const [whyThisFitsLoading, setWhyThisFitsLoading] = useState({});
  const [whyThisFitsFetched, setWhyThisFitsFetched] = useState({});
  const [whyThisFitsExpanded, setWhyThisFitsExpanded] = useState({});

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
      const text = String(data?.why_this_fits ?? '').trim();
      if (!text) {
        throw new Error('No explanation returned from AI service.');
      }

      setWhyThisFitsOverrides((prev) => ({ ...prev, [id]: text }));
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
    const handlePopState = () => {
      if (window.location.pathname === '/results') {
        setShowResults(true);
      } else {
        setShowResults(false);
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

  const persistLastSearch = (nextFormData) => {
    try {
      const payload = {
        formData: nextFormData,
        termsAgreed: Boolean(termsAgreed),
        savedAt: Date.now(),
      };
      window.localStorage.setItem(LAST_SEARCH_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // best-effort only
    }
  };

  const fetchRankResults = async (nextFormData, options = {}) => {
    const { navigateToResults = false, scrollToTop = false } = options;
    const amt = parseFloat(nextFormData.investment_amount);
    const requestId = ++latestRequestIdRef.current;

    persistLastSearch(nextFormData);
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
        window.history.pushState({ page: 'results' }, '', '/results');
        setShowResults(true);
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

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showResults) return;
    if (didRestoreRef.current) return;
    if (rankResponse) return;

    let saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(LAST_SEARCH_STORAGE_KEY) || 'null');
    } catch {
      saved = null;
    }

    const savedFormData = saved?.formData;
    if (!savedFormData || saved?.termsAgreed === false) {
      didRestoreRef.current = true;
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
          if (!area) return 'other';
          return allowedAreas.includes(area) ? area : 'other';
        })()
        : '',
    };

    setFormData(normalized);
    setSelectedStateCode(stateNameToCode[normalized.state_selection] || '');
    setTermsAgreed(true);
    didRestoreRef.current = true;

    if (canAutoRefreshRank(normalized)) {
      fetchRankResults(normalized, { navigateToResults: false, scrollToTop: true });
    } else {
      setError('Please review your inputs to refresh results.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, rankResponse]);

  const isAutoRefreshField = (name) => (
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
      const allowedAreas = isCityCountyEnabled ? (locationData[value] || []) : [];
      const nextCityCounty =
        isCityCountyEnabled
          ? (allowedAreas.includes(formData.city_county) ? formData.city_county : 'other')
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
          ? (allowedAreas.includes(formData.city_county) ? formData.city_county : 'other')
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
    const toggleExpand = () => setExpandedCardId(isExpanded ? null : result.id);
    const safeMatch = Math.max(0, Math.min(100, Number(result.matchPercentage) || 0));
    const isWhyLoading = Boolean(whyThisFitsLoading?.[result.id]);
    const isWhyExpanded = Boolean(whyThisFitsExpanded?.[result.id]);
    const whyText = (whyThisFitsOverrides && Object.prototype.hasOwnProperty.call(whyThisFitsOverrides, result.id))
      ? whyThisFitsOverrides[result.id]
      : '';
    const whyChunks = splitWhyThisFitsText(whyText);

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

    return (
      <div key={result.id}>
        <div
          className={`relative transition-colors max-[768px]:flex max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3 max-[768px]:px-4 max-[768px]:py-3 md:grid md:items-center md:gap-4 md:px-5 md:hover:bg-[rgba(29,141,238,0.05)] ${result.isTopPick ? 'md:pt-8 md:pb-5' : 'md:py-5'} ${showProductType ? 'md:grid-cols-[minmax(220px,2.05fr)_minmax(145px,1.12fr)_minmax(118px,0.9fr)_minmax(150px,1.02fr)_minmax(130px,0.9fr)_220px]' : 'md:grid-cols-[minmax(220px,2.2fr)_minmax(118px,0.95fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_220px]'} ${isExpanded ? 'bg-[#0A1E14] border-b-0' : result.isTopPick ? 'bg-[#062314] border-b border-[#1E293B]' : 'bg-[#081329] border-b border-[#1E293B]'}`}
        >
          <div className="flex items-center max-[768px]:order-1 max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-2 max-[768px]:border-b max-[768px]:border-[#1E293B] max-[768px]:pb-3">
            {result.isTopPick && <span className="inline-flex shrink-0 rounded-full bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)] px-3 py-1 text-[0.64rem] font-extrabold uppercase tracking-[0.04em] text-white md:hidden">★ TOP PICK</span>}
            <div className="flex w-full min-w-0 items-center gap-3 md:pr-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white text-[0.9rem] font-bold text-[#1D4ED8] max-[480px]:h-8 max-[480px]:w-8 max-[480px]:text-[0.72rem]">{result.provider.substring(0, 2).toUpperCase()}</div>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="break-words text-[1.02rem] font-bold tracking-[-0.01em] text-[#F8FAFC] max-[480px]:text-[0.95rem]">{result.provider}</span>
                </div>
                <div className="break-words text-[0.72rem] leading-[1.35] tracking-[0.005em] text-[#5F7EA6]">{result.institutionType}</div>
              </div>
            </div>
            {result.isTopPick && <span className="absolute left-4 top-2 hidden shrink-0 rounded-full bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)] px-3 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.04em] text-white md:inline-flex">★ TOP PICK</span>}
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
                className="flex h-11 min-w-[154px] w-full max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-[#1A3050] px-4 text-[0.82rem] font-bold text-[#EEF2FF] transition-all hover:bg-[#2F568F] appearance-none border-none focus:outline-none ring-0 shadow-none md:h-[50px] md:w-[138px] md:min-w-0 md:px-3 md:text-[0.82rem]"
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
                className="flex h-11 min-w-[140px] w-full max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-[linear-gradient(180deg,#2BC65F_0%,#20B856_100%)] px-5 text-[0.82rem] font-bold text-white transition-all enabled:hover:bg-[linear-gradient(180deg,#29BA5A_0%,#1AA34C_100%)] appearance-none border-none focus:outline-none ring-0 shadow-none md:h-[50px] md:w-[106px] md:min-w-0 md:px-3 md:text-[0.86rem] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={openProviderLink}
                disabled={!result.detailsUrl}
              >
                Provider <ExternalLinkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-[#0A1E14] px-8 pb-7 pt-1 max-[768px]:px-[14px] max-[768px]:pb-[14px]">
            <div className="mt-4 grid grid-cols-2 gap-6 max-[768px]:grid-cols-1 max-[768px]:gap-[16px]">
              <div className="rounded-2xl border border-[#123B2F] bg-[rgba(2,10,22,0.84)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] max-[768px]:px-4 max-[768px]:py-3">
                <div className="mb-4 flex min-h-[44px] items-center justify-between border-b border-[rgba(29,141,238,0.16)] pb-3">
                  <h4 className="m-0 text-[1.05rem] font-bold text-[#E2E8F0] max-[768px]:text-[0.95rem]">Read Tax Break down</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 text-[0.8rem]">
                    <span className="text-[#9CA3AF]">Interest Earned :</span>
                    <span className="text-right font-bold text-[#22C55E]">{result.taxBreakdown.interestEarned}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[0.8rem]">
                    <span className="text-[#9CA3AF]">Total Tax :</span>
                    <span className="text-right font-bold text-[#FF5C5C]">{result.taxBreakdown.totalTax}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[0.8rem]">
                    <span className="text-[#9CA3AF]">Total Savings :</span>
                    <span className="text-right font-bold text-[#22C55E]">{result.taxBreakdown.totalSavings}</span>
                  </div>
                </div>
                <div className="my-4 border-t border-[rgba(255,255,255,0.1)]"></div>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.12)] px-4 py-3 text-[1rem] font-bold">
                  <span className="text-[#E2E8F0]">Net Return :</span>
                  <span className="text-[1.03rem] leading-none text-[#22C55E] max-[768px]:text-[0.8rem]">{result.netReturn}</span>
                </div>
              </div>

              <div className="self-start rounded-2xl border border-[#1C6FC4] bg-[rgba(2,10,22,0.72)] px-5 py-0 shadow-[0_0_0_1px_rgba(29,141,238,0.18),inset_0_1px_0_rgba(255,255,255,0.03)] max-[768px]:px-4 max-[768px]:py-0">
                <div
                  className={`mb-0 flex min-h-[44px] items-center justify-between gap-3 py-4 ${
                    isWhyExpanded ? 'border-b border-[rgba(29,141,238,0.25)] pb-3' : ''
                  }`}
                >
                  <h4 className="m-0 text-[1.05rem] font-bold text-[#E2E8F0] max-[768px]:text-[0.95rem]">Why this Fits</h4>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(29,141,238,0.28)] bg-[rgba(29,141,238,0.08)] px-3 py-2 text-[0.82rem] font-semibold text-[#6FA6DC] transition-colors hover:bg-[rgba(29,141,238,0.12)]"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setWhyThisFitsExpanded((prev) => {
                        const nextValue = !prev?.[result.id];
                        if (nextValue) {
                          explainWhyThisFits(result);
                        }
                        return { ...prev, [result.id]: nextValue };
                      });
                    }}
                    aria-expanded={isWhyExpanded}
                    aria-label="See summary"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(29,141,238,0.45)] bg-[rgba(29,141,238,0.10)] text-[#1D8DEE]">
                      <SparkleIcon className="h-3.5 w-3.5" />
                    </span>
                    <span>See summary</span>
                  </button>
                </div>

                {isWhyExpanded && (
                  <div className="pb-4 pt-3">
                    <div className="rounded-xl border border-[rgba(29,141,238,0.22)] bg-[rgba(2,10,22,0.55)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] max-[768px]:px-3 max-[768px]:py-3">
                      <div className="grid grid-cols-[20px_1fr] items-start gap-x-2 gap-y-3 text-left">
                        <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center text-[#1D8DEE]">
                          <SparkleIcon className="h-3.5 w-3.5" />
                        </span>
                        <div className="mt-[4px] text-[0.72rem] tracking-[0.005em] text-[#4E76A8]">
                          {isWhyLoading ? 'Generating summary...' : 'AI analyzed based on your income, tax bracket, investment term'}
                        </div>

                        {isWhyLoading ? (
                          <>
                            <span aria-hidden="true" className="h-5 w-5" />
                            <p className="m-0 break-words text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#5C81AF] max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                              Generating summary...
                            </p>
                          </>
                        ) : whyChunks.length ? (
                          whyChunks.map((chunk, idx) => (
                            <React.Fragment key={`${result.id}-why-${idx}`}>
                              <span aria-hidden="true" className="h-5 w-5" />
                              <p className="m-0 break-words text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#80A4CC] max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                                {chunk}
                              </p>
                            </React.Fragment>
                          ))
                        ) : (
                          <>
                            <span aria-hidden="true" className="h-5 w-5" />
                            <p className="m-0 break-words text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#5C81AF] max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                              Unable to generate summary. Please try again.
                            </p>
                          </>
                        )}

                        <span className="mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#1D8DEE] text-[0.72rem] font-bold leading-none text-[#1D8DEE]">
                          i
                        </span>
                        <div className="mt-[3.6px] text-[0.74rem] tracking-[0.005em] text-[#5C81AF]">
                          Generated by <strong className="text-[#9BCBFF]">SmartCD.AI</strong> - Results may vary - Not financial advice
                        </div>
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
        <div className="fixed inset-0 z-[1000] flex flex-col overflow-hidden bg-white text-[#374151]">
          <div className="relative flex h-full flex-col bg-white">

            <div className="flex flex-1 flex-col overflow-y-auto max-[768px]:w-full max-[768px]:overflow-x-hidden">
              <div className="mx-auto max-w-[900px] flex-1 bg-white px-6 py-10 max-[768px]:px-4 max-[768px]:py-6">
                {/* Logo Section */}
                <div className="mb-8 flex flex-col items-start">
                  <img src="/logo.png" alt="SmartCD.AI Logo" className="h-14 w-auto max-w-full object-contain" />
                  <button type="button" className="mt-4 flex items-center gap-1 border-none bg-transparent p-0 py-2 cursor-pointer font-sans text-[14px] font-[600] leading-[20px] tracking-normal text-[#1557F5] transition-opacity hover:opacity-70" onClick={() => setShowPrivacy(false)}>
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
              
              <footer className="mt-auto flex w-full flex-col items-center justify-center bg-[radial-gradient(circle,#243C6B_0%,#1E2941_100%)] px-16 pt-8 pb-6 max-[768px]:px-[14px] max-[768px]:pt-[22px] max-[768px]:pb-[22px]">
                <div className="mb-8 max-w-[1200px] text-center text-[0.75rem] font-medium leading-[1.5] text-[rgba(255,255,255,0.8)]">
                  SmartCD.AI is an AI-powered aggregator of publicly available information. Annual Percentage Yields (APY) are subject to change without notice. Minimum deposit requirements and regional availability may apply. This tool provides information for educational purposes only and does not constitute investment, financial, tax, or legal advice. Always verify rates directly with the financial institution before making investment decisions.
                </div>
                <div className="flex w-full max-w-[1200px] items-center justify-between border-t border-[rgba(255,255,255,0.1)] pt-6 max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-[10px] max-[768px]:pt-[14px]">
                  <div className="text-[0.8rem] font-medium text-white">Last updated: January 2026</div>
                  <div className="text-[0.8rem] font-medium text-white">© 2026 SmartCD.ai - All Rights Reserved</div>
                  <div className="text-[0.8rem] font-medium text-white transition-opacity hover:opacity-80">
                    Privacy Policy · Terms of Service
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* Header - Light Background */}
      <header className="bg-white px-10 py-4 flex items-center max-[768px]:px-4 max-[768px]:py-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
          if (showResults) {
            window.history.pushState({ page: 'home' }, '', '/');
            setShowResults(false);
          }
        }}>
          <img src="/logo.png" alt="SmartCD.ai Logo" className="h-12 w-auto max-[768px]:h-10" />
        </div>
      </header>

      {/* Main Content - Dark Background */}
      <main className="main-content">
        {!showResults ? (
          <>
            <div className="text-center max-w-[900px] mb-[60px] flex flex-col items-center max-[768px]:mb-7">
              <div className="inline-flex items-center gap-2 bg-[rgba(29,141,238,0.1)] border border-[rgba(29,141,238,0.3)] text-[#92C5F9] px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] mb-8 normal-case max-[768px]:mb-[18px]">
                <SparkleIcon className="w-3 h-3 text-[#1D8DEE]" />
                AI Powered Fixed Income Analysis
              </div>

              <div className="border-0 outline-none shadow-none px-10 py-[10px] mb-6 relative max-[768px]:px-0 max-[768px]:py-2 max-[768px]:mb-4">
                <h1 className="text-[3.5rem] font-extrabold leading-[1.15] tracking-[-0.02em] max-[768px]:text-[clamp(1.8rem,8.5vw,2.4rem)] max-[768px]:leading-[1.2] max-[480px]:text-[clamp(1.6rem,9vw,2rem)]">
                  The Only AI That Calculates Your<br className="max-[768px]:hidden" />
                  True <span className="text-green">After-Tax Winner.</span>
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
                        <span className="absolute left-4 text-[#111827] font-semibold pointer-events-none flex items-center">$</span>
                        <input
                          type="number"
                          id="investment_amount"
                          name="investment_amount"
                          value={formData.investment_amount}
                          onChange={handleChange}
                          onBlur={handleFieldBlur}
                          className={`w-full pl-8 pr-4 py-4 text-base font-medium rounded-[8px] border outline-none bg-white text-[#111827] transition-all placeholder:text-[#9CA3AF] placeholder:font-normal appearance-none focus:shadow-[0_0_0_2px_rgba(29,141,238,0.3)] ${investmentAmountError ? 'border-[#FF5252] shadow-[0_0_0_2px_rgba(255,82,82,0.2)]' : 'border-[#E5E7EB]'}`}
                          placeholder="Enter amount ($5,000 minimum)"
                          min="5000"
                          required
                        />
                      </div>
                      {investmentAmountError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{investmentAmountError}</p>}
                    </div>
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="term_length_months" className="text-xs font-semibold text-[#6B7280] capitalize">Duration</label>
                      <StrictSelect
                        name="term_length_months"
                        value={formData.term_length_months}
                        onChange={handleChange}
                        onBlur={handleFieldBlur}
                        options={TERM_LENGTH_OPTIONS}
                        placeholder="Select Duration"
                        hasError={Boolean(termLengthError)}
                        hasSeparators={true}
                      />
                      {termLengthError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{termLengthError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1 max-[640px]:gap-4">
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="state_selection" className="text-xs font-semibold text-[#6B7280] capitalize">State</label>
                      <StateAutocomplete
                        name="state_selection"
                        value={formData.state_selection}
                        onChange={handleChange}
                        onBlur={handleFieldBlur}
                        options={usStates}
                        placeholder="Select or type State"
                        hasError={Boolean(stateSelectionError)}
                      />
                      {stateSelectionError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{stateSelectionError}</p>}
                    </div>
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="city_county" className="text-xs font-semibold text-[#6B7280] capitalize">City / County</label>
                      <SearchableSelect
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
                      />
                      {cityCountyError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{cityCountyError}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1 max-[640px]:gap-4">
                    <div className="flex flex-col gap-2.5 relative">
                      <label htmlFor="income_range" className="text-xs font-semibold text-[#6B7280] capitalize">Annual Income Range</label>
                      <StrictSelect
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
                      <StrictSelect
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
                    <button type="submit" className="flex items-center justify-center gap-3 w-full max-w-[500px] px-4 py-4 text-base font-bold tracking-[0.02em] text-white bg-[linear-gradient(90deg,#1C74E9_0%,#15B0F8_100%)] border-0 rounded-full cursor-pointer transition-all shadow-[0_10px_20px_-5px_rgba(29,141,238,0.4)] [&:not(:disabled):hover]:-translate-y-0.5 [&:not(:disabled):hover]:shadow-[0_14px_24px_-5px_rgba(29,141,238,0.5)] [&:not(:disabled):active]:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed max-[768px]:max-w-full" disabled={loading || !isFormValid}>
                      <SparkleIcon className="w-4 h-4" />
                      {loading ? "Submitting..." : "FIND BEST YIELDS"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-auto w-full max-w-[1100px]">
            <div className="mb-6 flex items-start justify-between max-[768px]:mb-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3">
              <div>
                <h1 className="mb-1.5 text-2xl font-bold text-white max-[768px]:text-[1.2rem] max-[768px]:leading-[1.3]">All Products - Ranked by After-Tax Yield</h1>
                <h2 className="m-0 text-base font-medium text-[#6B7280] max-[768px]:text-[0.9rem] max-[768px]:leading-[1.4]">Compare all CDs with the best after-tax yields for your situation</h2>
              </div>
              <div className="grid overflow-hidden rounded-[8px] bg-[#0F172A] max-[768px]:w-full max-[768px]:grid-cols-2 md:flex">
                <button className={`cursor-pointer border-none px-4 py-2 text-[0.85rem] font-semibold transition-all max-[768px]:min-h-11 max-[768px]:py-3 ${viewMode === 'combined' ? 'bg-[#22C55E] text-white' : 'bg-transparent text-[#9CA3AF]'}`} onClick={() => setViewMode('combined')}>Combined View</button>
                <button className={`cursor-pointer border-none px-4 py-2 text-[0.85rem] font-semibold transition-all max-[768px]:min-h-11 max-[768px]:py-3 ${viewMode === 'grouped' ? 'bg-[#22C55E] text-white' : 'bg-transparent text-[#9CA3AF]'}`} onClick={() => setViewMode('grouped')}>Group By Type</button>
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

              <div className="overflow-hidden rounded-2xl border border-[#1D8DEE] bg-[#081329] shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-[768px]:overflow-visible max-[768px]:rounded-xl">
              {/* Mobile sort controls */}
              <div className="flex items-center justify-between gap-2 border-b border-[#1E293B] bg-[#0A1429] px-[14px] py-3 md:hidden">
                <div className="text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#94A3B8]">Sort</div>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-[#1A3050] bg-[#0D1B2D] px-2 py-2 text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#E2E8F0]"
                    onClick={() => toggleSort('nominalRate')}
                  >
                    Nominal <SortIcon active={sortColumn === 'nominalRate'} direction={sortDirection} />
                  </button>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-[#1A3050] bg-[#0D1B2D] px-2 py-2 text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#E2E8F0]"
                    onClick={() => toggleSort('afterTaxYield')}
                  >
                    After-Tax <SortIcon active={sortColumn === 'afterTaxYield'} direction={sortDirection} />
                  </button>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-[#1A3050] bg-[#0D1B2D] px-2 py-2 text-[0.72rem] font-bold uppercase tracking-[0.05em] text-[#E2E8F0]"
                    onClick={() => toggleSort('minDeposit')}
                  >
                    Deposit <SortIcon active={sortColumn === 'minDeposit'} direction={sortDirection} />
                  </button>
                </div>
              </div>

              <div className={`hidden border-b border-[#1E293B] bg-[#0A1429] md:grid md:gap-4 ${viewMode === 'combined' ? 'md:grid-cols-[minmax(220px,2.05fr)_minmax(145px,1.12fr)_minmax(118px,0.9fr)_minmax(150px,1.02fr)_minmax(130px,0.9fr)_220px]' : 'md:grid-cols-[minmax(220px,2.2fr)_minmax(118px,0.95fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_220px]'}`}>
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
                        <div className="border-y border-[#1E293B] bg-[#0A1429] px-6 py-4 text-[0.9rem] font-bold text-[#E2E8F0] max-[768px]:px-[14px] max-[768px]:py-3 max-[768px]:text-[0.82rem]">Bank CDs</div>
                        {sortResults(filtered.filter(r => r.productType === 'Bank CDs')).map(r => renderResultCard(r, false))}

                        <div className="mt-8 border-y border-[#1E293B] bg-[#0A1429] px-6 py-4 text-[0.9rem] font-bold text-[#E2E8F0] max-[768px]:px-[14px] max-[768px]:py-3 max-[768px]:text-[0.82rem]">Brokerage CDs</div>
                        {sortResults(filtered.filter(r => r.productType === 'Brokerage CDs')).map(r => renderResultCard(r, false))}

                        <div className="mt-8 border-y border-[#1E293B] bg-[#0A1429] px-6 py-4 text-[0.9rem] font-bold text-[#E2E8F0] max-[768px]:px-[14px] max-[768px]:py-3 max-[768px]:text-[0.82rem]">US Treasury</div>
                        {sortResults(filtered.filter(r => r.productType === 'Treasuries')).map(r => renderResultCard(r, false))}
                      </>
                    );
                  }
                })()}
              </div>
            </div>
            <AIAssistant rankResponse={rankResponse} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`mt-auto flex w-full flex-col items-center justify-center gap-2 ${showResults ? 'bg-[radial-gradient(circle,#243C6B_0%,#1E2941_100%)] px-5 py-10 max-[768px]:px-[14px] max-[768px]:py-[22px]' : 'border-t border-[#E5E7EB] bg-white px-16 pt-8 pb-6 max-[768px]:px-[14px] max-[768px]:pt-[22px] max-[768px]:pb-[22px]'}`}>
        <div className={`text-[0.8rem] font-medium ${showResults ? 'text-[rgba(255,255,255,0.8)]' : 'text-[#717182]'}`}>Last updated: January 2026</div>
        <div className={`mb-2 text-[0.85rem] font-semibold ${showResults ? 'text-[rgba(255,255,255,0.8)]' : 'text-[#717182]'}`}>
          © 2026 SmartCD.ai - All Rights Reserved
        </div>
        <div className={`max-w-[1000px] text-center text-[0.75rem] font-medium leading-[1.5] ${showResults ? 'text-[rgba(255,255,255,0.8)]' : 'text-[#717182] opacity-80'}`}>
          SmartCD.AI is an AI-powered aggregator of publicly available information. Annual Percentage Yields (APY) are subject to change without notice. Minimum deposit requirements and regional availability may apply. This tool provides information for educational purposes only and does not constitute investment, financial, tax, or legal advice. Always verify rates directly with the financial institution before making investment decisions.
        </div>
      </footer>
    </div>
  );
}
