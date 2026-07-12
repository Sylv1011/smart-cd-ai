import React, { useEffect, useMemo, useRef, useState } from 'react';
import BankBadge from './BankBadge';

const SparkleIcon = ({ className = '' }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 0L9.44444 6.55556L16 8L9.44444 9.44444L8 16L6.55556 9.44444L0 8L6.55556 6.55556L8 0Z" fill="currentColor" />
  </svg>
);

const ChevronDownIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ExternalLinkIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </svg>
);

const DocumentIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </svg>
);

const InfoIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" />
    <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const BellIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M12 3a5 5 0 0 0-5 5v2.1c0 .8-.3 1.6-.8 2.2L4.7 14a1 1 0 0 0 .7 1.7h13.2a1 1 0 0 0 .7-1.7l-1.5-1.7a3.3 3.3 0 0 1-.8-2.2V8a5 5 0 0 0-5-5Z" />
    <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
  </svg>
);

const purchaseNowPrimary = {
  id: 'citibank-now',
  provider: 'Citibank',
  sub: 'Member of FDIC, Issued through Fidelity',
  type: 'Bank CDs',
  nominal: '4.30',
  tax: '2.87',
  dep: '$1,000',
  badge: 'Recommended',
  providerUrl: 'https://www.citi.com',
};

const purchaseNowOthers = [
  {
    id: 'goldman-now',
    provider: 'Goldman Sachs',
    sub: 'Member of FDIC, Issued through Fidelity',
    type: 'Brokerage CDs',
    nominal: '4.30',
    tax: '2.87',
    dep: '$1,000',
    providerUrl: 'https://www.goldmansachs.com',
  },
  {
    id: 'treasury-now',
    provider: 'US Treasury',
    sub: 'Backed by the U.S. Government',
    type: 'Treasuries',
    nominal: '4.20',
    tax: '2.83',
    dep: '$1,000',
    note: true,
    providerUrl: 'https://www.treasurydirect.gov',
  },
];

const futureGroups = [
  {
    id: 'future-3m',
    slot: 'Buy in 3 months (August 2026)',
    primary: { id: 'chase-future', provider: 'JP Morgan Chase', sub: 'Member of FDIC, Issued through Fidelity', type: 'Bank CDs', nominal: '4.15', tax: '3.34', dep: '$1,667', providerUrl: 'https://www.chase.com' },
    others: [
      { id: 'goldman-future-3m', provider: 'Goldman Sachs', sub: 'Member of FDIC, Issued through Fidelity', type: 'Brokerage CDs', nominal: '4.11', tax: '3.30', dep: '$1,667', providerUrl: 'https://www.goldmansachs.com' },
      { id: 'treasury-future-3m', provider: 'US Treasury', sub: 'Backed by the U.S. Government', type: 'Treasuries', nominal: '4.10', tax: '3.27', dep: '$1,667', note: true, providerUrl: 'https://www.treasurydirect.gov' },
    ],
  },
  {
    id: 'future-6m',
    slot: 'Buy in 6 months (November 2026)',
    primary: { id: 'treasury-future', provider: 'US Treasury', sub: 'Backed by the U.S. Government', type: 'Treasuries', nominal: '4.80', tax: '4.22', dep: '$1,667', note: true, providerUrl: 'https://www.treasurydirect.gov' },
    others: [
      { id: 'chase-future-6m', provider: 'JP Morgan Chase', sub: 'Member of FDIC, Issued through Fidelity', type: 'Bank CDs', nominal: '4.72', tax: '4.15', dep: '$1,667', providerUrl: 'https://www.chase.com' },
      { id: 'goldman-future-6m', provider: 'Goldman Sachs', sub: 'Member of FDIC, Issued through Fidelity', type: 'Brokerage CDs', nominal: '4.68', tax: '4.12', dep: '$1,667', providerUrl: 'https://www.goldmansachs.com' },
    ],
  },
];

const summary = [
  { type: 'Buy Now', provider: 'Citibank', term: '12 Months', apy: '4.30%', tax: '2.87%', dep: '$1,000', date: 'May 20, 2027', dot: '#22C55E' },
  { type: 'In 3 Months', provider: 'JP Morgan Chase', term: '3 Months', apy: '4.15%', tax: '3.34%', dep: '$1,667', date: 'May 20, 2027', dot: '#0077FF', projected: true },
  { type: 'In 6 Months', provider: 'US Treasury', term: '6 Months', apy: '4.80%', tax: '4.22%', dep: '$1,667', date: 'May 20, 2027', dot: '#2B7FFF', projected: true },
];

const BULLET_TERM_OPTIONS = [
  '3 months',
  '6 months',
  '9 months',
  '12 months',
  '18 months',
  '24 months',
  '36 months',
  '48 months',
  '60 months',
];

const monthsFromLabel = (label) => {
  const m = String(label || '').trim().match(/^(\d+)\s*months?$/i);
  if (!m) return 12;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : 12;
};

const formatDateLong = (d) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const addMonths = (date, months) => {
  const out = new Date(date);
  out.setMonth(out.getMonth() + months);
  return out;
};

