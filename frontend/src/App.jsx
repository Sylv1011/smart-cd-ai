import React, { useState, useEffect } from 'react';
import './styles.css';
import { locationData } from './utils/locationData';
import { usStates } from './utils/statesData';
import AIAssistant from './AIAssistant';
import SearchableSelect from './components/SearchableSelect';
import StrictSelect from './components/StrictSelect';

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
  <svg className={className} onClick={onClick} style={{ cursor: 'pointer' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const STATE_TO_CODE = {
  California: 'CA',
  Texas: 'TX',
  Florida: 'FL',
  'New York': 'NY',
  Illinois: 'IL',
};

const normalizeIncomeRangeForRanker = (value) => {
  const v = (value || '').trim();
  const map = {
    'less than $25,000': '<$25,000',
    '$25,000 - $35,000': '$25,000 - $50,000',
    '$35,000 - $50,000': '$25,000 - $50,000',
    '$50,000 - $75,000': '$50,000 - $75,000',
    '$75,000 - $100,000': '$75,000 - $100,000',
    '$100,000 - $150,000': '$100,000 - $150,000',
    '$150,000 - $200,000': '$150,000 - $200,000',
    '$200,000 - $250,000': '$200,000+',
    '$250,000 above': '$200,000+',
  };
  return map[v] || v;
};

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

  const topPickKey = overallTop[0]?.destination_url || overallTop[0]?.source_url || null;

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

    const linkKey = o?.destination_url || o?.source_url || '';
    const idBase = `${productType}-${provider}-${o?.term_months ?? ''}-${o?.apy_nominal ?? ''}-${linkKey}`;

    return {
      id: idBase,
      provider,
      institutionType: toInstitutionType(productType, o),
      productType,
      nominalRate: Number(o?.apy_nominal ?? 0),
      afterTaxYield: Number(o?.after_tax_apy ?? 0),
      minDeposit: Number(o?.minimum_deposit ?? 0),
      isTopPick: topPickKey && (o?.destination_url === topPickKey || o?.source_url === topPickKey),
      taxBreakdown: {
        federalBracket: fedTax > 0 ? `-${formatMoney(fedTax)}` : '$0.00',
        stateTax: stateTax > 0 ? `-${formatMoney(stateTax)}` : '$0.00',
        localOswego: localTax > 0 ? `-${formatMoney(localTax)}` : '$0.00',
      },
      netReturn: formatMoney(Number(o?.after_tax_interest_usd ?? 0)),
      whyThisFits: toWhyThisFits(productType),
      matchPercentage: 0,
    };
  };

  return [...bank, ...brokered, ...treasuries].map(mapOffer);
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [rankResponse, setRankResponse] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showResults, setShowResults] = useState(window.location.pathname === '/results');
  const [viewMode, setViewMode] = useState('combined');
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [productTypeFilter, setProductTypeFilter] = useState('All products');
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (cardId, section) => {
    setExpandedSections(prev => {
      const cardSections = prev[cardId] || { tax: true, fit: true };
      return {
        ...prev,
        [cardId]: {
          ...cardSections,
          [section]: !cardSections[section]
        }
      };
    });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'state_selection') {
      const availableCities = locationData[value] || [];
      setFormData({
        ...formData,
        [name]: value,
        city_county: ''
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    const amt = parseFloat(formData.investment_amount);
    const isAmtInvalid = !formData.investment_amount || isNaN(amt) || amt < 5000;
    const isFilingInvalid = !formData.tax_filing_status;

    if (isAmtInvalid ||
      !formData.term_length_months ||
      !formData.income_range ||
      !formData.state_selection ||
      !formData.city_county ||
      isFilingInvalid ||
      !termsAgreed) {
      setShowErrors(true);
      setError("Please enter at least $5,000 and complete all selections.");
      return;
    }

    setShowErrors(false);
    setLoading(true);
    setError(null);

    try {
      const rankBase =
        import.meta.env.VITE_RANKING_API_URL ||
        import.meta.env.VITE_API_URL ||
        'http://localhost:8001';

      const rankRequest = {
        investment_amount: amt,
        term_months: parseTermToMonths(formData.term_length_months),
        state: STATE_TO_CODE[formData.state_selection] || formData.state_selection,
        income_range: normalizeIncomeRangeForRanker(formData.income_range),
        filing_status: normalizeFilingStatusForRanker(formData.tax_filing_status),
        local_area: formData.city_county || null,
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
      setRankResponse(payload);
      setResults(adaptRankResponseToUiResults(payload));

      window.history.pushState({ page: 'results' }, '', '/results');
      setShowResults(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message || 'Unable to fetch results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderResultCard = (result, showProductType = false) => {
    const isExpanded = expandedCardId === result.id;
    const toggleExpand = () => setExpandedCardId(isExpanded ? null : result.id);

    return (
      <div key={result.id} className="result-card">
        <div className={`result-row ${isExpanded ? 'expanded' : ''} ${result.isTopPick ? 'top-pick-row' : ''}`}>
          <div className="col-provider">
            {result.isTopPick && <div className="top-pick-badge">★ TOP PICK</div>}
            <div className="provider-info">
              <div className="provider-logo">{result.provider.substring(0, 2).toUpperCase()}</div>
              <div>
                <div className="provider-name">{result.provider}</div>
                <div className="institution-type">{result.institutionType}</div>
              </div>
            </div>
          </div>
          {showProductType && <div className="col-type">{result.productType}</div>}
          <div className="col-rate">{result.nominalRate.toFixed(2)} <span className="percent-sign">%</span></div>
          <div className="col-yield text-green">{result.afterTaxYield.toFixed(2)} <span className="percent-sign text-green">%</span></div>
          <div className="col-deposit">${result.minDeposit.toLocaleString()}</div>
          <div className="col-action">
            <button className={`details-btn ${result.isTopPick ? 'btn-green' : 'btn-white'}`} onClick={toggleExpand}>
              Details <ExternalLinkIcon className="btn-icon-right" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="expanded-details-container">
            <div className="details-grid">
              <div className="tax-breakdown-section">
                <div className="details-header" onClick={() => toggleSection(result.id, 'tax')}>
                  <h4>Road Tax Breakdown</h4>
                  {expandedSections[result.id]?.tax !== false ? (
                    <ChevronUpIcon className="details-chevron" />
                  ) : (
                    <ChevronDownIcon className="details-chevron" />
                  )}
                </div>
                {(expandedSections[result.id]?.tax !== false) && (
                  <div className="tax-breakdown-content">
                    <div className="tax-row">
                      <span className="tax-label">Federal Bracket :</span>
                      <span className="tax-value text-blue">{result.taxBreakdown.federalBracket}</span>
                    </div>
                    <div className="tax-row">
                      <span className="tax-label">State Tax :</span>
                      <span className="tax-value text-green-value">{result.taxBreakdown.stateTax}</span>
                    </div>
                    <div className="tax-row">
                      <span className="tax-label">Local Oswego :</span>
                      <span className="tax-value text-blue">{result.taxBreakdown.localOswego}</span>
                    </div>
                    <div className="tax-divider"></div>
                    <div className="tax-row net-return-row">
                      <span className="tax-label">Net Return :</span>
                      <span className="tax-value text-green-value">{result.netReturn}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="fit-description-section">
                <div className="details-header" onClick={() => toggleSection(result.id, 'fit')}>
                  <h4>Why this fits</h4>
                  <div className="match-score text-green">{result.matchPercentage} % Match</div>
                  {expandedSections[result.id]?.fit !== false ? (
                    <ChevronUpIcon className="details-chevron" />
                  ) : (
                    <ChevronDownIcon className="details-chevron" />
                  )}
                </div>
                {(expandedSections[result.id]?.fit !== false) && (
                  <p className="fit-text">
                    {result.whyThisFits}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const isAmtValid = formData.investment_amount && !isNaN(parseFloat(formData.investment_amount)) && parseFloat(formData.investment_amount) >= 5000;
  const isFormValid = isAmtValid &&
    formData.term_length_months &&
    formData.income_range &&
    formData.state_selection &&
    formData.city_county &&
    formData.tax_filing_status &&
    termsAgreed;

  const safeResults = Array.isArray(results) ? results : [];

  return (
    <div className="layout">
      {showPrivacy && (
        <div className="privacy-modal-overlay">
          <div className="privacy-modal-content">

            <div className="modal-scroll-area">
              <div className="modal-inner">
                {/* Logo Section */}
                <div className="modal-top-logo-container">
                  <img src="/logo.png" alt="SmartCD.AI Logo" className="modal-top-logo" />
                  <div className="modal-back-link" onClick={() => setShowPrivacy(false)}>
                    BACK
                  </div>
                </div>

                {/* Privacy Notice Section */}
                <div className="modal-header-container">
                  <div className="modal-icon-wrapper text-blue">
                    <LockIcon className="modal-section-icon" />
                  </div>
                  <h2 className="modal-section-title text-blue">Privacy Notice</h2>
                </div>

                <p className="modal-text-bold" style={{ fontWeight: 400 }}>SmartCD.AI respects your privacy.</p>
                <p className="modal-text">We may collect basic information you provide (such as income range, filing status, and residential state and city) to generate personalized CD and Treasury comparisons. We also collect limited usage data (like browser type and page visits) to improve our product.</p>

                <div className="modal-info-box">
                  <ShieldCheckIcon className="modal-info-icon" />
                  <span><strong>We do not collect Social Security numbers or bank account credentials. We do not sell your personal information.</strong></span>
                </div>

                <p className="modal-text">Your data is used only to provide recommendations and improve our AI models.</p>
                <p className="modal-text">By continuing to use SmartCD.AI, you agree to this Privacy Notice.</p>

                <hr className="modal-divider" />

                {/* Terms of Service Section */}
                <div className="modal-header-container">
                  <div className="modal-icon-wrapper text-blue">
                    <DocumentIcon className="modal-section-icon" />
                  </div>
                  <h2 className="modal-section-title text-blue">Terms of Service</h2>
                </div>

                <p className="modal-text-bold mb-4">By using SmartCD.AI, you agree to the following terms:</p>

                <div className="terms-grid">
                  <div className="term-item">
                    <div className="term-pill"><span className="dot dot-blue"></span> Informational Use Only</div>
                    <p className="modal-text-sm">SmartCD.AI provides CD, brokerage CD, and Treasury comparisons for informational purposes only. We do not provide financial, investment, tax, or legal advice.</p>
                  </div>

                  <div className="term-item">
                    <div className="term-pill"><span className="dot dot-blue"></span> No Guarantees</div>
                    <p className="modal-text-sm">Rates, yields, and tax estimates are based on available data and assumptions. We do not guarantee accuracy, completeness, or future performance.</p>
                  </div>

                  <div className="term-item">
                    <div className="term-pill"><span className="dot dot-blue"></span> User Responsibility</div>
                    <p className="modal-text-sm">You are responsible for verifying product terms directly with financial institutions before making investment decisions.</p>
                  </div>

                  <div className="term-item">
                    <div className="term-pill"><span className="dot dot-blue"></span> Acceptable Use</div>
                    <p className="modal-text-sm">You agree not to misuse, copy, scrape, reverse engineer, or disrupt the platform in any way.</p>
                  </div>

                  <div className="term-item">
                    <div className="term-pill"><span className="dot dot-yellow"></span> Limitation of Liability</div>
                    <p className="modal-text-sm">SmartCD.AI is not liable for investment decisions, financial losses, or damages arising from use of this service.</p>
                  </div>

                  <div className="term-item">
                    <div className="term-pill"><span className="dot dot-blue"></span> Updates</div>
                    <p className="modal-text-sm">We may update these terms at any time. Continued use of SmartCD.AI means you accept the updated terms.</p>
                  </div>
                </div>
              </div>
              
              <footer className="footer-dark">
                <div className="footer-dark-disclaimer">
                  SmartCD.AI is an AI-powered aggregator of publicly available information. Annual Percentage Yields (APY) are subject to change without notice. Minimum deposit requirements and regional availability may apply. This tool provides information for educational purposes only and does not constitute investment, financial, tax, or legal advice. Always verify rates directly with the financial institution before making investment decisions.
                </div>
                <div className="footer-dark-bottom-bar">
                  <div className="footer-dark-last-updated">Last updated: January 2026</div>
                  <div className="footer-dark-copyright">© 2026 SmartCD.ai - All Rights Reserved</div>
                  <div className="footer-dark-links">
                    Privacy Policy · Terms of Service
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}

      {/* Header - Light Background */}
      <header className="header">
        <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => {
          if (showResults) {
            window.history.pushState({ page: 'home' }, '', '/');
            setShowResults(false);
          }
        }}>
          <img src="/logo.png" alt="SmartCD.ai Logo" className="logo-image" />
        </div>
      </header>

      {/* Main Content - Dark Background */}
      <main className="main-content">
        {!showResults ? (
          <>
            <div className="hero-section">
              <div className="badge-primary">
                <SparkleIcon className="badge-icon-blue" />
                AI Powered Fixed Income Analysis
              </div>

              <div className="title-box">
                <h1 className="hero-title">
                  The Only AI That Calculates Your<br />
                  True <span className="text-green">After-Tax Winner.</span>
                </h1>
              </div>

              <p className="hero-subtitle">
                Our AI scans thousands of CDs and Treasuries to find your optimal investment —<br />
                automatically factoring in state tax exemptions to reveal the true after-tax winner.
              </p>

              <div className="feature-pills">
                <div className="pill"><LockIcon className="pill-icon text-yellow" /> Secure</div>
                <div className="pill"><SparkleIcon className="pill-icon text-white" /> AI Powered</div>
                <div className="pill"><ShieldCheckIcon className="pill-icon text-cyan" /> Tax Aware</div>
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

                {error && <div style={{ color: '#FF5252', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <form className="preferences-form" onSubmit={handleSearch}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="investment_amount">Cash Amount</label>
                      <div className="input-wrapper">
                        <span className="input-prefix text-dark">$</span>
                        <input
                          type="number"
                          id="investment_amount"
                          name="investment_amount"
                          value={formData.investment_amount}
                          onChange={handleChange}
                          className={`custom-input dark-theme-input ${showErrors && (!formData.investment_amount || parseFloat(formData.investment_amount) < 5000) ? 'error-border' : ''}`}
                          placeholder="Enter amount ($5,000 minimum)"
                          min="5000"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="term_length_months">Duration</label>
                      <StrictSelect
                        name="term_length_months"
                        value={formData.term_length_months}
                        onChange={handleChange}
                        options={[
                          "3 Month",
                          "6 Month",
                          "9 Month",
                          "12 Month",
                          "15 Month",
                          "18 Month",
                          "24 Month",
                          "30 Month",
                          "3 Year",
                          "4 Year",
                          "5 Year and Above"
                        ]}
                        placeholder="Select Duration"
                        hasError={showErrors && !formData.term_length_months}
                        hasSeparators={true}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="state_selection">State</label>
                      <SearchableSelect
                        name="state_selection"
                        value={formData.state_selection}
                        onChange={handleChange}
                        options={usStates}
                        placeholder="Select or type State"
                        hasError={showErrors && !formData.state_selection}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="city_county">City / County</label>
                      <SearchableSelect
                        name="city_county"
                        value={formData.city_county}
                        onChange={handleChange}
                        options={
                          formData.state_selection 
                            ? (locationData[formData.state_selection] || []) 
                            : Object.values(locationData).flat()
                        }
                        placeholder="Select or type City/County"
                        hasError={showErrors && !formData.city_county}
                        disabled={false}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="income_range">Annual Income Range</label>
                      <StrictSelect
                        name="income_range"
                        value={formData.income_range}
                        onChange={handleChange}
                        options={[
                          "less than $25,000",
                          "$25,000 - $35,000",
                          "$35,000 - $50,000",
                          "$50,000 - $75,000",
                          "$75,000 - $100,000",
                          "$100,000 - $150,000",
                          "$150,000 - $200,000",
                          "$200,000 - $250,000",
                          "$250,000 above"
                        ]}
                        placeholder="Select Income Range"
                        hasError={showErrors && !formData.income_range}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="tax_filing_status">Tax Filing Status</label>
                      <StrictSelect
                        name="tax_filing_status"
                        value={formData.tax_filing_status}
                        onChange={handleChange}
                        options={[
                          "Single",
                          "Married Filing Jointly (includes Qualifying Surviving Spouse)",
                          "Married Filing Separately",
                          "Head of Household"
                        ]}
                        placeholder="Select Filing Status"
                        hasError={showErrors && !formData.tax_filing_status}
                      />
                    </div>
                  </div>

                  <div className="terms-checkbox-container">
                    <label className="terms-label">
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="terms-checkbox"
                      />
                      <span className="terms-text">
                        By continuing to use SmartCD.AI, you agree to our{' '}
                        <u onClick={() => setShowPrivacy(true)}>Privacy Policy and Terms of Service</u>.
                      </span>
                    </label>
                  </div>

                  <div className="button-container">
                    <button type="submit" className="submit-button" disabled={loading || !isFormValid}>
                      <SparkleIcon className="button-icon-small" />
                      {loading ? "Submitting..." : "FIND BEST YIELDS"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="results-page">
            <div className="results-header-container">
              <div>
                <h1 className="results-main-title">All Products - Ranked by After-Tax Yield</h1>
                <h2 className="results-page-title">Compare all CDs with the best after-tax yields for your situation</h2>
              </div>
              <div className="toggle-group">
                <button className={`toggle-btn ${viewMode === 'combined' ? 'active' : ''}`} onClick={() => setViewMode('combined')}>Combined View</button>
                <button className={`toggle-btn ${viewMode === 'grouped' ? 'active' : ''}`} onClick={() => setViewMode('grouped')}>Group By Type</button>
              </div>
            </div>

            <div className="filters-bar">
              <div className="filter-item">
                <label className="filter-label" style={{ fontWeight: '600', textTransform: 'none' }}><FilterIcon className="filter-icon" /> Filter by type</label>
                <div className="select-wrapper">
                  <select 
                    className="filter-select dark-theme-input" 
                    style={{ backgroundColor: '#0D1B2D', border: '1px solid #1A3050', color: '#FFFFFF', fontWeight: '400', fontSize: '16px' }}
                    value={productTypeFilter}
                    onChange={(e) => setProductTypeFilter(e.target.value)}
                  >
                    <option value="All products">All products ({safeResults.length})</option>
                    <option value="Bank CDs">Bank CDs</option>
                    <option value="Brokerage CDs">Brokerage CDs</option>
                    <option value="Treasuries">US Treasuries</option>
                  </select>
                </div>
              </div>
              <div className="filter-item">
                <label className="filter-label" style={{ fontWeight: '600', textTransform: 'none' }}><ClockIcon className="filter-icon" /> Duration</label>
                <div className="strict-select-filter-border">
                  <StrictSelect
                    name="term_length_months"
                    value={formData.term_length_months}
                    onChange={handleChange}
                    options={[
                      "3 Month",
                      "6 Month",
                      "9 Month",
                      "12 Month",
                      "15 Month",
                      "18 Month",
                      "24 Month",
                      "30 Month",
                      "3 Year",
                      "4 Year",
                      "5 Year and Above"
                    ]}
                    placeholder="Select Duration"
                    hasSeparators={true}
                    theme="dark"
                  />
                </div>
              </div>
            </div>

            <div className="results-table-container">
              <div className="table-header">
                <div className="col-provider">PROVIDER / INSTITUTION</div>
                {viewMode === 'grouped' && <div className="col-type">PRODUCT TYPE</div>}
                <div className="col-rate">NOMINAL RATE</div>
                <div className="col-yield">AFTER TAX YIELD</div>
                <div className="col-deposit">MIN. DEPOSIT</div>
                <div className="col-action">ACTION</div>
              </div>
              <div className="table-body">
                {(() => {
                  const filtered = safeResults.filter(r => 
                    productTypeFilter === 'All products' || r.productType === productTypeFilter
                  );

                  if (viewMode === 'combined') {
                    return filtered.sort((a, b) => b.afterTaxYield - a.afterTaxYield).map(r => renderResultCard(r, false));
                  } else {
                    return (
                      <>
                        <div className="group-header">Bank CDs</div>
                        {filtered.filter(r => r.productType === 'Bank CDs').sort((a, b) => b.afterTaxYield - a.afterTaxYield).map(r => renderResultCard(r, true))}

                        <div className="group-header mt-8">Brokerage CDs</div>
                        {filtered.filter(r => r.productType === 'Brokerage CDs').sort((a, b) => b.afterTaxYield - a.afterTaxYield).map(r => renderResultCard(r, true))}

                        <div className="group-header mt-8">US Treasury</div>
                        {filtered.filter(r => r.productType === 'Treasuries').sort((a, b) => b.afterTaxYield - a.afterTaxYield).map(r => renderResultCard(r, true))}
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
      <footer className={showResults ? "results-footer" : "footer-light"}>
        <div className="footer-light-last-updated">Last updated: January 2026</div>
        <div className="footer-light-copyright">
          © 2026 SmartCD.ai - All Rights Reserved
        </div>
        <div className="footer-light-disclaimer">
          SmartCD.AI is an AI-powered aggregator of publicly available information. Annual Percentage Yields (APY) are subject to change without notice. Minimum deposit requirements and regional availability may apply. This tool provides information for educational purposes only and does not constitute investment, financial, tax, or legal advice. Always verify rates directly with the financial institution before making investment decisions.
        </div>
      </footer>
    </div>
  );
}
