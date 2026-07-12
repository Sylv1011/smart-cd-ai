import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, DocumentIcon } from './Icons/index';
import Card from './Card';
import BankBadge from './BankBadge';

const HORIZON_OPTIONS = ['1', '2', '3', '4', '5'];
const FILTER_OPTIONS = ['All Products', 'Bank CDs', 'Brokerage CDs', 'Treasuries'];

const HORIZON_LABELS = {
  '1': '1 Year',
  '2': '2 Years',
  '3': '3 Years',
  '4': '4 Years',
  '5': '5 Years',
};

const formatDateLong = (d) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const formatDateShort = (d) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const addMonths = (date, months) => {
  const out = new Date(date);
  out.setMonth(out.getMonth() + months);
  return out;
};

const getProviderName = (product) =>
  product?.issuing_bank ||
  product?.institution_name ||
  product?.brokerage_firm ||
  'N/A';

const productTypeLabel = (product) => {
  const t = product?.product_type;
  if (t === 'treasury') return 'Treasuries';
  if (t === 'brokered_cd') return 'Brokerage CDs';
  if (t === 'bank_cd') return 'Bank CDs';
  return product?.product_type || '';
};

const DropdownField = ({ label, value, options, labelMap, onSelect, narrow = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={`w-full flex flex-col gap-[16px] ${narrow ? 'max-w-[220px]' : 'max-w-[278px]'}`}>
      <div className="mb-[14px] text-[11px] font-semibold uppercase tracking-[0.55px] text-[#94A3B8]">
        {label}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-full items-center justify-between rounded-[8px] border border-[#10B981] bg-[#0D1B2D] px-3 text-left shadow-[0_0_0_1px_rgba(16,185,129,0.35)] transition-colors hover:border-[#34D399]"
        >
          <span className="text-[14px] font-medium leading-[20px] text-white">
            {labelMap ? labelMap[value] : value}
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 text-[#94A3B8]/70 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-[8px] border border-[#1A3050] bg-[#0D1B2D] shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
            <div className="divide-y divide-[#1A3050]">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                  className={`block w-full border-0 bg-[#0D1B2D] px-3 py-2 text-left text-[13px] text-[#E2E8F0] outline-none transition-colors hover:bg-[#173257] focus:bg-[#173257] ${
                    opt === value ? 'bg-[#173257]' : ''
                  }`}
                >
                  {labelMap ? labelMap[opt] : opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, sub, value, subtitle, valueColor, last = false }) => (
  <div
    className="flex flex-col min-w-[160px] flex-1 px-[12px] items-center gap-[14px] py-4"
    style={!last ? { borderRight: '1px solid #2A4D78' } : {}}
  >
    <div className="mb-3 text-center text-[12px] text-[#6EE7B7]">
      {title}
      <br />
      {sub}
    </div>
    <div className={`text-[16px] font-bold ${valueColor}`}>{value}</div>
    <div className="text-[12px] text-white">{subtitle}</div>
  </div>
);

// Equal Split / Optimized allocation toggle
const AllocationToggle = ({ mode, onChange }) => (
  <div className="inline-flex overflow-hidden rounded-[8px] border border-[#1E3A2E]">
    {[
      { id: 'equal', label: 'Equal Split Allocation' },
      { id: 'optimized', label: 'Optimized Allocation' },
    ].map((opt) => {
      const active = mode === opt.id;
      return (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-4 py-2 text-[13px] font-medium transition-colors ${
            active ? 'bg-[#0D9488] text-white' : 'bg-[#0D1B2E] text-[#94A3B8] hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const LadderTimeline = ({ rungs, mode }) => {
  const today = new Date();
  const points = [
    { label: 'Today', date: formatDateShort(today), node: 'today' },
    ...rungs.map((r) => ({
      label: `${r.target_term_months} months`,
      date: formatDateShort(addMonths(today, Number(r.target_term_months || 0))),
      pct: mode === 'equal' ? Number(r.equal_allocation_pct || 0) : Number(r.allocation_pct || 0),
      amount: mode === 'equal' ? Number(r.equal_allocation_amount || 0) : Number(r.allocation_amount || 0),
      node: 'rung',
    })),
  ];
  const inset = 50 / points.length; // percent — aligns line ends with first/last node centers

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[600px] pt-1">
        <div
          className="absolute top-[54px] h-[2px] bg-[rgba(16,185,129,0.45)]"
          style={{ left: `${inset}%`, right: `${inset}%` }}
        />
        <div className="flex items-start justify-between">
          {points.map((p, i) => (
            <div key={i} className="flex flex-1 flex-col items-center px-1 text-center">
              <div className="h-[40px] leading-tight">
                <div className="text-[13px] font-semibold text-white">{p.label}</div>
                <div className="text-[11px] text-[#94A3B8]">({p.date})</div>
              </div>
              <div
                className={`relative z-10 my-2 h-[14px] w-[14px] rounded-full border-2 border-[#0B1623] ${
                  p.node === 'today' ? 'bg-[#6B7280]' : 'bg-[#10B981]'
                }`}
              />
              {p.node === 'rung' ? (
                <div className="mt-1 rounded-[8px] border border-[#1E2939] px-3 py-2">
                  <div className="text-[13px] font-bold text-[#34D399]">
                    {p.pct.toFixed(0)}% • ${p.amount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">Allocation</div>
                </div>
              ) : (
                <div className="mt-1 h-[52px]" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Compact alternative product row shown under "Other great options"
const AltRow = ({ product }) => (
  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-[#1E2939] px-3 py-3 text-sm">
    <div className="flex items-center gap-2">
      <BankBadge result={{ provider: getProviderName(product), productType: productTypeLabel(product) }} />
      <span className="text-xs text-white">{getProviderName(product)}</span>
    </div>
    <div className="text-[#94A3B8]">{productTypeLabel(product)}</div>
    <div className="font-bold text-white">
      {product?.apy_nominal != null ? Number(product.apy_nominal).toFixed(2) : 'N/A'}%
    </div>
    <div className="font-bold text-[#10B981]">
      {product?.after_tax_apy != null ? Number(product.after_tax_apy).toFixed(2) : 'N/A'}%
    </div>
    <div className="text-[#94A3B8]">
      ${Number(product?.minimum_deposit || 0).toLocaleString()} min
    </div>
  </div>
);

const SUMMARY_GRID =
  'grid grid-cols-[0.4fr_2fr_1fr_1fr_1.5fr_1.4fr_1.3fr] gap-x-4 items-center';

const SummaryRow = ({ rungNum, name, productType, term, nominal, tax, pct, deltaPct, amount, date }) => {
  const badge = { provider: name, productType };
  return (
    <div className={`${SUMMARY_GRID} py-3 border-t border-[rgba(16,185,129,0.20)] text-sm`}>
      <div className="text-[#6EE7B7] font-medium">#{rungNum}</div>
      <div className="flex items-center gap-[5px]">
        <BankBadge result={badge} />
        <span className="text-xs">{name}</span>
      </div>
      <div>{term} mo</div>
      <div>{nominal}%</div>
      <div className="text-[#10B981]">{tax}%</div>
      <div>
        <span className="font-medium text-white">{Number(pct || 0).toFixed(0)}%</span>
        <span className="ml-1 text-[11px] text-[#64748B]">${Number(amount || 0).toLocaleString()}</span>
        {deltaPct != null && Math.abs(deltaPct) >= 0.5 && (
          <span className={`ml-1 text-[11px] ${deltaPct >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
            {deltaPct >= 0 ? '+' : ''}{Number(deltaPct).toFixed(0)}% vs equal
          </span>
        )}
      </div>
      <div className="text-[#94A3B8] text-[11px]">{date}</div>
    </div>
  );
};

const LadderTab = ({
  initialFilterType = 'All Products',
  initialHorizon = '5',
  initialAmount = '20000',
  simulationLoading,
  simulationData,
  simulationError,
  onExportPdf,
  onControlsChange,
  onSelectStrategy,
}) => {
  const [filterType, setFilterType] = useState(initialFilterType);
  const [horizon, setHorizon] = useState(initialHorizon);
  const [amount, setAmount] = useState(initialAmount);
  const [expandedRungs, setExpandedRungs] = useState({});
  const [altsOpen, setAltsOpen] = useState({});
  const [allocationMode, setAllocationMode] = useState('optimized');

  useEffect(() => { setFilterType(initialFilterType); }, [initialFilterType]);
  useEffect(() => { setHorizon(initialHorizon); }, [initialHorizon]);
  useEffect(() => { setAmount(initialAmount); }, [initialAmount]);

  useEffect(() => {
    onControlsChange?.({
      filterType,
      horizon,
      amount: String(amount || '').replace(/[^0-9]/g, ''),
    });
  }, [filterType, horizon, amount]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRung = (rungNum) =>
    setExpandedRungs((prev) => ({ ...prev, [rungNum]: !prev[rungNum] }));
  const toggleAlts = (rungNum) =>
    setAltsOpen((prev) => ({ ...prev, [rungNum]: !prev[rungNum] }));

  const rungs = Array.isArray(simulationData?.rungs) ? simulationData.rungs : [];
  const portfolio = simulationData?.portfolio || {};
  const optimization = simulationData?.optimization || {};
  const scenarios = Array.isArray(simulationData?.simulation?.scenarios)
    ? simulationData.simulation.scenarios
    : [];
  const warnings = Array.isArray(simulationData?.warnings) ? simulationData.warnings : [];

  const ratesRise = scenarios.find((s) => s.name === 'rates_rise');
  const ratesFall = scenarios.find((s) => s.name === 'rates_fall');

  const firstRung = rungs[0];
  const lastRung = rungs[rungs.length - 1];

  const isEqual = allocationMode === 'equal';
  const rungPct = (rung) => (isEqual ? rung.equal_allocation_pct : rung.allocation_pct);
  const rungAmount = (rung) => (isEqual ? rung.equal_allocation_amount : rung.allocation_amount);

  const optimized = optimization.optimized || {};
  const equalSplit = optimization.equal_split || {};
  const displayBlendedApy = isEqual
    ? equalSplit.blended_after_tax_apy
    : (optimized.blended_after_tax_apy ?? simulationData?.blended_after_tax_apy);
  const displayReturn = isEqual
    ? equalSplit.after_tax_interest_usd
    : (optimized.after_tax_interest_usd ?? portfolio.after_tax_interest_usd);

  const hasData = rungs.length > 0;
  const shouldShowResults =
    simulationLoading || simulationError || hasData ||
    (simulationData && !hasData);

  useEffect(() => {
    setExpandedRungs({});
    setAltsOpen({});
  }, [simulationData]);

  const fmtMoney = (v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtPct = (v) => (v != null ? `${Number(v).toFixed(2)}%` : 'N/A');

  return (
    <div>
      {/* Controls panel */}
      <section className="relative mb-8 w-full rounded-[10px] bg-[#122035] p-[30px] transition-all duration-300">
        <div className="flex w-full flex-col gap-4">
          <h2 className="text-[16px] font-normal leading-[20px] text-[#9E9E9E]">
            What is CD Ladder?
          </h2>
          <p className="max-w-[900px] text-[14px] font-normal leading-[24px] text-[#D1D5DC]">
            A CD ladder staggers your investment across multiple CDs with different maturity dates.
            As each rung matures, you get liquidity — or roll it into a new long-term CD. It
            balances access to your money with the higher yields of longer-term CDs, and lets you
            adapt to changing rates over time.
          </p>
        </div>

        <div className="mt-5 w-full rounded-[12px] border border-[rgba(16,185,129,0.50)] p-4 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.22)]">
          <div className="flex w-full flex-wrap items-start gap-x-10 gap-y-4">
            <DropdownField
              label="Target Maturity Date"
              value={horizon}
              options={HORIZON_OPTIONS}
              labelMap={HORIZON_LABELS}
              onSelect={setHorizon}
              narrow
            />

            <DropdownField
              label="Filter By Type"
              value={filterType}
              options={FILTER_OPTIONS}
              onSelect={setFilterType}
            />

            <div className="flex flex-col gap-[16px] w-full max-w-[220px]">
              <div className="mb-[14px] text-[11px] font-semibold uppercase tracking-[0.55px] text-[#94A3B8]">
                Amount
              </div>
              <input
                value={`$ ${amount}`}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))
                }
                className="h-9 w-full rounded-[8px] border border-[#10B981] bg-[#0D1B2D] px-3 text-[14px] font-normal leading-[20px] text-white shadow-[0_0_0_1px_rgba(16,185,129,0.35)] outline-none transition-colors focus:border-[#34D399]"
              />
            </div>
          </div>

          <div className="mt-4 text-[11px] leading-[1.4] text-[#64748B]">
            <span className="italic">
              The optimizer weights each rung by its after-tax yield. Toggle to Equal Split to
              compare against an even allocation across every rung.
            </span>
          </div>
        </div>
      </section>

      {/* Results */}
      {shouldShowResults && (
        <div>
          <section className="flex flex-col gap-[38px] max-w-[1286px] mb-8">
            {simulationLoading && (
              <div className="mb-4 rounded-[10px] border border-[#23446A] bg-[#0D1B2D] px-4 py-3 text-[13px] text-[#9FB4D3]">
                Loading latest strategy simulation...
              </div>
            )}

            {simulationError && (
              <div className="mb-4 rounded-[10px] border border-[#5A2330] bg-[#2A1017] px-4 py-3 text-[13px] text-[#FCA5A5]">
                {simulationError}
              </div>
            )}

            {!hasData && !simulationLoading && !simulationError && simulationData && (
              <div className="mb-4 rounded-[10px] border border-[#23446A] bg-[#0D1B2D] px-4 py-3 text-[13px] text-[#9FB4D3]">
                No products were found for the selected parameters. Try adjusting your target maturity or investment amount.
              </div>
            )}

            {hasData && (
              <>
                {/* CD Ladder — Optimized: header (toggle + curve badge), timeline, portfolio stats */}
                <div className="flex flex-col gap-6 rounded-[12px] border border-[rgba(16,185,129,0.40)] bg-[#0B1623] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[16px] font-semibold tracking-[0.04em] text-white">
                        CD Ladder — {isEqual ? 'Equal Split' : 'Optimized'}
                      </span>
                      {simulationData.inverted_curve && (
                        <span className="rounded-full border border-[#F59E0C] px-3 py-1 text-[12px] font-semibold text-[#F59E0C]">
                          Inverted Curve Detected
                        </span>
                      )}
                    </div>
                    <AllocationToggle mode={allocationMode} onChange={setAllocationMode} />
                  </div>

                  <LadderTimeline rungs={rungs} mode={allocationMode} />

                  <div
                    className="flex flex-wrap items-center rounded-[12px]"
                    style={{ border: '1px solid #2A4D78' }}
                  >
                    <StatCard
                      title="Blended After"
                      sub="Tax APY"
                      value={displayBlendedApy != null ? `${Number(displayBlendedApy).toFixed(2)}%` : 'N/A'}
                      subtitle="(Estimated)"
                      valueColor="text-[#10B981]"
                    />
                    <StatCard
                      title="Estimated"
                      sub="Total Return"
                      value={displayReturn != null ? fmtMoney(displayReturn) : 'N/A'}
                      subtitle="After Taxes"
                      valueColor="text-[#34D399]"
                    />
                    <StatCard
                      title="Earliest"
                      sub="Liquidity Date"
                      value={
                        firstRung
                          ? formatDateLong(addMonths(new Date(), Number(firstRung.target_term_months || 0)))
                          : 'N/A'
                      }
                      subtitle={firstRung ? `${firstRung.target_term_months} Months Maturity` : ''}
                      valueColor="text-[#6EE7B7]"
                    />
                    <StatCard
                      title="Full Maturity"
                      sub="Date"
                      value={
                        lastRung
                          ? formatDateLong(addMonths(new Date(), Number(lastRung.target_term_months || 0)))
                          : 'N/A'
                      }
                      subtitle={lastRung ? `${lastRung.target_term_months} Months Maturity` : ''}
                      valueColor="text-[#10B981]"
                      last
                    />
                  </div>
                </div>

                {/* Why is your allocation not equal? + comparison */}
                {optimization.optimized && (
                  <div className="rounded-[12px] border border-[#1E2939] bg-[#0B1623] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[16px] font-semibold text-white">
                        Why is your allocation not equal?
                      </div>
                      {optimization.gain_usd != null && (
                        <span className="rounded-full bg-[rgba(16,185,129,0.15)] px-3 py-1 text-[13px] font-semibold text-[#34D399]">
                          {optimization.gain_usd >= 0 ? '+' : ''}{fmtMoney(optimization.gain_usd)} gain
                        </span>
                      )}
                    </div>
                    {simulationData.allocation_reason && (
                      <p className="mt-3 max-w-[920px] text-[13px] leading-[1.6] text-[#94A3B8]">
                        {simulationData.allocation_reason}
                      </p>
                    )}
                    <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[12px] border border-[#1E2939]">
                      <div className="border-r border-[#1E2939] p-5 text-center">
                        <div className="text-[13px] uppercase tracking-wide text-[#64748B]">Equal Split</div>
                        <div className="mt-3 text-[24px] font-bold text-[#94A3B8]">{fmtPct(equalSplit.blended_after_tax_apy)}</div>
                        <div className="mt-1 text-[13px] text-[#64748B]">{fmtMoney(equalSplit.after_tax_interest_usd)} return</div>
                      </div>
                      <div className="p-5 text-center">
                        <div className="text-[13px] uppercase tracking-wide text-[#34D399]">Optimized</div>
                        <div className="mt-3 text-[24px] font-bold text-[#34D399]">{fmtPct(optimized.blended_after_tax_apy)}</div>
                        <div className="mt-1 text-[13px] text-[#34D399]">{fmtMoney(optimized.after_tax_interest_usd)} return</div>
                        {optimization.gain_usd != null && (
                          <div className="mt-1 text-[13px] font-semibold text-[#34D399]">
                            +{fmtMoney(optimization.gain_usd)}
                            {optimization.gain_apy != null && ` • +${Number(optimization.gain_apy).toFixed(2)} APY`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Your Ladder Strategy: rung list */}
                <div className="text-[20px] text-[#FFFFFF]">Your Ladder Strategy</div>

                <div className="overflow-hidden rounded-[12px] border border-[#1E2939] pb-4">
                  {rungs.map((rung) => {
                    const product = rung.product;
                    const maturityDate = formatDateLong(
                      addMonths(new Date(), Number(rung.target_term_months || 0))
                    );
                    const isExpanded = expandedRungs[rung.rung] !== false;
                    const alternatives = Array.isArray(rung.alternatives) ? rung.alternatives : [];
                    const showAlts = altsOpen[rung.rung] === true;

                    return (
                      <div key={rung.rung} className="border-b border-[#1E2939] last:border-b-0">
                        <div className="flex items-center justify-between p-3">
                          <div
                            className="flex items-center gap-2 text-[20px] text-[#FFFFFF] cursor-pointer"
                            onClick={() => toggleRung(rung.rung)}
                          >
                            <span className="text-[#6EE7B7] text-[16px] font-semibold">
                              Rung {rung.rung}
                            </span>
                            <span className="text-[#94A3B8] text-[14px]">—</span>
                            <span className="text-[14px] text-[#D1D5DC]">
                              Matures {maturityDate}
                            </span>
                            <ChevronDownIcon
                              className={`h-[15px] w-[15px] transition-transform duration-300 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </div>

                          <div className="text-right text-[14px] text-[#99A1AF]">
                            {rung.target_term_months} months •{' '}
                            {Number(rungPct(rung) || 0).toFixed(1)}% •{' '}
                            ${Number(rungAmount(rung) || 0).toLocaleString()}
                          </div>
                        </div>

                        <div
                          className={`mx-4 overflow-hidden transition-all duration-300 ${
                            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          {product && (
                            <div className="rounded-lg border border-[#1E2939] mb-4">
                              <Card info={product} primary hideOptions />
                            </div>
                          )}

                          {alternatives.length > 0 && (
                            <div className="mb-4">
                              <button
                                type="button"
                                onClick={() => toggleAlts(rung.rung)}
                                className="flex items-center gap-1 text-[13px] font-medium text-[#6EE7B7]"
                              >
                                Other great options ({alternatives.length})
                                <ChevronDownIcon
                                  className={`h-[13px] w-[13px] transition-transform ${showAlts ? 'rotate-180' : ''}`}
                                />
                              </button>
                              {showAlts && (
                                <div className="mt-2 rounded-lg border border-[#1E2939]">
                                  {alternatives.map((alt, i) => (
                                    <AltRow key={i} product={alt} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rate scenarios */}
                {(ratesRise || ratesFall) && (
                  <div>
                    <div className="mb-4 text-[16px] text-[#FFFFFF]">Rate Sensitivity</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {ratesRise && (
                        <div className="rounded-[12px] border border-[rgba(16,185,129,0.40)] bg-[#0A1F14] p-5">
                          <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#6EE7B7]">
                            If Rates Rise ↑
                          </div>
                          <div className="text-[26px] font-bold text-[#10B981]">
                            ${Number(ratesRise.estimated_after_tax_interest_usd || 0).toLocaleString()}
                          </div>
                          <div className="mt-1 text-[12px] text-[#64748B]">
                            estimated after-tax interest
                          </div>
                          {ratesRise.description && (
                            <div className="mt-3 text-[12px] leading-[1.5] text-[#94A3B8]">
                              {ratesRise.description}
                            </div>
                          )}
                        </div>
                      )}
                      {ratesFall && (
                        <div className="rounded-[12px] border border-[rgba(100,116,139,0.40)] bg-[#111827] p-5">
                          <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">
                            If Rates Fall ↓
                          </div>
                          <div className="text-[26px] font-bold text-[#64748B]">
                            ${Number(ratesFall.estimated_after_tax_interest_usd || 0).toLocaleString()}
                          </div>
                          <div className="mt-1 text-[12px] text-[#64748B]">
                            estimated after-tax interest
                          </div>
                          {ratesFall.description && (
                            <div className="mt-3 text-[12px] leading-[1.5] text-[#94A3B8]">
                              {ratesFall.description}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-[11px] italic text-[#64748B]">
                      Scenario projections assume a uniform ±0.5% rate shift across all rungs at
                      the time of renewal.
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="rounded-[10px] border border-[#5B4A1C] bg-[#2A2411] px-4 py-3 text-[13px] text-[#FCD34D]">
                    <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#FDE68A]">
                      Warnings
                    </div>
                    {warnings.map((w, idx) => (
                      <div key={`${idx}-${w}`} className="leading-[1.45]">
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Summary table */}
          {hasData && (
            <section className="flex flex-col gap-[20px] max-w-[1286px]">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <span className="text-[20px] text-white">Ladder Strategy Summary</span>
                  <span className="rounded-full bg-[#0D9488] px-3 py-1 text-[12px] font-semibold text-white">
                    Optimized Allocation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onExportPdf || (() => {})}
                  className="flex h-12 w-[150px] items-center justify-center gap-[8px] rounded-[10px] bg-[#0D9488] p-3 text-white transition-colors hover:bg-[#0F766E]"
                >
                  <DocumentIcon className="h-6 w-6 shrink-0 text-white" />
                  <span className="text-[16px] font-medium leading-6 text-white">Export PDF</span>
                </button>
              </div>

              {optimization.optimized && (
                <p className="px-2 text-[13px] leading-[1.6] text-[#94A3B8]">
                  The ladder strategy is spread across{' '}
                  <span className="font-semibold text-white">
                    {simulationData.provider_count ?? rungs.length}{' '}
                    {(simulationData.provider_count ?? rungs.length) === 1 ? 'provider' : 'providers'}
                  </span>{' '}
                  and {rungs.length} {rungs.length === 1 ? 'rung' : 'rungs'},
                  delivering a blended after-tax APY of{' '}
                  <span className="font-semibold text-white">{fmtPct(optimized.blended_after_tax_apy)}</span>{' '}
                  and an estimated after-tax return of{' '}
                  <span className="font-semibold text-white">{fmtMoney(optimized.after_tax_interest_usd)}</span>.
                  {optimization.gain_usd != null && (
                    <>
                      {' '}Optimization adds approximately{' '}
                      <span className="font-semibold text-white">{fmtMoney(optimization.gain_usd)}</span>{' '}
                      in additional earnings while maintaining a full maturity date of{' '}
                      <span className="font-semibold text-white">
                        {lastRung ? formatDateLong(addMonths(new Date(), Number(lastRung.target_term_months || 0))) : 'N/A'}
                      </span>.
                    </>
                  )}
                </p>
              )}

              <div className="rounded-[12px] border border-[rgba(16,185,129,1)] bg-[#0D1B2D] py-2 text-[16px] text-[#D1D5DC]">
                <div
                  className={`${SUMMARY_GRID} px-3 py-2 text-xs text-[#7C8FA6] uppercase tracking-wider font-bold`}
                >
                  <div>RUNG</div>
                  <div>PROVIDER/INSTITUTION</div>
                  <div>TERM</div>
                  <div>NOMINAL</div>
                  <div>AFTER TAX YIELD</div>
                  <div>OPTIMIZED ALLOCATION</div>
                  <div>MATURITY DATE</div>
                </div>

                <div className="mx-3">
                  {rungs.map((rung) => {
                    const product = rung.product;
                    const maturityDate = formatDateLong(
                      addMonths(new Date(), Number(rung.target_term_months || 0))
                    );
                    return (
                      <SummaryRow
                        key={rung.rung}
                        rungNum={rung.rung}
                        name={getProviderName(product)}
                        productType={productTypeLabel(product)}
                        term={rung.target_term_months}
                        nominal={product?.apy_nominal != null ? Number(product.apy_nominal).toFixed(2) : 'N/A'}
                        tax={product?.after_tax_apy != null ? Number(product.after_tax_apy).toFixed(2) : 'N/A'}
                        pct={rung.allocation_pct}
                        deltaPct={rung.delta_pct}
                        amount={rung.allocation_amount}
                        date={maturityDate}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default LadderTab;