const formatMoney = (n, digits = 0) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return '$0';
  return `$${x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

const formatPct = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0.00';
  return x.toFixed(2);
};

const mapProductType = (pt) => {
  if (pt === 'treasury') return 'Treasuries';
  if (pt === 'brokered_cd') return 'Brokerage CDs';
  return 'Bank CDs';
};

const mapProvider = (p) => p?.institution_name || p?.issuing_bank || p?.brokerage_firm || 'Unknown';

const mapSubLabel = (p, type) => {
  if (type === 'Treasuries') return 'Backed by the U.S. Government';
  if (type === 'Brokerage CDs') {
    const broker = p?.brokerage_firm ? `Issued through ${p.brokerage_firm}` : 'Issued through brokerage';
    return `Member of FDIC, ${broker}`;
  }
  return 'Member of FDIC';
};

const makeTaxBreakdown = (p) => {
  const interest = Number(p?.nominal_interest_usd ?? 0);
  const state = p?.product_type === 'treasury' ? 0 : Number(p?.state_rate ?? 0);
  const local = p?.product_type === 'treasury' ? 0 : Number(p?.local_rate ?? 0);
  const totalTax = interest - Number(p?.after_tax_interest_usd ?? 0);
  const savings = Math.max(0, interest * (state + local));
  return {
    interestEarned: formatMoney(interest, 2),
    totalTax: `-${formatMoney(totalTax, 2)}`,
    totalSavings: formatMoney(savings, 2),
    netReturn: formatMoney(Number(p?.after_tax_interest_usd ?? 0), 2),
  };
};

const DropdownField = ({ label, value, options, onSelect, narrow = false }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`w-full ${narrow ? 'max-w-[220px]' : label === 'Target Maturity Date' ? 'max-w-[302px]' : 'max-w-[278px]'} relative`}>
      <div className={`mb-[14px] text-[11px] uppercase tracking-[0.55px] text-[#94A3B8] ${label === 'AMOUNT' ? 'font-bold' : 'font-semibold'}`}>{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between rounded-[8px] border border-[#1557F5] bg-[#0D1B2D] px-3 text-left shadow-[0_0_0_1px_rgba(21,87,245,0.35)] transition-colors hover:border-[#2A4D78]"
      >
        <span className={`${label === 'Target Maturity Date' ? 'text-[12px]' : 'text-[14px]'} font-medium leading-[20px] text-white`}>{value}</span>
        <ChevronDownIcon className={`h-4 w-4 text-[#94A3B8]/70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-[8px] border border-[#1A3050] bg-[#0D1B2D] shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
          <div className="divide-y divide-[#1A3050]">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
              className={`block w-full appearance-none border-0 bg-[#0D1B2D] px-3 py-2 text-left text-[13px] text-[#E2E8F0] shadow-none outline-none transition-colors hover:bg-[#173257] focus:bg-[#173257] ${
                opt === value ? 'bg-[#173257]' : ''
              }`}
            >
              {opt}
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({ title, badge, note, collapsed = false, onToggle, isLightTheme = false }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={!collapsed}
    className="flex w-full items-center justify-between gap-4 border-0 bg-transparent p-0 text-left outline-none transition-opacity hover:opacity-95 max-[760px]:items-start max-[760px]:flex-col"
  >
    <div className={`flex min-w-0 items-center gap-2 text-[20px] font-medium leading-[28px] max-[520px]:text-[17px] ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>
      <span>{title}</span>
      <span className={`theme-keep-white rounded-[4px] px-2 py-1 text-[11px] font-medium leading-[16px] text-white ${badge === 'Live Rates' ? 'bg-[#00A63E]' : 'bg-[#0077FF]'}`}>{badge}</span>
      <ChevronDownIcon className={`h-4 w-4 text-[#6A7282] transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
    </div>
    <div className={`text-[14px] leading-[20px] max-[520px]:text-[12px] ${isLightTheme ? 'text-[#64748B]' : 'text-[#99A1AF]'}`}>{note}</div>
  </button>
);

const Rate = ({ value, tone = 'text-white', projected = false, allocationText = '' }) => (
  <div className={`${tone} text-left text-[26px] font-bold leading-none max-[768px]:text-right max-[520px]:text-[22px]`}>
    <div>
      {value}<span className="ml-2 text-[13px] font-medium">%</span>
    </div>
    {projected && <div className="mt-1 text-[12px] font-normal leading-[13px] text-[#0077FF] max-[768px]:text-right">Projected<br />({allocationText || 'Allocation'})</div>}
  </div>
);

const DESKTOP_GRID = 'md:grid-cols-[330px_180px_150px_170px_130px_254px]';
const SUMMARY_GRID = 'md:grid-cols-[1.1fr_2fr_0.9fr_0.9fr_1.1fr_1fr_1.3fr]';
const RATE_RISK_SCENARIO_ORDER = {
  'Rates stay flat': 0,
  'Rates drop 0.5%': 1,
  'Rates drop 1.0%': 2,
  'Rates rise 0.5%': 3,
};

const formatSignedMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return '$0';
  const abs = formatMoney(Math.abs(amount), 0);
  return `${amount > 0 ? '+' : '-'}${abs}`;
};

const BulletRateRiskPanel = ({
  expanded,
  onToggle,
  data,
  loading,
  error,
  stale,
  onRetry,
  summaryLoading,
  summaryError,
  summaryData,
  onGenerateSummary,
  isLightTheme = false,
}) => {
  const scenarios = useMemo(() => {
    const items = Array.isArray(data?.scenarios) ? data.scenarios.slice() : [];
    return items.sort((a, b) => {
      const aRank = Object.prototype.hasOwnProperty.call(RATE_RISK_SCENARIO_ORDER, a?.label)
        ? RATE_RISK_SCENARIO_ORDER[a.label]
        : Number.MAX_SAFE_INTEGER;
      const bRank = Object.prototype.hasOwnProperty.call(RATE_RISK_SCENARIO_ORDER, b?.label)
        ? RATE_RISK_SCENARIO_ORDER[b.label]
        : Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  }, [data]);

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between gap-4 rounded-[12px] border px-5 py-[17px] text-left transition-colors ${
          isLightTheme
            ? 'border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#E6F0FF]'
            : 'border-[#1E3A5F] bg-[#081329] hover:bg-[#0B1830]'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span className={`${isLightTheme ? 'text-[#1557F5]' : 'text-[#1D8DEE]'}`}>
            <SparkleIcon className="h-[18px] w-[18px]" />
          </span>
          <div className={`min-w-0 text-[16px] font-semibold leading-[22px] ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>
            See how rate changes could impact your future purchases
          </div>
        </div>
        <ChevronDownIcon className={`h-5 w-5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''} ${isLightTheme ? 'text-[#64748B]' : 'text-[#8AA4C0]'}`} />
      </button>

      {expanded && (
        <div className={`mt-3 rounded-[12px] border px-[34px] py-[34px] ${
          isLightTheme ? 'border-[#BFDBFE] bg-[#F8FBFF]' : 'border-[#1E2939] bg-[#050D1F]'
        }`}>
          {stale && !loading && !data && (
            <div className={`mb-4 rounded-[10px] border px-4 py-3 text-[13px] leading-[1.45] ${
              isLightTheme ? 'border-[#C7D2FE] bg-[#EEF4FF] text-[#334155]' : 'border-[#1E3A5F] bg-[#0A1429] text-[#9FB4D3]'
            }`}>
              Inputs changed. Collapse and reopen this panel to load updated rate-risk scenarios.
            </div>
          )}

          {loading && (
            <div className={`rounded-[10px] border px-4 py-3 text-[13px] ${
              isLightTheme ? 'border-[#BFDBFE] bg-white text-[#475569]' : 'border-[#1E3A5F] bg-[#081329] text-[#9FB4D3]'
            }`}>
              Loading rate-risk scenarios...
            </div>
          )}

          {!loading && error && (
            <div className={`rounded-[10px] border px-4 py-3 ${
              isLightTheme ? 'border-[#FCA5A5] bg-[#FEF2F2]' : 'border-[#5B1C1C] bg-[#2A1111]'
            }`}>
              <div className={`text-[13px] leading-[1.45] ${isLightTheme ? 'text-[#B91C1C]' : 'text-[#FCA5A5]'}`}>{error}</div>
              <button
                type="button"
                onClick={onRetry}
                className={`mt-3 inline-flex items-center rounded-[8px] px-3 py-2 text-[13px] font-semibold ${
                  isLightTheme ? 'bg-[#1557F5] text-white hover:bg-[#1D4ED8]' : 'bg-[#1A3050] text-white hover:bg-[#254873]'
                }`}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="grid items-stretch gap-[46px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className={`h-full overflow-hidden rounded-[12px] border ${
                  isLightTheme
                    ? 'border-[#D7E7D9] bg-[linear-gradient(180deg,#F8FFFA_0%,#ECFDF3_100%)]'
                    : 'border-[#0E2818] bg-[linear-gradient(180deg,#071810_0%,#050E0A_100%)]'
                }`}>
                  <div className={`grid grid-cols-[minmax(0,1.2fr)_minmax(140px,1fr)_92px] gap-3 border-b px-8 py-[17px] text-[12px] font-bold tracking-[0em] ${
                    isLightTheme ? 'border-[#D7E7D9] text-[#334155]' : 'border-[#143220] text-white'
                  }`}>
                    <div>Scenario</div>
                    <div>Est. Return (Projected Tranches)</div>
                    <div>Vs. Flat</div>
                  </div>
                  <div>
                    {scenarios.map((scenario) => {
                      const impact = Number(scenario?.dollar_impact ?? 0);
                      const impactTone = impact > 0 ? 'text-[#22C55E]' : impact < 0 ? 'text-[#EF4444]' : (isLightTheme ? 'text-[#64748B]' : 'text-[#99A1AF]');
                      return (
                        <div
                          key={`${scenario?.label}-${scenario?.delta}`}
                          className={`grid grid-cols-[minmax(0,1.2fr)_minmax(140px,1fr)_92px] gap-3 border-b px-8 py-[21px] text-[14px] last:border-b-0 ${
                            isLightTheme ? 'border-[#D7E7D9]' : 'border-[#143220]'
                          }`}
                        >
                          <div className={`font-medium ${isLightTheme ? 'text-[#0F172A]' : 'text-[#7AAAC0]'}`}>{scenario?.label}</div>
                          <div className="font-bold text-[#22C55E]">{formatMoney(scenario?.total_return ?? 0, 0)}</div>
                          <div className={`font-bold ${impactTone}`}>
                            {scenario?.label === 'Rates stay flat' ? '-' : formatSignedMoney(impact)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`flex h-full flex-col rounded-[12px] border px-8 py-[20px] ${
                  isLightTheme
                    ? 'border-[#BFDBFE] bg-[linear-gradient(180deg,#FFFFFF_0%,#EFF6FF_100%)]'
                    : 'border-[#1557F5] bg-[linear-gradient(180deg,#07170F_0%,#06120D_100%)]'
                }`}>
                  <div className={`flex items-start justify-between gap-4 border-b pb-[18px] ${isLightTheme ? 'border-[#BFDBFE]' : 'border-[#143220]'}`}>
                    <div className={`text-[16px] font-bold leading-[22px] ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>What if rates change</div>
                    {!summaryData && (
                      <button
                        type="button"
                        onClick={onGenerateSummary}
                        disabled={summaryLoading}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-[8px] border px-3 py-2 text-[13px] font-bold ${
                          summaryLoading
                            ? 'cursor-not-allowed opacity-70'
                            : ''
                        } ${
                          isLightTheme
                            ? 'border-[#6A9ABE] text-[#1557F5] hover:bg-[#EAF2FF]'
                            : 'border-[#6A9ABE] bg-[#07170F] text-[#6A9ABE] hover:bg-[#0f2a1f]'
                        }`}
                      >
                        <SparkleIcon className="h-3.5 w-3.5" />
                        <span>{summaryLoading ? 'Generating summary...' : 'Generate Summary'}</span>
                      </button>
                    )}
                  </div>

                  {!summaryData && summaryError && (
                    <div className={`mt-4 rounded-[10px] border px-3 py-3 text-[13px] leading-[1.45] ${
                      isLightTheme ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]' : 'border-[#5B1C1C] bg-[#2A1111] text-[#FCA5A5]'
                    }`}>
                      {summaryError}
                    </div>
                  )}

                  {summaryData ? (
                    <div className="mt-[28px] flex flex-1 flex-col">
                      <div className={`text-[20px] font-semibold leading-[32px] ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>
                        {summaryData.headline}
                      </div>
                      <p className={`mt-4 text-[14px] leading-[38px] ${isLightTheme ? 'text-[#475569]' : 'text-[#99A1AF]'}`}>
                        {summaryData.insight}
                      </p>
                      <div className={`mt-auto flex items-start gap-3 pt-5 text-[12px] leading-[18px] ${isLightTheme ? 'text-[#64748B]' : 'text-[#7AAAC0]'}`}>
                        <InfoIcon className="mt-[2px] h-5 w-5 shrink-0" />
                        <p>
                          AI-generated insights are based on simulated rate scenarios and current market data. This information is educational and should not be considered financial advice.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};

const Row = ({
  row,
  future = false,
  showOtherToggle = false,
  expanded = false,
  onToggleOther,
  taxOpen,
  onToggleTax,
  highlight = false,
  seamless = false,
  summaryState = 'idle',
  onGenerateSummary,
  onSetReminder,
  isLightTheme = false,
}) => {
  const result = { provider: row.provider, productType: row.type };
  const mobileHighlight = highlight && !future;
  const rowSurfaceClass = isLightTheme
    ? `border-[#E2E8F0] ${highlight ? 'min-h-[141px] bg-[#EEF4FF]' : 'bg-white'} ${mobileHighlight ? 'max-[768px]:border-[#C7D2FE] max-[768px]:bg-[#EEF4FF]' : ''}`
    : `${highlight ? 'min-h-[141px] bg-[#050D1F]' : 'bg-[#050D1F]'} ${mobileHighlight ? 'max-[768px]:border-[#0B5C2A] max-[768px]:bg-[#062314]' : ''}`;
  const summaryShellClass = isLightTheme
    ? (summaryState === 'idle'
        ? 'top-[28px] h-[52px] border border-[#BFDBFE] bg-[#F8FBFF] shadow-[inset_0_0_0_1px_rgba(21,87,245,0.12)]'
        : 'top-[22px] h-[231px] border border-[#BFDBFE] bg-[linear-gradient(180deg,#FFFFFF_0%,#EFF6FF_100%)] shadow-[inset_0_0_0_1px_rgba(21,87,245,0.08)]')
    : (summaryState === 'idle'
        ? 'top-[28px] h-[52px] border border-[#1557F5] bg-[#07170F] shadow-[inset_0_0_0_1px_rgba(140,194,255,0.26)]'
        : 'top-[22px] h-[231px] border border-[#1557F5] bg-[linear-gradient(180deg,#07170F_0%,#06120D_100%)] shadow-[inset_0_0_0_1px_rgba(140,194,255,0.18)]');
  const summaryHeaderClass = isLightTheme
    ? (summaryState === 'idle'
        ? 'relative h-full pl-0 pr-0'
        : 'relative mt-[6px] h-[52px] rounded-[12px] border border-[rgba(21,87,245,0.18)] bg-[#F8FBFF] pl-0 pr-0')
    : (summaryState === 'idle'
        ? 'relative h-full pl-0 pr-0'
        : 'relative mt-[6px] h-[52px] rounded-[12px] border border-[rgba(21,87,245,0.45)] bg-[#07170F] pl-0 pr-0');

  return (
    <div className={`transition-colors md:hover:bg-[rgba(29,141,238,0.05)] ${seamless ? `rounded-none border-0 border-b ${isLightTheme ? 'border-[#E2E8F0]' : 'border-[#253E5C]'} px-[8px] py-5 last:border-b-0 max-[768px]:px-4 max-[768px]:py-4` : `rounded-[10px] border ${isLightTheme ? 'border-[#E2E8F0]' : 'border-[#1E2939]'} px-3 py-3 max-[768px]:px-4 max-[768px]:py-4`} ${rowSurfaceClass}`}>
      {future && row.slot && <div className="theme-keep-white mb-3 inline-flex rounded-full bg-[#0077FF] px-3 py-1 text-[12px] leading-none text-white">{row.slot}</div>}
      {!future && row.badge && <div className={`theme-keep-white mb-3 inline-flex rounded-full px-3 py-1 text-[12px] leading-none text-white ${mobileHighlight ? 'bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)]' : 'bg-[#22C55E]'}`}>{row.badge}</div>}
      <div className={`grid items-center gap-0 max-[768px]:gap-3 ${DESKTOP_GRID} ${highlight ? 'min-h-[82px]' : ''}`}>
        <div className={`flex min-w-0 items-center gap-3 max-[768px]:border-b max-[768px]:pb-3 ${isLightTheme ? 'max-[768px]:border-[#E2E8F0]' : 'max-[768px]:border-[#1E293B]'}`}>
          <div className={`${highlight ? 'h-[100px] opacity-100' : 'h-[68px] opacity-0'} w-1 shrink-0 rounded ${future ? 'bg-[#22C55E]' : 'bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)]'} max-[768px]:h-[56px]`} />
          <BankBadge result={result} />
          <div className="min-w-0">
            <div className={`text-[16px] font-bold leading-[20px] max-[480px]:text-[0.95rem] ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>{row.provider}</div>
            <div className="text-[11px] font-normal leading-[16px] text-[#4A7A9A]">{row.sub}</div>
          </div>
        </div>
        <div className={`flex w-full justify-between text-left text-[0.9rem] font-medium md:text-[16px] md:font-bold md:text-left ${isLightTheme ? 'text-[#334155] md:text-[#0F172A]' : 'text-[#E2E8F0] md:text-white'}`}>
          <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">Product Type</span>
          <span>{row.type}</span>
        </div>
        <div className="flex w-full justify-between text-left md:block">
          <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">Nominal Rate</span>
          <div className="text-right md:text-left">
            <Rate value={row.nominal} />
          </div>
        </div>
        <div className="flex w-full justify-between text-left md:block">
          <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">After-Tax Yield</span>
          <div className="text-right md:text-left">
            <Rate value={row.tax} tone={future ? 'text-[#0077FF]' : 'text-[#22C55E]'} projected={future} allocationText={row.allocationText} />
          </div>
        </div>
        <div className="flex w-full justify-between text-left md:block">
          <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">Allocation</span>
          <div className="text-right md:text-left max-[760px]:text-right">
            <div className={`text-[18px] font-bold ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>{row.allocation}</div>
            <div className="mt-1 text-[11px] leading-[14px] text-[#7D93AF]">Min. {row.minimumDeposit}</div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-start max-[768px]:pt-1">
          <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">Actions</span>
          <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center md:justify-start">
          <button
            type="button"
            onClick={onToggleTax}
            className={`theme-keep-white inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-0 px-4 py-2 text-[0.82rem] font-bold leading-[24px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] outline-none ring-0 transition-colors md:h-[43px] md:w-[145px] md:px-2 md:text-[14px] md:font-semibold ${
              taxOpen ? 'bg-[#0D1B2E] text-[#F59E0C] shadow-[inset_0_0_0_1px_#F59E0C,0_4px_4px_rgba(0,0,0,0.25)]' : 'bg-[#1A3050] text-white hover:bg-[#254873]'
            }`}
          >
            <span className="whitespace-nowrap">Tax Breakdown</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${taxOpen ? 'rotate-180 text-[#F59E0C]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (future) {
                onSetReminder?.(row);
                return;
              }
              window.open(row.providerUrl, '_blank', 'noopener,noreferrer');
            }}
            className={`inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border px-5 py-2 text-[0.82rem] font-bold leading-[24px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-all md:h-[38px] md:w-[122px] md:rounded-[10px] md:px-2 md:text-[14px] md:font-semibold ${
              future ? 'border-[#DCE6F7] bg-white text-[#155DFC] hover:bg-[#eaf1ff]' : 'border-[#E2E8F0] bg-white text-[#1A3050] hover:bg-[#eef3fb]'
            }`}
          >
            {future ? 'Set Reminder' : 'Provider'} {!future && <ExternalLinkIcon className="h-3.5 w-3.5" />}
          </button>
          </div>
        </div>
      </div>
      {taxOpen && (
        <div className={`relative mt-2 h-[264px] w-full border ${isLightTheme ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-[#071710] bg-[#050D1F]'}`}>
          <div className={`absolute left-[22px] top-[22px] h-[231px] w-[572px] rounded-xl ${isLightTheme ? 'border border-[#D7E7D9] bg-[linear-gradient(180deg,#F8FFFA_0%,#ECFDF3_100%)]' : 'border border-[#0E2818] bg-[linear-gradient(180deg,#071810_0%,#050E0A_100%)]'}`}>
            <div className={`px-[20px] pt-[12px] text-[13px] font-bold ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>Read Tax Breakdown</div>
            <div className="px-[20px] pt-[24px]">
              <div className="flex h-[14px] items-center justify-between text-[12.5px] leading-none">
                <span className={`font-normal ${isLightTheme ? 'text-[#475569]' : 'text-[#7AAAC0]'}`}>Interest Earned :</span>
                <span className="w-[80px] text-right font-bold text-[#22C55E]">{row.taxBreakdown?.interestEarned || '$0.00'}</span>
              </div>
              <div className="mt-[21px] flex h-[14px] items-center justify-between text-[12.5px] leading-none">
                <span className={`font-normal ${isLightTheme ? 'text-[#475569]' : 'text-[#7AAAC0]'}`}>Total Tax :</span>
                <span className="w-[80px] text-right font-bold text-[#EF4444]">{row.taxBreakdown?.totalTax || '$0.00'}</span>
              </div>
            </div>
            <div className={`mx-[12px] mt-[69px] rounded-[10px] px-[10px] py-[9px] ${isLightTheme ? 'border border-[#B7E2C4] bg-[linear-gradient(180deg,#F0FDF4_0%,#DCFCE7_100%)] shadow-[inset_0_0_0_1px_rgba(34,197,94,0.12)]' : 'border border-[#1A4A28] bg-[linear-gradient(180deg,#0A2A18_0%,#071E10_100%)] shadow-[inset_0_0_0_1px_rgba(34,197,94,0.22)]'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[13px] font-bold ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>Net Return :</span>
                <span className="text-[17px] font-bold text-[#22C55E]">{row.taxBreakdown?.netReturn || '$0.00'}</span>
              </div>
            </div>
          </div>

          <div className={`absolute left-[617px] w-[628px] overflow-hidden rounded-[12px] p-0 ${summaryShellClass}`}>
            <div className={`flex items-center pl-[27px] pr-[62px] ${summaryHeaderClass}`}>
              {summaryState === 'idle' ? (
                <>
                  <div className={`absolute left-[16px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>Why this Fits</div>
                  <div className="absolute left-[212px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none text-[#22C55E]">99% Match</div>
                  <button
                    type="button"
                    onClick={onGenerateSummary}
                    className={`absolute left-[411px] top-1/2 inline-flex h-[28px] w-[155px] -translate-y-1/2 items-center justify-center gap-1 rounded-[8px] border border-[#6A9ABE] bg-transparent px-[6px] py-[5px] text-[12px] font-bold leading-none text-[#6A9ABE] shadow-[inset_0_0_0_1px_rgba(106,154,190,0.35)] ${isLightTheme ? 'hover:bg-[#EAF2FF]' : 'hover:bg-[#0f2a1f]'}`}
                  >
                    <SparkleIcon className="h-[11px] w-[11px] text-[#6A9ABE]" />
                    <span>Generate Summary</span>
                  </button>
                </>
              ) : (
                <div className="grid w-full min-w-0 grid-cols-[minmax(110px,1fr)_auto_minmax(90px,180px)_minmax(52px,auto)] items-center gap-4 px-4">
                  <div className={`whitespace-nowrap text-[14px] font-bold leading-none ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>Why this Fits</div>
                  <div className={`whitespace-nowrap text-[12px] font-bold leading-none ${isLightTheme ? 'text-[#64748B]' : 'text-[#3A6090]'}`}>Match Score</div>
                  <div className={`h-[6px] min-w-0 rounded-full ${isLightTheme ? 'bg-[#DBEAFE]' : 'bg-[#0D2A1F]'}`}>
                    <div className="h-[6px] w-[99%] rounded-full bg-[#22C55E]" />
                  </div>
                  <div className="whitespace-nowrap text-right text-[18px] font-bold leading-none text-[#22C55E]">99%</div>
                </div>
              )}
            </div>

            {summaryState === 'loading' && (
              <div className="flex h-[144px] items-center justify-center">
                <div className="inline-flex items-center gap-3 rounded-[10px] px-[6px] py-[5px]">
                  <span className="inline-block h-[11px] w-[11px] origin-center -rotate-[30deg] bg-[#6A9ABE]" />
                  <span className="text-[12px] font-bold leading-none text-[#6A9ABE]">Loading Summary.....</span>
                </div>
              </div>
            )}

            {summaryState === 'done' && (
              <div className="px-4 pt-5">
                <div className="text-[16px] font-medium leading-[28px] text-white">Best after-tax yield</div>
                <p className="mt-2 text-[14px] font-normal leading-[22.75px] text-[#99A1AF]">
                  In New York&apos;s high-tax environment, brokerage CDs deliver a stronger net return than comparable bank CDs — and the 3-month term keeps you liquid if rates shift.
                </p>
                <div className="mt-3 text-[12px] font-normal leading-[16px] text-[#4A5565]">
                  <div className="flex items-start gap-2">
                    <InfoIcon className="mt-[2px] h-4 w-4 shrink-0" />
                    <div>
                      <div className="text-[12px] font-normal leading-[16px] text-[#4A5565]">AI analyzed based on your inputs: New York, $100k-$200k income, 3-month duration</div>
                      <div className="text-[12px] font-normal italic leading-[16px] text-[#4A5565]">All results for informational purposes only. Not financial advice.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {row.note && (
        <div className="mt-2 pl-5 text-[11px] italic leading-[16px] text-[#99A1AF] max-[760px]:pl-0">
          You can purchase U.S. Treasuries directly through <span className="underline">TreasuryDirect.gov</span> or through most major brokerage firms. Buying through a broker often allows you to sell your Treasuries before they mature if you need your cash back early.
        </div>
      )}
      {showOtherToggle && (
        <button
          type="button"
          onClick={onToggleOther}
          className={`inline-flex appearance-none items-center gap-1 border-0 bg-transparent pl-1 text-[14px] font-normal leading-[20px] shadow-none outline-none transition-colors ${isLightTheme ? 'text-[#0F172A] hover:text-[#1557F5]' : 'text-white hover:text-[#c7d7ee]'} ${highlight ? 'mt-1' : 'mt-2'}`}
        >
          Other great options
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default function BulletStrategyMockup({
  theme = 'dark',
  embedded = false,
  hideTitle = false,
  onControlsChange = null,
  initialTerm = '12 months',
  initialAmount = '20000',
  simulationData = null,
  alternativesByTranche = {},
  simulationLoading = false,
  simulationError = null,
  onExportPdf = null,
  userState = '',
  userIncomeRange = '',
}) {
  const isLightTheme = theme === 'light';
  const [term, setTerm] = useState(initialTerm);
  const [filterType, setFilterType] = useState('All Products (0)');
  const [amount, setAmount] = useState(initialAmount);
  const [nowCollapsed, setNowCollapsed] = useState(false);
  const [futureCollapsed, setFutureCollapsed] = useState(false);
  const [showOtherNow, setShowOtherNow] = useState(true);
  const [showOtherFuture, setShowOtherFuture] = useState({});
  const [taxOpenById, setTaxOpenById] = useState({});
  const [summaryStateById, setSummaryStateById] = useState({});
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [rateRiskExpanded, setRateRiskExpanded] = useState(false);
  const [rateRiskLoading, setRateRiskLoading] = useState(false);
  const [rateRiskError, setRateRiskError] = useState('');
  const [rateRiskData, setRateRiskData] = useState(null);
  const [rateRiskLoadedKey, setRateRiskLoadedKey] = useState('');
  const [rateRiskStale, setRateRiskStale] = useState(false);
  const [rateRiskSummaryLoading, setRateRiskSummaryLoading] = useState(false);
  const [rateRiskSummaryError, setRateRiskSummaryError] = useState('');
  const [rateRiskSummaryData, setRateRiskSummaryData] = useState(null);
  const timersRef = useRef({});
  const rateRiskKeyRef = useRef('');
  const rateRiskRequestInFlightRef = useRef(false);

  useEffect(() => {
    setTerm(initialTerm || '12 months');
  }, [initialTerm]);

  useEffect(() => {
    setAmount(initialAmount || '20000');
  }, [initialAmount]);

  useEffect(() => {
    if (typeof onControlsChange === 'function') {
      onControlsChange({ term, amount });
    }
  }, [term, amount, onControlsChange]);

  const toggleTax = (id) => {
    setTaxOpenById((prev) => {
      const next = !prev[id];
      if (next) {
        setSummaryStateById((s) => ({ ...s, [id]: 'idle' }));
      }
      if (!next) {
        setSummaryStateById((s) => ({ ...s, [id]: 'idle' }));
        if (timersRef.current[id]) {
          clearTimeout(timersRef.current[id]);
          delete timersRef.current[id];
        }
      }
      return { ...prev, [id]: next };
    });
  };

  const generateSummary = (id) => {
    setSummaryStateById((s) => ({ ...s, [id]: 'loading' }));
    if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
    timersRef.current[id] = setTimeout(() => {
      setSummaryStateById((s) => ({ ...s, [id]: 'done' }));
      delete timersRef.current[id];
    }, 1600);
  };

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((t) => clearTimeout(t));
  }, []);

  const maturityText = useMemo(() => {
    const months = monthsFromLabel(term);
    return formatDateLong(addMonths(new Date(), months));
  }, [term]);

  const numericAmount = useMemo(
    () => Number(String(amount || '').replace(/[^0-9]/g, '')) || 0,
    [amount],
  );
  const isAmountBelowMinimum = numericAmount > 0 && numericAmount < 5000;

  const selectedProductType = useMemo(() => {
    const s = String(filterType || '').toLowerCase();
    if (s.includes('bank')) return 'Bank CDs';
    if (s.includes('brokerage')) return 'Brokerage CDs';
    if (s.includes('treas')) return 'Treasuries';
    return null;
  }, [filterType]);

  const matchFilter = (row) => !selectedProductType || row?.type === selectedProductType;

  const derived = useMemo(() => {
    const tranches = Array.isArray(simulationData?.tranches) ? simulationData.tranches : [];
    if (!tranches.length) {
      return {
        purchaseNowPrimary,
        purchaseNowOthers,
        futureGroups,
        summary,
      };
    }

    const mapOfferRow = (offer, meta = {}) => {
      const type = mapProductType(offer?.product_type);
      const provider = mapProvider(offer);
      const taxBreakdown = makeTaxBreakdown(offer || {});
      const termMonths = Number(offer?.term_months ?? meta.termMonths ?? 0) || 0;
      const allocationAmount = Number(offer?.investment_amount ?? meta.allocationAmount ?? 0) || 0;
      const minimumDeposit = Number(offer?.minimum_deposit ?? 0) || 0;
      return {
        id: `${meta.idPrefix || 'row'}-${provider}-${termMonths}-${offer?.apy_nominal ?? 0}`,
        provider,
        sub: mapSubLabel(offer, type),
        type,
        nominal: formatPct(offer?.apy_nominal),
        tax: formatPct(offer?.after_tax_apy),
        allocation: formatMoney(allocationAmount, 0),
        minimumDeposit: formatMoney(minimumDeposit, 0),
        providerUrl: offer?.destination_url || offer?.source_url || 'https://www.smartcd.ai',
        note: type === 'Treasuries',
        taxBreakdown,
        allocationText: meta.allocationText || '',
        tranche: meta.tranche || null,
        termMonths,
        maturityDate: meta.maturityDate || '',
      };
    };

    const start = new Date();
    const groups = tranches.map((t, idx) => {
      const purchaseOffset = Number(t?.purchase_offset_months ?? 0) || 0;
      const offer = t?.product || {};
      const altOffers = Array.isArray(alternativesByTranche?.[String(t?.tranche)]) ? alternativesByTranche[String(t.tranche)] : [];
      const maturityDate = formatDateLong(addMonths(start, Number(t?.target_maturity_months ?? 0) || 0));
      const slot = purchaseOffset === 0
        ? 'Buy now'
        : `Buy in ${purchaseOffset} months (${formatDateLong(addMonths(start, purchaseOffset))})`;
      const allocationText = `${formatPct(t?.allocation_pct ?? 0)}% allocation`;
      const primary = mapOfferRow(offer, {
        idPrefix: `tranche-${t?.tranche || idx + 1}`,
        allocationText,
        allocationAmount: t?.allocation_amount,
        tranche: t?.tranche || idx + 1,
        termMonths: offer?.term_months,
        maturityDate,
      });
      const others = altOffers
        .filter((o) => mapProvider(o) !== primary.provider || Number(o?.term_months) !== primary.termMonths)
        .slice(0, 3)
        .map((o, altIdx) =>
          mapOfferRow(o, {
            idPrefix: `tranche-${t?.tranche || idx + 1}-alt-${altIdx + 1}`,
            allocationText,
            allocationAmount: t?.allocation_amount,
            tranche: t?.tranche || idx + 1,
            termMonths: o?.term_months,
            maturityDate,
          }),
        );
      return { slot, primary, others, tranche: t?.tranche || idx + 1 };
    });

    const purchaseNowGroup = groups.find((g) => g.slot.toLowerCase() === 'buy now') || groups[0];
    const future = groups.filter((g) => g !== purchaseNowGroup);

    const summaryRows = groups.map((g, idx) => {
      const offset = Number(tranches[idx]?.purchase_offset_months ?? 0) || 0;
      return {
      type: offset <= 0 ? 'Buy Now' : `In ${offset} Months`,
      provider: g.primary.provider,
      term: `${g.primary.termMonths || 0} Months`,
      apy: `${g.primary.nominal}%`,
      tax: `${g.primary.tax}%`,
      allocation: g.primary.allocation,
      date: g.primary.maturityDate,
      dot: offset <= 0 ? '#22C55E' : '#0077FF',
      projected: offset > 0,
    };
    });

    return {
      purchaseNowPrimary: {
        ...purchaseNowGroup.primary,
        badge: 'Recommended',
      },
      purchaseNowOthers: purchaseNowGroup.others,
      futureGroups: future.map((g) => ({
        id: `future-${g.tranche}`,
        slot: g.slot,
        primary: g.primary,
        others: g.others,
      })),
      summary: summaryRows,
    };
  }, [simulationData, alternativesByTranche]);

  const rateRiskPayload = useMemo(() => {
    const tranches = Array.isArray(simulationData?.tranches) ? simulationData.tranches : [];
    if (!tranches.length) return null;

    const normalizedTranches = tranches
      .map((tranche, index) => {
        const product = tranche?.product || {};
        const slot = Number(tranche?.tranche ?? index + 1);
        const buyInMonths = Number(tranche?.purchase_offset_months ?? 0);
        const cdTermMonths = Number(product?.term_months ?? tranche?.target_maturity_months ?? 0);
        const afterTaxApy = Number(product?.after_tax_apy ?? 0);
        const allocation = Number(tranche?.allocation_amount ?? product?.investment_amount ?? 0);
        const productId = String(
          product?.record_hash ||
          product?.id ||
          product?.destination_url ||
          `${slot}-${mapProvider(product)}-${cdTermMonths}-${afterTaxApy}`
        ).trim();

        if (!slot || cdTermMonths <= 0 || allocation <= 0 || afterTaxApy < 0 || !productId) {
          return null;
        }

        return {
          slot,
          buy_in_months: buyInMonths,
          cd_term_months: cdTermMonths,
          product_id: productId,
          after_tax_apy: afterTaxApy,
          allocation,
        };
      })
      .filter(Boolean);

    if (!normalizedTranches.length) return null;

    const allocationSum = normalizedTranches.reduce((sum, tranche) => sum + Number(tranche.allocation || 0), 0);
    const normalizedState = String(userState || '').trim();
    const normalizedIncomeRange = String(userIncomeRange || '').trim();

    if (allocationSum <= 0 || !normalizedState || !normalizedIncomeRange) {
      return null;
    }

    return {
      investment_amount: Number(allocationSum.toFixed(2)),
      tranches: normalizedTranches,
      user_state: normalizedState,
      user_income_range: normalizedIncomeRange,
    };
  }, [simulationData, userIncomeRange, userState]);

  const rateRiskRequestKey = useMemo(
    () => JSON.stringify(rateRiskPayload || null),
    [rateRiskPayload],
  );

  useEffect(() => {
    const previousKey = rateRiskKeyRef.current;
    if (!previousKey) {
      rateRiskKeyRef.current = rateRiskRequestKey;
      return;
    }
    if (previousKey === rateRiskRequestKey) return;

    rateRiskKeyRef.current = rateRiskRequestKey;
    setRateRiskLoading(false);
    setRateRiskError('');
    setRateRiskData(null);
    setRateRiskLoadedKey('');
    setRateRiskSummaryLoading(false);
    setRateRiskSummaryError('');
    setRateRiskSummaryData(null);
    setRateRiskStale(Boolean(rateRiskData || rateRiskSummaryData || rateRiskLoadedKey));
  }, [rateRiskData, rateRiskLoadedKey, rateRiskRequestKey, rateRiskSummaryData]);

  const fetchRateRisk = async () => {
    if (rateRiskLoading || rateRiskRequestInFlightRef.current) return;
    if (simulationLoading) {
      setRateRiskError('Rate-risk scenarios will be available once the latest Bullet strategy finishes loading.');
      return;
    }
    if (!rateRiskPayload) {
      setRateRiskError('Complete your Bullet strategy inputs to view rate-risk scenarios.');
      return;
    }

    const requestKeyAtFetch = rateRiskRequestKey;
    const apiBase =
      import.meta.env.VITE_RANKING_API_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:8001';

    rateRiskRequestInFlightRef.current = true;
    setRateRiskLoading(true);
    setRateRiskError('');

    try {
      const response = await fetch(`${apiBase}/strategy/bullet/rate-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateRiskPayload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.detail || 'Failed to load rate-risk scenarios.');
      }

      const payload = await response.json();
      if (rateRiskKeyRef.current !== requestKeyAtFetch) {
        return;
      }
      setRateRiskData(payload);
      setRateRiskLoadedKey(requestKeyAtFetch);
      setRateRiskStale(false);
      setRateRiskSummaryError('');
      setRateRiskSummaryData(null);
    } catch (error) {
      if (rateRiskKeyRef.current !== requestKeyAtFetch) {
        return;
      }
      setRateRiskError(error?.message || 'Failed to load rate-risk scenarios.');
    } finally {
      rateRiskRequestInFlightRef.current = false;
      setRateRiskLoading(false);
    }
  };

  const handleToggleRateRisk = () => {
    const next = !rateRiskExpanded;
    setRateRiskExpanded(next);

    if (next && rateRiskLoadedKey !== rateRiskRequestKey) {
      fetchRateRisk();
    }
  };

  const generateRateRiskSummary = async () => {
    if (rateRiskSummaryLoading) return;
    if (!rateRiskData?.ai_summary_input) {
      setRateRiskSummaryError('Rate-risk summary input is not available yet. Please reload the scenarios and try again.');
      return;
    }
    if (rateRiskSummaryData) return;

    const aiBase = import.meta.env.VITE_AI_LAYER_URL;
    if (!aiBase) {
      console.warn('VITE_AI_LAYER_URL is not configured. Bullet rate-risk summaries require the AI layer service.');
      setRateRiskSummaryError('AI summary is not configured. Set VITE_AI_LAYER_URL and try again.');
      return;
    }

    setRateRiskSummaryLoading(true);
    setRateRiskSummaryError('');

    try {
      const response = await fetch(`${aiBase}/strategy/bullet/rate-risk/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_summary_input: rateRiskData.ai_summary_input,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          typeof payload?.detail === 'string'
            ? payload.detail
            : payload?.detail?.message || 'Unable to generate the rate-risk summary right now.';
        throw new Error(message);
      }

      const payload = await response.json().catch(() => ({}));
      const headline = String(payload?.headline ?? '').trim();
      const insight = String(payload?.insight ?? '').trim();
      if (!headline || !insight) {
        throw new Error('Rate-risk summary response was incomplete.');
      }

      setRateRiskSummaryData({ headline, insight });
    } catch (error) {
      setRateRiskSummaryData(null);
      setRateRiskSummaryError(error?.message || 'Unable to generate the rate-risk summary right now.');
    } finally {
      setRateRiskSummaryLoading(false);
    }
  };

  const simulationWarnings = useMemo(
    () => (Array.isArray(simulationData?.warnings) ? simulationData.warnings.filter(Boolean) : []),
    [simulationData],
  );

  const summaryRows = useMemo(() => {
    const rows = [];

    if (matchFilter(derived.purchaseNowPrimary)) {
      rows.push({
        key: derived.purchaseNowPrimary.id,
        type: 'Buy Now',
        provider: derived.purchaseNowPrimary.provider,
        productType: derived.purchaseNowPrimary.type,
        term: `${derived.purchaseNowPrimary.termMonths || 0} Months`,
        apy: `${derived.purchaseNowPrimary.nominal}%`,
        tax: `${derived.purchaseNowPrimary.tax}%`,
        allocation: derived.purchaseNowPrimary.allocation,
        date: derived.purchaseNowPrimary.maturityDate,
        dot: '#22C55E',
        projected: false,
      });
    }

    derived.futureGroups.forEach((group) => {
      if (matchFilter(group.primary)) {
        rows.push({
          key: group.primary.id,
          type: `In ${(() => {
            const match = String(group.slot || '').match(/buy in\s+(\d+)\s+months?/i);
            return match ? `${match[1]} Months` : 'Future';
          })()}`,
          provider: group.primary.provider,
          productType: group.primary.type,
          term: `${group.primary.termMonths || 0} Months`,
          apy: `${group.primary.nominal}%`,
          tax: `${group.primary.tax}%`,
          allocation: group.primary.allocation,
          date: group.primary.maturityDate,
          dot: '#0077FF',
          projected: true,
        });
      }
    });

    return rows;
  }, [derived, matchFilter]);

  const visibleSummaryRows = useMemo(() => {
    const rows = [];

    if (!nowCollapsed && matchFilter(derived.purchaseNowPrimary)) {
      rows.push(derived.purchaseNowPrimary.id);
    }

    if (!futureCollapsed) {
      derived.futureGroups.forEach((group) => {
        if (matchFilter(group.primary)) {
          rows.push(group.primary.id);
        }
      });
    }

    return rows;
  }, [derived, futureCollapsed, matchFilter, nowCollapsed]);

  const hasVisibleRows = useMemo(() => {
    const nowVisible = matchFilter(derived.purchaseNowPrimary);
    const futureVisible = derived.futureGroups.some((group) => matchFilter(group.primary));
    return nowVisible || futureVisible;
  }, [derived, matchFilter]);

  const allBulletProducts = useMemo(() => [
    derived.purchaseNowPrimary,
    ...(Array.isArray(derived.purchaseNowOthers) ? derived.purchaseNowOthers : []),
    ...derived.futureGroups.flatMap((group) => [
      group.primary,
      ...(Array.isArray(group.others) ? group.others : []),
    ]),
  ].filter(Boolean), [derived]);
  const allProductsLabel = `All Products (${allBulletProducts.length})`;
  const selectedFilterType = filterType.startsWith('All Products') ? allProductsLabel : filterType;

  return (
    <div className={`mx-auto w-full max-w-[1288px] ${isLightTheme ? 'text-[#0F172A]' : 'text-white'}`}>
      {!hideTitle && (
        <div className={`${embedded ? 'mb-6' : 'mb-8'}`}>
          <h1 className="text-[20px] font-bold leading-[28px]">Bullet Strategy</h1>
          <p className="text-[14px] leading-[20px] text-[#4A6A8A]">Compare all CDs with the best after-tax yields for your situation</p>
        </div>
      )}

      <section className="mb-8 w-full rounded-[10px] border border-[#1E2939] bg-[#122035] p-[30px]">
        <div className="flex w-full flex-col gap-4">
          <h2 className="text-[16px] font-normal leading-[20px] text-[#9E9E9E]">What is CD Bullet?</h2>
          <p className="max-w-[900px] text-[14px] font-normal leading-[24px] text-[#D1D5DC]">
            A Bullet strategy staggers your purchases across multiple CDs of different terms, all designed to mature on the same target date.
            <br />
            You buy some now and some later, so everything lands at the same time.
          </p>
        </div>

        <div className="mt-5 w-full rounded-[12px] border border-[rgba(245,158,11,0.52)] p-4 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.22)]">
          <div className="flex w-full flex-wrap items-start gap-x-10 gap-y-4">
            <DropdownField
              label="Target Maturity Date"
              value={term}
              options={BULLET_TERM_OPTIONS}
              onSelect={setTerm}
            />

            <DropdownField
              label="FILTER BY TYPE"
              value={selectedFilterType}
              options={[
                allProductsLabel,
                'Bank CDs',
                'Brokerage CDs',
                'Treasuries',
              ]}
              onSelect={setFilterType}
            />

            <div className="w-full max-w-[220px]">
              <div className="mb-[14px] text-[11px] font-bold uppercase tracking-[0.55px] text-[#94A3B8]">AMOUNT</div>
              <input
                value={`$ ${amount}`}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                className="h-9 w-full rounded-[8px] border border-[#1557F5] bg-[#0D1B2D] px-3 text-[14px] font-normal leading-[20px] text-white shadow-[0_0_0_1px_rgba(21,87,245,0.35)] outline-none transition-colors focus:border-[#2A4D78]"
              />
            </div>
          </div>

          <div className={`mt-3 text-[11px] leading-[1.35] ${isAmountBelowMinimum ? 'text-[#FCA5A5]' : 'text-[#64748B]'}`}>
            <span>💡 </span>
            <span className="italic">
              {isAmountBelowMinimum
                ? 'Warning: Please enter at least $5,000 to view Bullet strategy results.'
                : `All CDs in this strategy are selected to mature by ${maturityText} based on your ${term} term`}
            </span>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-8 text-[20px] font-bold leading-[28px] text-white">Your Bullet Strategy</h2>
        {simulationLoading && (
          <div className="mb-4 rounded-[10px] border border-[#23446A] bg-[#0D1B2D] px-4 py-3 text-[13px] text-[#9FB4D3]">
            Loading latest strategy simulation...
          </div>
        )}
        {simulationError && (
          <div className="mb-4 rounded-[10px] border border-[#5B1C1C] bg-[#2A1111] px-4 py-3 text-[13px] text-[#FCA5A5]">
            {simulationError}
          </div>
        )}
        {simulationWarnings.length > 0 && !simulationError && (
          <div className="mb-4 rounded-[10px] border border-[#5B4A1C] bg-[#2A2411] px-4 py-3 text-[13px] text-[#FCD34D]">
            <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#FDE68A]">Warnings</div>
            {simulationWarnings.map((w, idx) => (
              <div key={`${idx}-${w}`} className="leading-[1.45]">{w}</div>
            ))}
          </div>
        )}
        <div className={`overflow-hidden rounded-[12px] border ${isLightTheme ? 'border-[#E2E8F0] bg-white' : 'border-[#1E2939] bg-[#050D1F]'}`}>
          <div className={`hidden border-b px-[18px] pt-5 pb-[27px] text-[14px] font-bold leading-[1] text-[#94A3B8] md:grid ${isLightTheme ? 'border-[#E2E8F0]' : 'border-[#1E2939]'} ${DESKTOP_GRID}`}>
            <div className="whitespace-nowrap pl-3 text-left">PROVIDER / INSTITUTION</div>
            <div className="whitespace-nowrap text-left">PRODUCT TYPE</div>
            <div className="whitespace-nowrap text-left">NOMINAL RATE <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
            <div className="whitespace-nowrap text-left">AFTER TAX YIELD <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
            <div className="whitespace-nowrap text-left">ALLOCATION <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
            <div className="whitespace-nowrap pl-5 text-left">ACTIONS</div>
          </div>

          <div className="px-4 pb-5 pt-3">
            <SectionHeader
              title="Purchase Now"
              badge="Live Rates"
              note="Buy now to lock in today's rates"
              collapsed={nowCollapsed}
              onToggle={() => setNowCollapsed((v) => !v)}
              isLightTheme={isLightTheme}
            />
            {!nowCollapsed && (
              <div className={`mt-3 overflow-hidden rounded-[12px] shadow-none ${isLightTheme ? 'border border-[#E2E8F0] bg-white' : 'border border-[#1E2939] bg-[#050D1F]'}`}>
                {matchFilter(derived.purchaseNowPrimary) && (
                  <Row
                    row={derived.purchaseNowPrimary}
                    showOtherToggle={true}
                    expanded={showOtherNow}
                    onToggleOther={() => setShowOtherNow((v) => !v)}
                    taxOpen={Boolean(taxOpenById[derived.purchaseNowPrimary.id])}
                    onToggleTax={() => toggleTax(derived.purchaseNowPrimary.id)}
                    summaryState={summaryStateById[derived.purchaseNowPrimary.id] || 'idle'}
                    onGenerateSummary={() => generateSummary(derived.purchaseNowPrimary.id)}
                    onSetReminder={() => setShowReminderModal(true)}
                    highlight
                    seamless
                    isLightTheme={isLightTheme}
                  />
                )}
                {showOtherNow && derived.purchaseNowOthers.filter(matchFilter).map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    taxOpen={Boolean(taxOpenById[row.id])}
                    onToggleTax={() => toggleTax(row.id)}
                    summaryState={summaryStateById[row.id] || 'idle'}
                    onGenerateSummary={() => generateSummary(row.id)}
                    onSetReminder={() => setShowReminderModal(true)}
                    seamless
                    isLightTheme={isLightTheme}
                  />
                ))}
              </div>
            )}
          </div>

          <div className={`mx-4 border-t ${isLightTheme ? 'border-[#E2E8F0]' : 'border-[#1E3A5F]'}`} />

          <div className={`${isLightTheme ? 'bg-[#F8FAFC]' : 'bg-[#080F1C]'} px-4 pb-5 pt-4`}>
            <SectionHeader
              title="Purchase in the Future"
              badge="Projected Rates"
              note="Rates are projected and may change"
              collapsed={futureCollapsed}
              onToggle={() => setFutureCollapsed((v) => !v)}
              isLightTheme={isLightTheme}
            />
            {!futureCollapsed && derived.futureGroups.map((group) => (
              <div key={group.id} className={`mb-3 overflow-hidden rounded-[12px] last:mb-0 ${isLightTheme ? 'border border-[#E2E8F0] bg-white' : 'border border-[#1E2939] bg-[#050D1F]'}`}>
                {matchFilter(group.primary) && (
                  <Row
                    row={{ ...group.primary, slot: group.slot }}
                    future
                    showOtherToggle
                    expanded={Boolean(showOtherFuture[group.id])}
                    onToggleOther={() => setShowOtherFuture((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                    taxOpen={Boolean(taxOpenById[group.primary.id])}
                    onToggleTax={() => toggleTax(group.primary.id)}
                    summaryState={summaryStateById[group.primary.id] || 'idle'}
                    onGenerateSummary={() => generateSummary(group.primary.id)}
                    onSetReminder={() => setShowReminderModal(true)}
                    highlight
                    seamless
                    isLightTheme={isLightTheme}
                  />
                )}
                {Boolean(showOtherFuture[group.id]) &&
                  group.others.filter(matchFilter).map((row) => (
                    <Row
                      key={row.id}
                      row={row}
                      future
                      taxOpen={Boolean(taxOpenById[row.id])}
                      onToggleTax={() => toggleTax(row.id)}
                      summaryState={summaryStateById[row.id] || 'idle'}
                      onGenerateSummary={() => generateSummary(row.id)}
                      onSetReminder={() => setShowReminderModal(true)}
                      seamless
                      isLightTheme={isLightTheme}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
        {!hasVisibleRows && (
          <div className="mt-3 rounded-[10px] border border-[#23446A] bg-[#0D1B2D] px-4 py-3 text-[13px] text-[#9FB4D3]">
            No products match the selected filter for this strategy output.
          </div>
        )}
      </section>

      <BulletRateRiskPanel
        expanded={rateRiskExpanded}
        onToggle={handleToggleRateRisk}
        data={rateRiskData}
        loading={rateRiskLoading}
        error={rateRiskError}
        stale={rateRiskStale}
        onRetry={fetchRateRisk}
        summaryLoading={rateRiskSummaryLoading}
        summaryError={rateRiskSummaryError}
        summaryData={rateRiskSummaryData}
        onGenerateSummary={generateRateRiskSummary}
        isLightTheme={isLightTheme}
      />

      <section className="mb-3">
        <div className="mb-4 flex items-center justify-between gap-4 max-[520px]:items-start max-[520px]:flex-col">
          <h2 className="text-[20px] font-medium leading-[30px] text-white">Bullet Strategy Summary</h2>
          <button type="button" onClick={onExportPdf || (() => {})} className="flex h-12 w-[140px] items-center gap-[5px] rounded-[10px] border border-[#D886FF] bg-[#0D1117] p-3 text-white hover:bg-[#141c2a]">
            <DocumentIcon className="h-6 w-6 shrink-0 text-white" />
            <span className="h-6 w-[86px] text-center text-[16px] font-medium leading-6 text-white">
              Export PDF
            </span>
          </button>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[rgba(245,158,11,0.27)] bg-[#122035]">
          <div className={`hidden border-b border-[#1E2939] px-6 py-4 md:grid ${SUMMARY_GRID} md:items-center`}>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">TYPE</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">PROVIDER/INSTITUTION</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">TERM</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">ANNUAL APY</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">AFTER TAX YIELD</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">ALLOCATION</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">MATURITY DATE</div>
          </div>
          {summaryRows.map((row) => (
            <div key={row.key} className={`hidden min-h-[75px] border-b border-[#1E2939] px-6 py-4 md:grid ${SUMMARY_GRID} md:items-center last:border-b-0`}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: row.dot }} />
                <span className="text-[15px] font-normal leading-[22px] text-white">{row.type}</span>
              </div>
              <div className="flex min-w-0 items-center gap-3 pr-4">
                <BankBadge result={{ provider: row.provider, productType: row.productType }} />
                <span className="truncate text-[15px] font-normal leading-[22px] text-white">{row.provider}</span>
              </div>
              <div className="text-[15px] font-normal leading-[22px] text-white">{row.term}</div>
              <div className="text-[15px] font-normal leading-[22px] text-white">{row.apy}</div>
              <div className="text-[15px] font-medium leading-[18px] text-[#0077FF]">
                {row.projected ? (
                  <>
                    <div>{row.tax}</div>
                    <div className="text-[12px] font-medium leading-[18px] text-[#0077FF]">Projected</div>
                  </>
                ) : (
                  <span className="leading-[24px] text-[#16A34A]">{row.tax}</span>
                )}
              </div>
              <div className="text-[15px] font-normal leading-[22px] text-white">{row.allocation}</div>
              <div className="whitespace-nowrap text-[15px] font-normal leading-[22px] text-[#99A1AF]">{row.date}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-8 text-[14px] italic leading-[20px] text-[#6A7282]">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#0077FF]" />
        All CDs are selected to mature on or before {maturityText}. After-tax yield assumes your current tax profile.
      </div>
      {showReminderModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(255,255,255,0.20)] backdrop-blur-[3px] p-4">
          <div className="w-full max-w-[380px] rounded-[10px] border-4 border-[#1E3A5F] bg-[#152341] px-6 py-6 text-center shadow-[0_4px_4px_rgba(0,0,0,0.25),0_4px_4px_rgba(0,0,0,0.20)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E3A5F]">
              <BellIcon className="theme-keep-white h-7 w-7 text-white" />
            </div>
            <h3 className="theme-keep-white text-[18px] font-medium leading-[26px] text-white">Reminder notifications are coming soon.</h3>
            <p className="mx-auto mt-2 max-w-[320px] text-[13px] font-normal leading-5 text-[#99A1AF]">
              We&apos;re building this feature to help you get notified when projected purchases are close.
              <br />
              We&apos;ll let you know when this is available.
            </p>
            <button
              type="button"
              onClick={() => setShowReminderModal(false)}
              className="theme-keep-white mt-5 inline-flex h-10 min-w-[96px] items-center justify-center rounded-[8px] bg-[#0077FF] px-5 text-[15px] font-medium leading-6 text-white transition-colors hover:bg-[#1D83FF]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
