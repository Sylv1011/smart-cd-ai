import { useState, useEffect } from 'react';
import { ChevronDownIcon, ExternalLinkIcon, DocumentIcon } from './Icons/index';
import Card from './Card';
import BankBadge from './BankBadge';

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

const DESKTOP_GRID = 'md:grid-cols-[330px_180px_150px_170px_130px_254px]';

const DropdownField = ({
  label,
  value,
  options,
  onSelect,
  narrow = false,
  disabled = false,
  emptyMessage = 'No options available',
}) => {
  const [open, setOpen] = useState(false);
  const hasOptions = options.length > 0;

  useEffect(() => {
    if (disabled || !hasOptions) {
      setOpen(false);
    }
  }, [disabled, hasOptions]);

  return (
    <div className={`w-full flex flex-col align-center gap-[16px] ${narrow ? 'max-w-[220px]' : label === 'Target Maturity Date' ? 'max-w-[302px]' : 'max-w-[278px]'}`}>
      <div className={`mb-[14px] text-[11px] uppercase tracking-[0.55px] text-[#94A3B8] ${label === 'AMOUNT' ? 'font-bold' : 'font-semibold'}`}>{label}</div>
      <button
        type="button"
        disabled={disabled || !hasOptions}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-full items-center justify-between rounded-[8px] border border-[#1557F5] bg-[#0D1B2D] px-3 text-left shadow-[0_0_0_1px_rgba(21,87,245,0.35)] transition-colors ${
          disabled || !hasOptions
            ? 'cursor-not-allowed opacity-60'
            : 'hover:border-[#2A4D78]'
        }`}
      >
        <span className={`${label === 'Target Maturity Date' ? 'text-[12px]' : 'text-[14px]'} font-medium leading-[20px] text-white`}>{value}</span>
        <ChevronDownIcon className={`h-4 w-4 text-[#94A3B8]/70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {!hasOptions && (
        <div className="text-[12px] leading-[1.4] text-[#94A3B8]">
          {emptyMessage}
        </div>
      )}
      {open && (
        <div className="mt-2 w-full overflow-hidden rounded-[8px] border border-[#1A3050] bg-[#0D1B2D] shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
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

const StatCard = ({ title, sub, value, subtitle, valueColor, last=false}) => (
  <div className="flex flex-col min-w-[160px] flex-1 px-[12px] items-center gap-[14px] py-4" style={!last ? { borderRight: '1px solid #2A4D78' } : {}}>
    <div className="mb-3 text-center text-[12px] text-[#D886FF]">
      {title} 
      <br/> 
      {sub}
    </div>
    

    <div className={` text-[16px] font-bold ${valueColor}`}>
      {value}
    </div>

    <div className=" text-[12px] text-white">
      {subtitle}
    </div>
  </div>
);

const GRID = "grid grid-cols-[1fr_2fr_1fr_1fr_1.5fr_1.2fr_1.2fr] gap-x-4 items-center";


const Row = ({type, name, term, nominal, tax, min, date}) =>{
  const badge = {provider: name};
  return (
    <div className={`${GRID} py-3 border-t border-[rgba(168,85,247,0.20)] text-sm`}>
      <div>{type}</div>
      <div className='flex items-center gap-[5px]'> 
        <BankBadge result={badge}/>
        <span className="text-xs">{name}</span>
      </div>
      <div>{term} months</div>
      <div>{nominal}%</div>
      <div className={type === 'Short Term' ? 'text-[#0077FF]' : 'text-[#22C55E]'}>{tax}%</div>
      <div>${min}</div>
      <div>{date}</div>
    </div>
  )
}

const getProviderName = (product) =>
  product?.issuing_bank ||
  product?.institution_name ||
  product?.brokerage_firm ||
  'N/A';

const getFilterLabelForProduct = (product) => {
  const type = String(product?.product_type || '').trim().toLowerCase();
  if (type === 'brokered_cd') return 'Brokerage CDs';
  if (type === 'treasury') return 'Treasuries';
  return 'Bank CDs';
};

const isSupportedSplit = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 20 && numeric <= 50 && numeric % 10 === 0;
};

const BarbellTab = ({
  embedded,
  initialTerm = '3 Month',
  initialAmount = 0,
  initialSplit = 50,
  initialShortTerm = '3 months',
  initialLongTerm = '12 months',
  simulationLoading,
  simulationData,
  simulationError,
  onExportPdf,
  onControlsChange,
  onSelectStrategy,
}) => {
    
    const [term, setTerm] = useState(initialTerm);
    const [filterType, setFilterType] = useState('All Products (3)');
    const [amount, setAmount] = useState(initialAmount);
    const [shortTerm, setShortTerm] = useState(initialShortTerm);
    const [longTerm, setLongTerm] = useState(initialLongTerm);
    const [split, setSplit] = useState(initialSplit);
    const [isShortTerm, setIsShortTerm] = useState(true);
    const [isShortTermExpanded, setIsShortTermExpanded] = useState(false);
    const [isLongTerm, setIsLongTerm] = useState(true);
    const [isLongTermExpanded, setIsLongTermExpanded] = useState(false);
    const targetTermMonths = monthsFromLabel(term);
    const longTermOptions = BULLET_TERM_OPTIONS.filter((option) => monthsFromLabel(option) >= 12 && monthsFromLabel(option) <= targetTermMonths);
    const hasLongTermOptions = longTermOptions.length > 0;

    useEffect(() => {
      setTerm(initialTerm);
    }, [initialTerm]);

    useEffect(() => {
      setAmount(initialAmount);
    }, [initialAmount]);

    useEffect(() => {
      setSplit(initialSplit);
    }, [initialSplit]);

    useEffect(() => {
      setShortTerm(initialShortTerm);
    }, [initialShortTerm]);

    useEffect(() => {
      setLongTerm(initialLongTerm);
    }, [initialLongTerm]);

    useEffect(() => {
      if (!longTermOptions.includes(longTerm)) {
        setLongTerm(longTermOptions[longTermOptions.length - 1] || '12 months');
      }
    }, [longTerm, longTermOptions]);

    useEffect(() => {
      if (!simulationData?.selected_split) return;

      const nextSplit = Number(simulationData.selected_split.short_term_percentage);
      if (!Number.isNaN(nextSplit)) {
        setSplit(nextSplit);
      }
    }, [simulationData]);

    useEffect(() => {
      setFilterType((current) =>
        current.startsWith('All Products') ? `All Products (${visibleProducts.length})` : current
      );
    }, [simulationData]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      onControlsChange?.({
        term,
        amount: String(amount || '').replace(/[^0-9]/g, ''),
        split,
        shortTerm,
        longTerm,
      });
    }, [term, amount, split, shortTerm, longTerm, onControlsChange]);

    

    
    
    function extractProducts(response) {
    const products = response?.selected_split?.selected_products;
    
    return {
      shortTermBest: products?.short_term?.best,
      shortTermAlt: products?.short_term?.alternative,
      longTermBest: products?.long_term?.best,
      longTermAlt: products?.long_term?.alternative,
    };
  }

    const shortAmount = (Number(amount || 0) * split) / 100;
    const longAmount = (Number(amount || 0) * (100 - split)) / 100;
    const sliderFillPercent = split;
    const sliderBackground = `linear-gradient(90deg, #A855F7 0%, #A855F7 ${sliderFillPercent}%, #D1D5DB ${sliderFillPercent}%, #D1D5DB 100%)`;
    const targetMaturityText = formatDateLong(addMonths(new Date(), targetTermMonths));
    const isTargetTermSupported = targetTermMonths >= 12;
    const isSplitInLiveRange = isSupportedSplit(split);
    const supportsLiveSimulation = isTargetTermSupported && isSplitInLiveRange;
    const effectiveSimulationData = supportsLiveSimulation ? simulationData : null;
    // Simulated response
    const {shortTermBest, shortTermAlt, longTermBest, longTermAlt} = extractProducts(effectiveSimulationData);
    const hasAnyProducts = Boolean(shortTermBest || shortTermAlt || longTermBest || longTermAlt);
    const shouldShowResults =
      supportsLiveSimulation && (
        simulationLoading ||
        simulationError ||
        hasAnyProducts ||
        (Array.isArray(effectiveSimulationData?.warnings) && effectiveSimulationData.warnings.length > 0) ||
        effectiveSimulationData?.message
      );
    const visibleProducts = [shortTermBest, shortTermAlt, longTermBest, longTermAlt].filter(Boolean);
    const filterOptions = [
      `All Products (${visibleProducts.length})`,
      'Bank CDs',
      'Brokerage CDs',
      'Treasuries',
    ];
    const getMaturityDate = (product) => formatDateLong(addMonths(new Date(), Number(product?.term_months ?? 0) || 0));
    const matchesFilter = (product) => filterType.startsWith('All Products') || getFilterLabelForProduct(product) === filterType;
    const shortSectionVisible = [shortTermBest, shortTermAlt].some((product) => product && matchesFilter(product));
    const longSectionVisible = [longTermBest, longTermAlt].some((product) => product && matchesFilter(product));
    const hasFilteredProducts = shortSectionVisible || longSectionVisible;
    const displayedShortPrimary = matchesFilter(shortTermBest) ? shortTermBest : (matchesFilter(shortTermAlt) ? shortTermAlt : null);
    const displayedShortAlternative =
      displayedShortPrimary === shortTermBest && shortTermAlt && matchesFilter(shortTermAlt)
        ? shortTermAlt
        : displayedShortPrimary === shortTermAlt && shortTermBest && matchesFilter(shortTermBest)
          ? shortTermBest
          : null;
    const displayedLongPrimary = matchesFilter(longTermBest) ? longTermBest : (matchesFilter(longTermAlt) ? longTermAlt : null);
    const displayedLongAlternative =
      displayedLongPrimary === longTermBest && longTermAlt && matchesFilter(longTermAlt)
        ? longTermAlt
        : displayedLongPrimary === longTermAlt && longTermBest && matchesFilter(longTermBest)
          ? longTermBest
          : null;
    const warningCard = !isTargetTermSupported
      ? {
          title: 'CD BARBELL WORKS BEST FOR LONGER TERM HORIZONS (12+ MONTHS)',
          body: 'Your selected target maturity is under 12 months, which does not provide enough duration separation for an effective barbell strategy.',
        }
      : !isSplitInLiveRange
        ? {
            title: 'LIVE BARBELL RESULTS CURRENTLY SUPPORT 20% TO 50% SHORT-TERM SPLITS',
            body: 'You can explore the full 0% to 100% slider range, but live simulation results are only available when the short-term side stays between 20% and 50% in 10% increments.',
          }
        : null;

    return (
        <div>
            <section className="relative mb-8 w-full rounded-[10px] bg-[#122035] p-[30px] transition-all duration-300">
                <div className="flex w-full flex-col gap-4">
                <h2 className="text-[16px] font-normal leading-[20px] text-[#9E9E9E]">What is CD Barbell?</h2>
                <p className="max-w-[900px] text-[14px] font-normal leading-[24px] text-[#D1D5DC]">
                    A barbell strategy combines short term CDs for quick access to part of your money and long term CDs for higher returns.
                    It works best when short term rates are attractive and long term rates offer a premium.
                </p>
                </div>

                <div className="mt-5 w-full rounded-[12px] border border-[rgba(168,85,247,0.50)] p-4 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.22)]">
                    <div className="flex w-full flex-wrap items-start gap-x-10 gap-y-4">
                        <DropdownField
                        label="Target Maturity Date"
                        value={term}
                        options={BULLET_TERM_OPTIONS}
                        onSelect={setTerm}
                        />

                        <DropdownField
                        label="FILTER BY TYPE"
                        value={filterType}
                        options={filterOptions}
                        onSelect={setFilterType}
                        />

                        <div className="flex flex-col gap-[16px] w-full max-w-[220px]">
                        <div className="mb-[14px] text-[11px] font-bold uppercase tracking-[0.55px] text-[#94A3B8]">AMOUNT</div>
                        <input
                            value={`$ ${amount}`}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                            className="h-9 w-full rounded-[8px] border border-[#1557F5] bg-[#0D1B2D] px-3 text-[14px] font-normal leading-[20px] text-white shadow-[0_0_0_1px_rgba(21,87,245,0.35)] outline-none transition-colors focus:border-[#2A4D78]"
                        />
                        </div>
                    </div>
                    
                     <hr className="w-full border-t border-[#2A4D78] my-5" />
                     
                        
                    <div className="flex flex-col gap-[24px] w-full">
                        <div className="flex flex-col items-start gap-[20px]">
                            <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.55px] text-[#94A3B8]">
                                BARBELL CONFIGURATION
                            </h3>

                            <div className="flex w-full flex-wrap items-start gap-x-10 gap-y-4">
                                <DropdownField
                                label="Short Term (Choose a term under 12 months)"
                                value={shortTerm}
                                options={['3 months', '6 months', '9 months']}
                                onSelect={setShortTerm}
                                />

                                <DropdownField
                                label="Long Term (Choose a term 12+ months up to 60 months)"
                                value={longTerm}
                                options={longTermOptions}
                                onSelect={setLongTerm}
                                disabled={!hasLongTermOptions}
                                emptyMessage="Choose a target maturity of at least 12 months to enable long-term terms."
                                />
                            </div>
                        </div>

                        <div className={`grid gap-[24px] ${warningCard ? 'xl:grid-cols-[minmax(0,719px)_minmax(320px,1fr)]' : ''}`}>
                            <div className="flex flex-col gap-[30px] ">
                            <div className="flex flex-col gap-[16px] max-w-[719px]">
                                    <div className="mb-4 text-[12px] text-[#64748B]">
                                        Short / Long split (Move slider in 10% increments)
                                    </div>

                                    <div className="mb-4 text-center text-[16px] font-semibold">
                                        <span className="text-[#2EA7FF]">
                                        {split}% · ${((Number(amount || 0) * split) / 100).toLocaleString()}
                                        </span>

                                        <span className="mx-2 text-[#64748B]">|</span>

                                        <span className="text-[#00E396]">
                                        {100 - split}% · $
                                        {((Number(amount || 0) * (100 - split)) / 100).toLocaleString()}
                                        </span>
                                    </div>

                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="10"
                                        value={split}
                                        onChange={(e) => setSplit(Number(e.target.value))}
                                        className="barbell-split-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-[#D1D5DB]"
                                        style={{ background: sliderBackground }}
                                    />
                            </div>
                            
                        
                            <div className="flex flex-wrap items-center max-w-[719px]" 
                                style={{
                                  border: '1px solid #2A4D78',
                                  borderRadius: '8px',
                            }}>
                                    <StatCard
                                    title="Short Term - Liquidity"
                                    sub={`(${shortTermBest?.term_months ?? '--'}mo)`}
                                    value={shortTermBest ? `${shortTermBest.after_tax_apy}%` : 'N/A'}
                                    subtitle={`(${split}% · $${shortAmount.toLocaleString()})`}
                                    valueColor="text-[#2EA7FF]"
                                    />

                                    <StatCard
                                    title="Long Term - Growth"
                                    sub={`(${longTermBest?.term_months ?? '--'}mo)`}
                                    value={longTermBest ? `${longTermBest.after_tax_apy}%` : 'N/A'}
                                    subtitle={`(${100 - split}% · $${longAmount.toLocaleString()})`}
                                    valueColor="text-[#00E396]"
                                    />

                                    <StatCard
                                    title="Blended After"
                                    sub="Tax APY"
                                    value={effectiveSimulationData?.selected_split?.portfolio ? `${effectiveSimulationData.selected_split.portfolio.after_tax_blended_apy}%` : 'N/A'}
                                    subtitle="(Estimated)"
                                    valueColor="text-[#2EA7FF]"
                                    />

                                    <StatCard
                                    title="Estimated"
                                    sub="Total Return"
                                    value={effectiveSimulationData?.selected_split?.portfolio ? `$${Number(effectiveSimulationData.selected_split.portfolio.estimated_after_tax_total_return_usd || 0).toLocaleString()}` : 'N/A'}
                                    subtitle="After Taxes"
                                    valueColor="text-[#00E396]"
                                    last
                                    />
                                
                            </div>

                            <div className="text-[11px] leading-[1.35] text-[#64748B]">
                              <span className="italic">Target maturity date for this barbell is {targetMaturityText}. The short leg matures earlier for liquidity.</span>
                            </div>

                            {!isSplitInLiveRange && (
                              <div className="rounded-[10px] border border-[#5B4A1C] bg-[#2A2411] px-4 py-3 text-[13px] text-[#FCD34D]">
                                Live results refresh only when the short-term side is between 20% and 50% in 10% increments.
                              </div>
                            )}
                         
                        </div>

                        {warningCard && (
                          <aside className="rounded-[14px] border border-[rgba(216,134,255,0.85)] bg-[#17051D] px-6 py-8 text-white shadow-[inset_0_0_0_1px_rgba(216,134,255,0.14)]">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#17051D] special">
                                <span className="text-[18px] font-bold">!</span>
                              </div>
                              <div>
                                <h4 className="text-[18px] font-semibold leading-[1.25]">{warningCard.title}</h4>
                                <p className="mt-5 text-[15px] leading-[1.55] text-[#D8CCE0]">{warningCard.body}</p>
                              </div>
                            </div>
                            <div className="mt-10 text-[15px] text-white">Consider these alternative strategies</div>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => onSelectStrategy?.('best-rate')}
                                className="rounded-[12px] bg-[#0D1B2D] px-5 py-5 text-left transition-colors hover:bg-[#122742]"
                              >
                                <div className="text-[15px] font-semibold text-white">Best Rate</div>
                                <div className="mt-2 text-[14px] leading-[1.45] text-[#A5B4C8]">Highest single after-tax yield</div>
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectStrategy?.('ladder')}
                                className="rounded-[12px] bg-[#0D1B2D] px-5 py-5 text-left transition-colors hover:bg-[#122742]"
                              >
                                <div className="text-[15px] font-semibold text-white">CD Ladder</div>
                                <div className="mt-2 text-[14px] leading-[1.45] text-[#A5B4C8]">Rolling liquidity every quarter</div>
                              </button>
                            </div>
                          </aside>
                        )}
                        </div>
                    </div>    

                    
                </div>
            </section>

            {
              shouldShowResults && (
                <div>
                <section className="flex flex-col gap-[38px] max-w-[1286px] mb-8">
               <div className="text-[20px] text-[#FFFFFF]">Your Barbell Strategy</div>

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

              {effectiveSimulationData?.warnings?.length > 0 && (
                <div className="mb-4 rounded-[10px] border border-[#5B4A1C] bg-[#2A2411] px-4 py-3 text-[13px] text-[#FCD34D]">
                  <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#FDE68A]">Warnings</div>
                  {effectiveSimulationData.warnings.map((w, idx) => (
                    <div key={`${idx}-${w}`} className="leading-[1.45]">{w}</div>
                  ))}
                </div>
              )}

              {!hasAnyProducts && effectiveSimulationData?.message && (
                <div className="mb-4 rounded-[10px] border border-[#23446A] bg-[#0D1B2D] px-4 py-3 text-[13px] text-[#9FB4D3]">
                  {effectiveSimulationData.message}
                </div>
              )}

              {hasAnyProducts && hasFilteredProducts && (
                <div className="overflow-hidden rounded-[12px] border border-[#1E2939] pb-4">
                  <div className={`hidden border-b border-[#1E2939] px-[18px] pt-5 pb-[27px] text-[14px] font-bold leading-[1] text-[#94A3B8] md:grid ${DESKTOP_GRID}`}>
                    <div className="whitespace-nowrap pl-3 text-left">PROVIDER / INSTITUTION</div>
                    <div className="whitespace-nowrap text-left">PRODUCT TYPE</div>
                    <div className="whitespace-nowrap text-left">NOMINAL RATE <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
                    <div className="whitespace-nowrap text-left">AFTER TAX YIELD <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
                    <div className="whitespace-nowrap text-left">MIN. DEPOSIT <ChevronDownIcon className="inline h-[10px] w-[10px]" /></div>
                    <div className="whitespace-nowrap text-center">ACTIONS</div>
                  </div>
                  
                  
                  <div className="flex flex-col gap-4 ">
                    {/*Short Term */}
                  {shortSectionVisible && (
                  <div className="bg-[#050D1F] border-b border-[#1E2939] pb-10">
                     <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 text-[20px] text-[#FFFFFF] cursor-pointer" onClick={() => setIsShortTerm((v) => !v)}>
                          <span>Short Term (Liquidity)</span>
                          <ChevronDownIcon className={`h-[15px] w-[15px] transition-transform duration-300 ${!isShortTerm ? 'rotate-180' : ''}`}/>
                        </div>

                        <div className="text-right text-[14px] text-[#99A1AF]">
                          {displayedShortPrimary?.term_months ?? '--'} months • {effectiveSimulationData.selected_split.short_term_percentage}% of total investment • ${effectiveSimulationData.selected_split.short_term_amount}
                        </div>
                      </div>
                          

                      <div
                        className={`mx-4 overflow-hidden transition-all duration-300 ${
                          isShortTerm
                            ? 'max-h-[1000px] opacity-100'
                            : 'max-h-0 opacity-0'
                        }`}
                      >
                          <div className="rounded-lg border border-[#1E2939]">
                                {displayedShortPrimary && (
                                  <Card info={displayedShortPrimary} primary optionsExpanded={isShortTermExpanded} setOptionsExpanded={setIsShortTermExpanded} />
                                )}

                                {displayedShortAlternative && (
                                  <div
                                    className={`overflow-hidden transition-all duration-300 ${
                                      isShortTermExpanded
                                    ? 'max-h-[1000px] opacity-100'
                                    : 'max-h-0 opacity-0'
                                }`}
                              >
                                    <Card info={displayedShortAlternative} primary={false} />
                                  </div>
                                )}
                          </div>
                      </div> 
                  </div>
                  )}
                  
                  {/* Long Term */}
                  {longSectionVisible && (
                  <div className="">
                     <div className="flex items-center justify-between  p-3">
                        <div className="flex items-center gap-2 text-[20px] text-[#FFFFFF] cursor-pointer" onClick={() => setIsLongTerm((v) => !v)}>
                          <span>Long Term (Growth)</span>
                          <ChevronDownIcon className={`h-[15px] w-[15px] transition-transform duration-300 ${!isLongTerm ? 'rotate-180' : ''}`} />
                        </div>

                        <div className="text-right text-[14px] text-[#99A1AF]">
                          {displayedLongPrimary?.term_months ?? '--'} months • {effectiveSimulationData.selected_split.long_term_percentage}% of total investment • ${effectiveSimulationData.selected_split.long_term_amount}
                        </div>
                      </div>


                      <div
                        className={`mx-4 overflow-hidden transition-all duration-300 ${
                          isLongTerm
                            ? 'max-h-[1000px] opacity-100'
                            : 'max-h-0 opacity-0'
                        }`}
                      >
                          <div className="rounded-lg border border-[#1E2939]">
                                {displayedLongPrimary && (
                                  <Card info={displayedLongPrimary} primary future optionsExpanded={isLongTermExpanded} setOptionsExpanded={setIsLongTermExpanded} />
                                )}

                                {displayedLongAlternative && (
                                  <div
                                    className={`overflow-hidden transition-all duration-300 ${
                                      isLongTermExpanded
                                    ? 'max-h-[1000px] opacity-100'
                                    : 'max-h-0 opacity-0'
                                }`}
                              >
                                    <Card info={displayedLongAlternative} future />
                                  </div>
                                )}
                          </div>
                      </div> 
                  </div>
                  )}

                  </div>
               </div>
               )}

              {hasAnyProducts && !hasFilteredProducts && (
                <div className="mb-4 rounded-[10px] border border-[#23446A] bg-[#0D1B2D] px-4 py-3 text-[13px] text-[#9FB4D3]">
                  No products match the selected filter for this strategy output.
                </div>
              )}

               </section>

                 {hasAnyProducts && (
                 <section className="flex flex-col gap-[30px] max-w-[1286px]">
                  <div className="text-[20px] text-white flex justify-between px-2">
                    <div className='flex-start'>Barbell Strategy Summary</div>
                    <button
                        type="button"
                        onClick={onExportPdf || (() => {})}
                        className="flex h-12 w-[140px] items-center gap-[5px] rounded-[10px] border border-[#D886FF] bg-[#0D1117] p-3"
                      >
                        <DocumentIcon className="h-6 w-6 shrink-0 text-white" />

                        <span className="h-6 w-[86px] text-center text-[16px] font-medium leading-6 text-white">
                          Export PDF
                        </span>
                      </button>
                  </div>
                  
                  
                  <div className="rounded-[12px] border border-[rgba(168,85,247,1)] bg-[#0D1B2D] py-2 text-[16px] text-[#D1D5DC]">
                    <div className={`${GRID} px-3 py-2 text-xs text-[#7C8FA6] uppercase tracking-wider font-bold`}>
                      <div>TYPE</div>
                      <div>PROVIDER/INSTITUTION</div>
                      <div>TERM</div>
                      <div>NOMINAL</div>
                      <div>AFTER TAX YIELD</div>
                      <div>MIN. DEPOSIT</div>
                      <div>MATURITY DATE</div>
                  </div>
                      
                      <div className='mx-3'>
                        {shortTermBest && matchesFilter(shortTermBest) && <Row type="Short Term" name={getProviderName(shortTermBest)} term={shortTermBest.term_months} nominal={shortTermBest.apy_nominal} tax={shortTermBest.after_tax_apy} min={shortTermBest.minimum_deposit} date={getMaturityDate(shortTermBest)} />}
                        {shortTermAlt && matchesFilter(shortTermAlt) && <Row type="Short Term" name={getProviderName(shortTermAlt)} term={shortTermAlt.term_months} nominal={shortTermAlt.apy_nominal} tax={shortTermAlt.after_tax_apy} min={shortTermAlt.minimum_deposit} date={getMaturityDate(shortTermAlt)} />}
                        {longTermBest && matchesFilter(longTermBest) && <Row type="Long Term" name={getProviderName(longTermBest)} term={longTermBest.term_months} nominal={longTermBest.apy_nominal} tax={longTermBest.after_tax_apy} min={longTermBest.minimum_deposit} date={getMaturityDate(longTermBest)} />}
                        {longTermAlt && matchesFilter(longTermAlt) && <Row type="Long Term" name={getProviderName(longTermAlt)} term={longTermAlt.term_months} nominal={longTermAlt.apy_nominal} tax={longTermAlt.after_tax_apy} min={longTermAlt.minimum_deposit} date={getMaturityDate(longTermAlt)} />}
                      </div>
                                
                  </div>
                </section>
                )}            
               </div>
              )
            }                
            

             
            
        </div>
    )
}

export default BarbellTab;
