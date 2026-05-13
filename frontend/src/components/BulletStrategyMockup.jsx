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
        <div className="absolute left-0 top-[72px] z-20 w-full overflow-hidden rounded-[8px] border border-[#1A3050] bg-[#0D1B2D] shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
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

const SectionHeader = ({ title, badge, note }) => (
  <div className="mb-3 flex items-center justify-between gap-4 max-[760px]:items-start max-[760px]:flex-col">
    <div className="flex min-w-0 items-center gap-2 text-[20px] font-medium leading-[28px] text-white max-[520px]:text-[17px]">
      <span>{title}</span>
      <span className={`rounded-[4px] px-2 py-1 text-[11px] font-medium leading-[16px] text-white ${badge === 'Live Rates' ? 'bg-[#00A63E]' : 'bg-[#0077FF]'}`}>{badge}</span>
      <ChevronDownIcon className="h-4 w-4 text-[#6A7282]" />
    </div>
    <div className="text-[14px] leading-[20px] text-[#99A1AF] max-[520px]:text-[12px]">{note}</div>
  </div>
);

const Rate = ({ value, tone = 'text-white', projected = false }) => (
  <div className={`${tone} text-left text-[26px] font-bold leading-none max-[520px]:text-[22px]`}>
    {value}<span className="ml-2 text-[13px] font-medium">%</span>
    {projected && <div className="mt-1 text-[12px] font-normal leading-[13px] text-[#0077FF]">Projected<br />(33% allocation)</div>}
  </div>
);

