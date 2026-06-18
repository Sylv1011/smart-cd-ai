import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, DocumentIcon } from './Icons/index';
import Card from './Card';
import BankBadge from './BankBadge';

const LIQUIDITY_OPTIONS = ['low', 'medium', 'high'];
const HORIZON_OPTIONS = ['1', '2', '3', '4', '5'];

const LIQUIDITY_LABELS = {
  low: 'Low — maximize long-term yield',
  medium: 'Medium — balanced',
  high: 'High — maximize near-term access',
};

const HORIZON_LABELS = {
  '1': '1 Year',
  '2': '2 Years',
  '3': '3 Years',
  '4': '4 Years',
  '5': '5 Years',
};

const formatDateLong = (d) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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
    <div className="text-[12px] text-[#FFFFFF]">{subtitle}</div>
  </div>
);

const SUMMARY_GRID =
  'grid grid-cols-[0.4fr_2fr_1fr_1fr_1.5fr_1fr_1.3fr] gap-x-4 items-center';

const SummaryRow = ({ rungNum, name, productType, term, nominal, tax, allocation, date }) => {
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
      <div>${Number(allocation || 0).toLocaleString()}</div>
      <div className="text-[#94A3B8] text-[11px]">{date}</div>
    </div>
  );
};

const LadderTab = ({
  initialLiquidity = 'medium',
  initialHorizon = '5',
  initialAmount = '20000',
  simulationLoading,
  simulationData,
  simulationError,
  onExportPdf,
  onControlsChange,
  onSelectStrategy,
}) => {
  const [liquidity, setLiquidity] = useState(initialLiquidity);
  const [horizon, setHorizon] = useState(initialHorizon);
  const [amount, setAmount] = useState(initialAmount);
  const [expandedRungs, setExpandedRungs] = useState({});

  useEffect(() => { setLiquidity(initialLiquidity); }, [initialLiquidity]);
  useEffect(() => { setHorizon(initialHorizon); }, [initialHorizon]);
  useEffect(() => { setAmount(initialAmount); }, [initialAmount]);

  useEffect(() => {
    onControlsChange?.({
      liquidity,
      horizon,
      amount: String(amount || '').replace(/[^0-9]/g, ''),
    });
  }, [liquidity, horizon, amount]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRung = (rungNum) =>
    setExpandedRungs((prev) => ({ ...prev, [rungNum]: !prev[rungNum] }));

  const rungs = Array.isArray(simulationData?.rungs) ? simulationData.rungs : [];
  const portfolio = simulationData?.portfolio || {};
  const scenarios = Array.isArray(simulationData?.simulation?.scenarios)
    ? simulationData.simulation.scenarios
    : [];
  const warnings = Array.isArray(simulationData?.warnings) ? simulationData.warnings : [];

  const ratesRise = scenarios.find((s) => s.name === 'rates_rise');
  const ratesFall = scenarios.find((s) => s.name === 'rates_fall');

  const hasData = rungs.length > 0;
  const shouldShowResults =
    simulationLoading || simulationError || hasData ||
    (simulationData && !hasData);

  useEffect(() => {
    setExpandedRungs({});
  }, [simulationData]);

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
              label="Liquidity Preference"
              value={liquidity}
              options={LIQUIDITY_OPTIONS}
              labelMap={LIQUIDITY_LABELS}
              onSelect={setLiquidity}
            />

            <DropdownField
              label="Time Horizon"
              value={horizon}
              options={HORIZON_OPTIONS}
              labelMap={HORIZON_LABELS}
              onSelect={setHorizon}
              narrow
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
              Liquidity preference shifts allocation weight toward shorter or longer rungs.
              Higher liquidity = more weight on the shorter end.
            </span>
          </div>
        </div>
      </section>

      {/* Results */}
      {shouldShowResults && (
        <div>
          <section className="flex flex-col gap-[38px] max-w-[1286px] mb-8">
            <div className="text-[20px] text-[#FFFFFF]">Your Ladder Strategy</div>

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
                No products were found for the selected parameters. Try adjusting your time horizon or investment amount.
              </div>
            )}

            {hasData && (
              <>
                {/* Stats row */}
                <div
                  className="flex flex-wrap items-center rounded-[12px]"
                  style={{ border: '1px solid #2A4D78' }}
                >
                  <StatCard
                    title="Blended After"
                    sub="Tax APY"
                    value={
                      simulationData.blended_after_tax_apy != null
                        ? `${Number(simulationData.blended_after_tax_apy).toFixed(2)}%`
                        : 'N/A'
                    }
                    subtitle="(Estimated)"
                    valueColor="text-[#10B981]"
                  />
                  <StatCard
                    title="Total After-Tax"
                    sub="Interest"
                    value={
                      portfolio.after_tax_interest_usd != null
                        ? `$${Number(portfolio.after_tax_interest_usd).toLocaleString()}`
                        : 'N/A'
                    }
                    subtitle="After Taxes"
                    valueColor="text-[#34D399]"
                  />
                  <StatCard
                    title="Rungs"
                    sub="(Maturities)"
                    value={rungs.length}
                    subtitle={`${HORIZON_LABELS[horizon] || horizon} horizon`}
                    valueColor="text-[#6EE7B7]"
                  />
                  <StatCard
                    title="Total"
                    sub="Invested"
                    value={`$${Number(simulationData.total_investment || 0).toLocaleString()}`}
                    subtitle="Across all rungs"
                    valueColor="text-[#10B981]"
                    last
                  />
                </div>

                {/* Rung sections */}
                <div className="overflow-hidden rounded-[12px] border border-[#1E2939] pb-4">
                  {rungs.map((rung) => {
                    const product = rung.product;
                    const maturityDate = formatDateLong(
                      addMonths(new Date(), Number(rung.target_term_months || 0))
                    );
                    const isExpanded = expandedRungs[rung.rung] !== false;

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
                            {Number(rung.allocation_pct || 0).toFixed(1)}% •{' '}
                            ${Number(rung.allocation_amount || 0).toLocaleString()}
                          </div>
                        </div>

                        <div
                          className={`mx-4 overflow-hidden transition-all duration-300 ${
                            isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          {product && (
                            <div className="rounded-lg border border-[#1E2939] mb-4">
                              <Card info={product} primary />
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
            <section className="flex flex-col gap-[30px] max-w-[1286px]">
              <div className="text-[20px] text-white flex justify-between px-2">
                <div>Ladder Strategy Summary</div>
                <button
                  type="button"
                  onClick={onExportPdf || (() => {})}
                  className="flex h-12 w-[140px] items-center gap-[5px] rounded-[10px] border border-[#10B981] bg-[#0D1117] p-3"
                >
                  <DocumentIcon className="h-6 w-6 shrink-0 text-white" />
                  <span className="h-6 w-[86px] text-center text-[16px] font-medium leading-6 text-white">
                    Export PDF
                  </span>
                </button>
              </div>

              <div className="rounded-[12px] border border-[rgba(16,185,129,1)] bg-[#0D1B2D] py-2 text-[16px] text-[#D1D5DC]">
                <div
                  className={`${SUMMARY_GRID} px-3 py-2 text-xs text-[#7C8FA6] uppercase tracking-wider font-bold`}
                >
                  <div>RUNG</div>
                  <div>PROVIDER/INSTITUTION</div>
                  <div>TERM</div>
                  <div>NOMINAL</div>
                  <div>AFTER TAX YIELD</div>
                  <div>ALLOCATION</div>
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
                        productType={product?.product_type === 'treasury' ? 'Treasuries' : undefined}
                        term={rung.target_term_months}
                        nominal={product?.apy_nominal != null ? Number(product.apy_nominal).toFixed(2) : 'N/A'}
                        tax={product?.after_tax_apy != null ? Number(product.after_tax_apy).toFixed(2) : 'N/A'}
                        allocation={rung.allocation_amount}
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
