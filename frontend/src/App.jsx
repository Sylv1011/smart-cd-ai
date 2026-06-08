import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { locationData } from './utils/locationData';
import { usStates } from './utils/statesData';
import { stateNameToCode } from './utils/stateCodes';
import AIAssistant from './AIAssistant';
import SearchableSelect from './components/SearchableSelect';
import StrictSelect from './components/StrictSelect';
import StateAutocomplete from './components/StateAutocomplete';
import BankBadge from './components/BankBadge';
import BulletStrategyMockup from './components/BulletStrategyMockup';
import BarbellTab from './components/BarbellTab';
import {SparkleIcon, LockIcon, SolidLockIcon, DocumentIcon, CloseIcon, ShieldCheckIcon, 
        ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, SortIcon, FilterIcon, HeaderSearchIcon, 
        ClockIcon, ExternalLinkIcon, StrategyTabIcon, SunIcon, MoonIcon} from './components/Icons/index';
import PrivacyOverlay from './components/PrivacyOverlay';
import CD_header from './components/CD_header';
import Footer from './components/Footer';
import Search_SC from './components/Screens/Search_SC';
import RenderResultCard from './components/RenderResultCard';
import Main_Header from './components/Main_Header';


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
  const [bulletLoading, setBulletLoading] = useState(false);
  const [barbellLoading, setBarbellLoading] = useState(false);
  const [bulletError, setBulletError] = useState(null);
  const [barbellError, setBarbellError] = useState(null);
  const [bulletAlternativesByTranche, setBulletAlternativesByTranche] = useState({});
  const [bulletControls, setBulletControls] = useState({ term: '12 months', amount: '20000' });
  const [barbellControls, setBarbellControls] = useState({ amount: '20000', split: 50 });
  const aiBase = import.meta.env.VITE_AI_LAYER_URL;
  const [showPrivacy, setShowPrivacy] = useState(false);
  const THEME_STORAGE_KEY = 'smartcd:theme:v1';
  const [showResults, setShowResults] = useState(window.location.pathname === '/results');
  const [viewMode, setViewMode] = useState('combined');
  const [strategyView, setStrategyView] = useState('best-rate');
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
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

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

  const persistLastSearch = (nextFormData, options = {}) => {
    try {
      let existing = null;
      try {
        existing = JSON.parse(window.localStorage.getItem(LAST_SEARCH_STORAGE_KEY) || 'null');
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
      window.localStorage.setItem(LAST_SEARCH_STORAGE_KEY, JSON.stringify(payload));
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
        window.history.pushState({ page: 'results' }, '', '/results');
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

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.detail || 'Failed to fetch bullet simulation.');
      }

      const simulationPayload = await response.json();
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
          if (rankRes.ok) {
            const rankPayload = await rankRes.json();
            altMap[String(t?.tranche)] = Array.isArray(rankPayload?.overall_top) ? rankPayload.overall_top : [];
          } else {
            altMap[String(t?.tranche)] = [];
          }
        } catch {
          altMap[String(t?.tranche)] = [];
        }
      }
      setBulletAlternativesByTranche(altMap);
    } catch (err) {
      setBulletError(err.message || 'Unable to fetch bullet simulation.');
      setBulletAlternativesByTranche({});
    } finally {
      if (!silent) {
        setBulletLoading(false);
      }
    }
  };

  const fetchBarbellSimulation = async (nextFormData, options = {}) => {
    const effectiveControls = {
      amount:
        String(options?.controlsOverride?.amount || barbellControls.amount || nextFormData.investment_amount || '')
          .replace(/[^0-9.]/g, '') || '20000',
      split: Number(options?.controlsOverride?.split ?? barbellControls.split ?? 50),
    };
    
    const rankBase =
      import.meta.env.VITE_RANKING_API_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:8001';

    
    const termMonths = parseTermToMonths(nextFormData.term_length_months);
    
    const payload = {
      strategy_type: 'barbell',
      investment_amount:
        parseFloat(effectiveControls.amount) || parseFloat(nextFormData.investment_amount),
      state: nextFormData.state_selection,
      income_range: nextFormData.income_range,
      filing_status: normalizeFilingStatusForRanker(nextFormData.tax_filing_status),
      local_area: nextFormData.city_county || null,
      time_horizon: String(Math.round((termMonths / 12) * 10) / 10),
      target_maturity_months: termMonths,
      short_term_percentage: effectiveControls.split,
    };

    setBarbellLoading(true);
    setBarbellError(null);
    try{
      const response = await fetch(`${rankBase}/strategies/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.detail || 'Failed to fetch barbell simulation.');
      }
      const simulationPayload = await response.json();
      
      
      setBarbellSimulation(simulationPayload);
      setBarbellControls({
        amount: effectiveControls.amount,
        split: Number(simulationPayload?.selected_split?.short_term_percentage ?? effectiveControls.split),
      });
     
    } catch (err) {
      console.error('Error fetching barbell simulation:', err);
      setBarbellError(err.message || 'Unable to fetch barbell simulation.');
    } finally {
      setBarbellLoading(false);
    }

  }



  const getAllowedAreas = (stateSelection) => {
        const state = (stateSelection || '').trim();
        return state ? (locationData[state] || []) : [];
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
     setStrategyView(tabId);
     if (tabId === 'bullet' && canAutoRefreshRank(formData)) {
     const syncedControls = {
      term: toBulletTermLabel(formData.term_length_months),
      amount:
        String(formData.investment_amount || '').replace(/[^0-9]/g, '') ||
        '20000',
    };

    setBulletControls(syncedControls);

    fetchBulletSimulation(formData, {
      silent: false,
      controlsOverride: syncedControls,
    });
  }

  if (tabId === 'barbell' && canAutoRefreshRank(formData)) {
    const syncedControls = {
      amount:
        String(formData.investment_amount || '').replace(/[^0-9]/g, '') ||
        barbellControls.amount ||
        '20000',
      split: Number(barbellControls.split ?? 50),
    };

    setBarbellControls(syncedControls);
    fetchBarbellSimulation(formData, { controlsOverride: syncedControls });
  }
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

    const redirectToSearch = (message) => {
      window.history.replaceState({ page: 'home' }, '', '/?error=missing_inputs');
      setShowResults(false);
      setError(message || 'No results available. Please enter your criteria first.');
      didRestoreRef.current = true;
    };

    let saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(LAST_SEARCH_STORAGE_KEY) || 'null');
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
    if (!showResults || (strategyView !== 'bullet' && strategyView !== 'barbell')) return;
    if (!canAutoRefreshRank(formData)) return;

    if(strategyView === 'bullet'){
      fetchBulletSimulation(formData, { silent: false });
      
    }
    if(strategyView === 'barbell'){
      fetchBarbellSimulation(formData);
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
    bulletControls.term,
    bulletControls.amount,
    barbellControls.amount,
    barbellControls.split,
  ]);

  const handleSearchChange = (e) =>{
    return fetchRankResults(e, { navigateToResults: true, scrollToTop: true });
  }

  const safeResults = Array.isArray(results) ? results : [];
  const showBulletStrategyMockup = false;

  const navigateToHome = () => {
    window.history.pushState({ page: 'home' }, '', '/');
    setShowResults(false);
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
       <PrivacyOverlay
          showPrivacy={showPrivacy}
          setShowPrivacy={setShowPrivacy}
       />
      )}

      {/* Header - Dark Background */}
      <CD_header theme={theme} setTheme={setTheme} onLogoClick={navigateToHome} />

      {/* Main Content - Dark Background */}
      <main className="main-content">
        {showBulletStrategyMockup ? (
          <BulletStrategyMockup />
        ) : !showResults ? (
          <Search_SC onFetchRank={fetchRankResults} loading={loading} setShowPrivacy={setShowPrivacy} showResults={showResults} formData={formData} setFormData={setFormData} />
        ) : (
          <div className="mx-auto w-full max-w-[1288px]">
            <Main_Header strategyView={strategyView} handleTabChange={handleTabChange} />
            {strategyView === 'bullet' ? (
              <>
                <BulletStrategyMockup
                  embedded
                  hideTitle
                  initialTerm={bulletControls.term}
                  initialAmount={bulletControls.amount}
                  simulationData={bulletSimulation}
                  alternativesByTranche={bulletAlternativesByTranche}
                  simulationLoading={bulletLoading}
                  simulationError={bulletError}
                  onExportPdf={() => window.print()}
                  onControlsChange={(controls) => {
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
            ) : strategyView === 'barbell' ? (
              <>
              
                <BarbellTab
                  embedded
                  initialTerm={toBulletTermLabel(formData.term_length_months)}
                  initialAmount={barbellControls.amount}
                  initialSplit={barbellControls.split}
                  simulationData={barbellSimulation}
                  simulationLoading={barbellLoading}
                  simulationError={barbellError}
                  onControlsChange={(controls) => {
                    setBarbellControls((prev) => {
                      const next = {
                        amount: controls?.amount || prev.amount,
                        split: Number(controls?.split ?? prev.split),
                      };
                      if (next.amount === prev.amount && next.split === prev.split) {
                        return prev;
                      }
                      return next;
                    });
                  }}
                />
              </>
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
                    onChange={handleSearchChange}
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
                    return sorted.map(r => <RenderResultCard 
                                              key={r.id} 
                                              result={r} 
                                              showProductType={true} 
                                              expandedCardId={expandedCardId}
                                              setExpandedCardId={setExpandedCardId}
                                              whyThisFitsLoading={whyThisFitsLoading}
                                              setWhyThisFitsLoading={setWhyThisFitsLoading}
                                              whyThisFitsExpanded={whyThisFitsExpanded}
                                              setWhyThisFitsExpanded={setWhyThisFitsExpanded}
                                              whyThisFitsOverrides={whyThisFitsOverrides}
                                              setWhyThisFitsOverrides={setWhyThisFitsOverrides}
                                              whyThisFitsFetched={whyThisFitsFetched}
                                              setWhyThisFitsFetched={setWhyThisFitsFetched}
                                              />);
                  } else {
                    return (
                      <>
                        {/*TODO: Update the RenderResultCard component */}
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
            
              </>
            )}
            <AIAssistant rankResponse={rankResponse} />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer showResults={showResults}/>
    </div>
  );
}