const DESKTOP_GRID = 'md:grid-cols-[330px_180px_150px_170px_130px_254px]';

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
}) => {
  const result = { provider: row.provider, productType: row.type };

  return (
    <div className={`${seamless ? 'rounded-none border-0 border-b border-[#1E2939] px-[8px] py-5 last:border-b-0' : 'rounded-[10px] border border-[#1E2939] px-3 py-3'} ${highlight ? 'min-h-[141px] bg-[#050D1F]' : 'bg-[#050D1F]'}`}>
      {future && row.slot && <div className="mb-2 inline-flex rounded-full bg-[#0077FF] px-3 py-1 text-[12px] leading-none text-white">{row.slot}</div>}
      {!future && row.badge && <div className="mb-2 inline-flex rounded-full bg-[#22C55E] px-3 py-1 text-[12px] leading-none text-white">{row.badge}</div>}
      <div className={`grid items-center gap-0 ${DESKTOP_GRID} ${highlight ? 'min-h-[82px]' : ''}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={`${highlight ? 'h-[100px] opacity-100' : 'h-[68px] opacity-0'} w-1 shrink-0 rounded ${future ? 'bg-[#22C55E]' : 'bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)]'}`} />
          <BankBadge result={result} />
          <div className="min-w-0">
            <div className="text-[16px] font-bold leading-[20px] text-white">{row.provider}</div>
            <div className="text-[11px] font-normal leading-[16px] text-[#4A7A9A]">{row.sub}</div>
          </div>
        </div>
        <div className="text-[16px] font-bold text-white md:text-left max-[760px]:pl-[56px]">{row.type}</div>
        <div className="md:text-left"><Rate value={row.nominal} /></div>
        <div className="md:text-left"><Rate value={row.tax} tone={future ? 'text-[#0077FF]' : 'text-[#22C55E]'} projected={future} /></div>
        <div className="text-[18px] font-bold text-white md:text-left max-[760px]:text-left">{row.dep}</div>
        <div className="flex items-center justify-start gap-3 max-[760px]:pl-[56px] max-[520px]:flex-wrap">
          <button
            type="button"
            onClick={onToggleTax}
            className={`inline-flex h-[43px] w-[145px] items-center justify-center gap-2 rounded-[10px] border-0 px-2 py-2 text-[14px] font-semibold leading-[24px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] outline-none ring-0 transition-colors ${
              taxOpen ? 'bg-[#0D1B2E] text-[#F59E0C] shadow-[inset_0_0_0_1px_#F59E0C,0_4px_4px_rgba(0,0,0,0.25)]' : 'bg-[#1A3050] text-white hover:bg-[#254873]'
            }`}
          >
            <span className="whitespace-nowrap">Tax Breakdown</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${taxOpen ? 'rotate-180 text-[#F59E0C]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => window.open(row.providerUrl, '_blank', 'noopener,noreferrer')}
            className={`inline-flex h-[38px] w-[110px] items-center justify-center gap-2 rounded-[10px] border px-2 py-2 text-[14px] font-semibold leading-[24px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-all ${
              future ? 'border-[#DCE6F7] bg-white text-[#155DFC] hover:bg-[#eaf1ff]' : 'border-[#E2E8F0] bg-white text-[#1A3050] hover:bg-[#eef3fb]'
            }`}
          >
            Provider <ExternalLinkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {taxOpen && (
        <div className="relative mt-2 h-[264px] w-full border border-[#071710] bg-[#050D1F]">
          <div className="absolute left-[22px] top-[22px] h-[231px] w-[572px] border border-[#0E2818] bg-[linear-gradient(180deg,#071810_0%,#050E0A_100%)]">
            <div className="px-[20px] pt-[12px] text-[13px] font-bold text-white">Read Tax Break down</div>
            <div className="px-[20px] pt-[24px]">
              <div className="flex h-[14px] items-center justify-between text-[12.5px] leading-none">
                <span className="font-normal text-[#7AAAC0]">Interest Earned :</span>
                <span className="w-[80px] text-right font-bold text-[#22C55E]">$2,475.00</span>
              </div>
              <div className="mt-[21px] flex h-[14px] items-center justify-between text-[12.5px] leading-none">
                <span className="font-normal text-[#7AAAC0]">Total Tax :</span>
                <span className="w-[80px] text-right font-bold text-[#EF4444]">-$594.00</span>
              </div>
              <div className="mt-[20px] flex h-[14px] items-center justify-between text-[12.5px] leading-none">
                <span className="font-normal text-[#7AAAC0]">Total Savings :</span>
                <span className="w-[80px] text-right font-bold text-[#22C55E]">$329.18</span>
              </div>
            </div>
            <div className="mx-[12px] mt-[34px] rounded-[10px] border border-[#1A4A28] bg-[linear-gradient(180deg,#0A2A18_0%,#071E10_100%)] px-[10px] py-[9px] shadow-[inset_0_0_0_1px_rgba(34,197,94,0.22)]">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-white">Net Return :</span>
                <span className="text-[17px] font-bold text-[#22C55E]">$1,881.00</span>
              </div>
            </div>
          </div>

          <div
            className={`absolute left-[617px] w-[628px] overflow-hidden rounded-[12px] p-0 ${
              summaryState === 'idle'
                ? 'top-[28px] h-[52px] border border-[#1557F5] bg-[#07170F] shadow-[inset_0_0_0_1px_rgba(140,194,255,0.26)]'
                : 'top-[22px] h-[231px] border border-[#1557F5] bg-[linear-gradient(180deg,#07170F_0%,#06120D_100%)] shadow-[inset_0_0_0_1px_rgba(140,194,255,0.18)]'
            }`}
          >
            <div
              className={`flex items-center pl-[27px] pr-[62px] ${
                summaryState === 'idle'
                  ? 'relative h-full pl-0 pr-0'
                  : 'relative mt-[6px] h-[52px] rounded-[12px] border border-[rgba(21,87,245,0.45)] bg-[#07170F] pl-0 pr-0'
              }`}
            >
              {summaryState === 'idle' ? (
                <>
                  <div className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none text-white">Why this Fits</div>
                  <div className="absolute left-[212px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none text-[#22C55E]">99% Match</div>
                  <button
                    type="button"
                    onClick={onGenerateSummary}
                    className="absolute left-[411px] top-1/2 inline-flex h-[28px] w-[155px] -translate-y-1/2 items-center justify-center gap-1 rounded-[8px] border border-[#6A9ABE] bg-transparent px-[6px] py-[5px] text-[12px] font-bold leading-none text-[#6A9ABE] shadow-[inset_0_0_0_1px_rgba(106,154,190,0.35)] hover:bg-[#0f2a1f]"
                  >
                    <SparkleIcon className="h-[11px] w-[11px] text-[#6A9ABE]" />
                    <span>Generate Summary</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="absolute left-[16px] top-1/2 -translate-y-1/2 whitespace-nowrap text-[14px] font-bold leading-none text-white">Why this Fits</div>
                  <div className="absolute left-[244px] top-1/2 -translate-y-1/2 text-[12px] font-bold leading-none text-[#3A6090]">Match Score</div>
                  <div className="absolute left-[352px] top-1/2 h-[6px] w-[180px] -translate-y-1/2 rounded-full bg-[#0D2A1F]">
                    <div className="h-[6px] w-[99%] rounded-full bg-[#22C55E]" />
                  </div>
                  <div className="absolute right-[18px] top-1/2 -translate-y-1/2 text-[18px] font-bold leading-none text-[#22C55E]">99%</div>
                </>
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
          className={`inline-flex appearance-none items-center gap-1 border-0 bg-transparent pl-1 text-[14px] font-normal leading-[20px] text-white shadow-none outline-none transition-colors hover:text-[#c7d7ee] ${highlight ? 'mt-1' : 'mt-2'}`}
        >
          Other great options
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default function BulletStrategyMockup({ embedded = false, hideTitle = false }) {
  const [term, setTerm] = useState('12 months');
  const [filterType, setFilterType] = useState('All Products (3)');
  const [amount, setAmount] = useState('20000');
  const [showOtherNow, setShowOtherNow] = useState(true);
  const [showOtherFuture, setShowOtherFuture] = useState({});
  const [taxOpenById, setTaxOpenById] = useState({});
  const [summaryStateById, setSummaryStateById] = useState({});
  const timersRef = useRef({});

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
    if (term === '6 months') return 'November 20, 2026';
    if (term === '3 months') return 'August 20, 2026';
    return 'May 20, 2027';
  }, [term]);

  return (
    <div className="mx-auto w-full max-w-[1288px] text-white">
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
              options={['3 months', '6 months', '12 months']}
              onSelect={setTerm}
            />

            <DropdownField
              label="FILTER BY TYPE"
              value={filterType}
              options={['All Products (3)', 'Bank CDs', 'Brokerage CDs', 'Treasuries']}
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

          <div className="mt-3 text-[11px] leading-[1.35] text-[#64748B]">
            <span>💡 </span>
            <span className="italic">All CDs in this strategy are selected to mature by {maturityText} based on your {term} term</span>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-8 text-[20px] font-bold leading-[28px] text-white">Your Bullet Strategy</h2>
        <div className="overflow-hidden rounded-[12px] border border-[#1E2939] bg-[#050D1F]">
          <div className={`hidden border-b border-[#1E2939] px-[18px] pt-5 pb-[27px] text-[14px] font-bold leading-[1] text-[#94A3B8] md:grid ${DESKTOP_GRID}`}>
            <div className="whitespace-nowrap pl-3 text-left">PROVIDER / INSTITUTION</div>
            <div className="whitespace-nowrap text-left">PRODUCT TYPE</div>
            <div className="whitespace-nowrap text-left">NOMINAL RATE <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
            <div className="whitespace-nowrap text-left">AFTER TAX YIELD <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
            <div className="whitespace-nowrap text-left">MIN. DEPOSIT <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
            <div className="whitespace-nowrap pl-5 text-left">ACTIONS</div>
          </div>

          <div className="border-b border-[#1E2939] px-4 py-3">
            <SectionHeader title="Purchase Now" badge="Live Rates" note="Buy now to lock in today's rates" />
            <div className="overflow-hidden rounded-[12px] border border-[#1E2939] bg-[#050D1F] shadow-none">
              <Row
                row={purchaseNowPrimary}
                showOtherToggle={true}
                expanded={showOtherNow}
                onToggleOther={() => setShowOtherNow((v) => !v)}
                taxOpen={Boolean(taxOpenById[purchaseNowPrimary.id])}
                onToggleTax={() => toggleTax(purchaseNowPrimary.id)}
                summaryState={summaryStateById[purchaseNowPrimary.id] || 'idle'}
                onGenerateSummary={() => generateSummary(purchaseNowPrimary.id)}
                highlight
                seamless
              />
              {showOtherNow && purchaseNowOthers.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  taxOpen={Boolean(taxOpenById[row.id])}
                  onToggleTax={() => toggleTax(row.id)}
                  summaryState={summaryStateById[row.id] || 'idle'}
                  onGenerateSummary={() => generateSummary(row.id)}
                  seamless
                />
              ))}
            </div>
          </div>

          <div className="px-4 py-3">
            <SectionHeader title="Purchase in the Future" badge="Projected Rates" note="Rates are projected and may change" />
            {futureGroups.map((group) => (
              <div key={group.id} className="mb-3 overflow-hidden rounded-[12px] border border-[#1E2939] bg-[#050D1F] last:mb-0">
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
                  highlight
                  seamless
                />
                {Boolean(showOtherFuture[group.id]) &&
                  group.others.map((row) => (
                    <Row
                      key={row.id}
                      row={row}
                      future
                      taxOpen={Boolean(taxOpenById[row.id])}
                      onToggleTax={() => toggleTax(row.id)}
                      summaryState={summaryStateById[row.id] || 'idle'}
                      onGenerateSummary={() => generateSummary(row.id)}
                      seamless
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-3">
        <div className="mb-4 flex items-center justify-between gap-4 max-[520px]:items-start max-[520px]:flex-col">
          <h2 className="text-[20px] font-medium leading-[30px] text-white">Bullet Strategy Summary</h2>
          <button type="button" className="inline-flex items-center gap-2 rounded-[8px] border border-transparent bg-[#0D1117] px-3 py-2 text-[14px] font-medium leading-[20px] text-white shadow-none hover:bg-[#141c2a]">
            <DocumentIcon className="h-4 w-4" /> Export PDF
          </button>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[rgba(245,158,11,0.27)] bg-[#122035]">
          <div className="hidden border-b border-[#1E2939] px-6 py-4 md:grid md:grid-cols-[150px_290px_130px_140px_180px_140px_170px] md:items-center">
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">TYPE</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">PROVIDER/INSTITUTION</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">TERM</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">ANNUAL APY</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">AFTER TAX YIELD</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">MIN. DEPOSIT</div>
            <div className="text-[14px] font-bold leading-[20px] text-[#99A1AF]">MATURITY DATE</div>
          </div>
          {summary.map((row) => (
            <div key={row.type} className="hidden h-[75px] border-b border-[#1E2939] px-6 md:grid md:grid-cols-[150px_290px_130px_140px_180px_140px_170px] md:items-center last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: row.dot }} />
                <span className="whitespace-nowrap text-[16px] font-normal leading-[24px] text-white">{row.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <BankBadge result={{ provider: row.provider, productType: row.provider === 'US Treasury' ? 'Treasuries' : 'Bank CDs' }} />
                <span className="whitespace-nowrap text-[16px] font-normal leading-[24px] text-white">{row.provider}</span>
              </div>
              <div className="whitespace-nowrap text-[16px] font-normal leading-[24px] text-white">{row.term}</div>
              <div className="whitespace-nowrap text-[16px] font-normal leading-[24px] text-white">{row.apy}</div>
              <div className="text-[16px] font-medium leading-[18px] text-[#0077FF]">
                {row.projected ? (
                  <>
                    <div>{row.tax}</div>
                    <div className="text-[12px] font-medium leading-[18px] text-[#0077FF]">Projected</div>
                  </>
                ) : (
                  <span className="leading-[24px] text-[#16A34A]">{row.tax}</span>
                )}
              </div>
              <div className="whitespace-nowrap text-[16px] font-normal leading-[24px] text-white">{row.dep}</div>
              <div className="whitespace-nowrap text-[16px] font-normal leading-[24px] text-[#99A1AF]">{row.date}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-8 text-[14px] italic leading-[20px] text-[#6A7282]">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#0077FF]" />
        All CDs are selected to mature on or before May 20, 2027. After-tax yield assumes New York (NY) tax profile
      </div>
    </div>
  );
}
