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

const DESKTOP_GRID = 'md:grid-cols-[330px_180px_150px_170px_130px_254px]';

const DropdownField = ({ label, value, options, onSelect, narrow = false }) => {
  
  const [open, setOpen] = useState(false);

  return (
    <div className={`w-full flex flex-col align-center gap-[16px] ${narrow ? 'max-w-[220px]' : label === 'Target Maturity Date' ? 'max-w-[302px]' : 'max-w-[278px]'} relative`}>
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

    <div className=" text-[12px] text-[#FFFFFF]">
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

const BarbellTab = ({embedded, initialTerm = '3 Month', initialAmount = 0, simulationLoading, simulationData}) => {
    
    const [term, setTerm] = useState(initialTerm);
    const [filterType, setFilterType] = useState('All Products (3)');
    const [amount, setAmount] = useState(initialAmount);
    const [shortTerm, setShortTerm] = useState('3 months');
    const [longTerm, setLongTerm] = useState('24 months');
    const [split, setSplit] = useState(50);
    const [isShortTerm, setIsShortTerm] = useState(true);
    const [isShortTermExpanded, setIsShortTermExpanded] = useState(false);
    const [isLongTerm, setIsLongTerm] = useState(true);
    const [isLongTermExpanded, setIsLongTermExpanded] = useState(false);

    

    
    
    function extractProducts(response) {
    const products = response?.selected_split?.selected_products;
    
    return {
      shortTermBest: products?.short_term?.best,
      shortTermAlt: products?.short_term?.alternative,
      longTermBest: products?.long_term?.best,
      longTermAlt: products?.long_term?.alternative,
    };
  }

    //Simulated response 
    const {shortTermBest, shortTermAlt, longTermBest, longTermAlt} = extractProducts(simulationData);
    return (
        <div>
            <section className="group relative mb-8 w-full rounded-[10px] bg-[#122035] p-[30px] transition-all duration-300 hover:brightness-50">
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
                        options={[
                            `All Products (1)`,
                            'Bank CDs',
                            'Brokerage CDs',
                            'Treasuries',
                        ]}
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
                                options={['3 months', '6 months', '9 months', '12 months']}
                                onSelect={setShortTerm}
                                />

                                <DropdownField
                                label="Long Term (Choose a term 12+ months up to 60 months)"
                                value={longTerm}
                                options={['12 months', '18 months', '24 months', '36 months', '48 months']}
                                onSelect={setLongTerm}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-[30px] ">
                            <div className="flex flex-col gap-[16px] max-w-[719px]">
                                    <div className="mb-4 text-[12px] text-[#64748B]">
                                        Short / Long split (Move slider in 10% increment. Default is optimal blended After Tax APY)
                                    </div>

                                    <div className="mb-4 text-center text-[16px] font-semibold">
                                        <span className="text-[#2EA7FF]">
                                        {split}% · ${((amount * split) / 100).toLocaleString()}
                                        </span>

                                        <span className="mx-2 text-[#64748B]">|</span>

                                        <span className="text-[#00E396]">
                                        {100 - split}% · $
                                        {((amount * (100 - split)) / 100).toLocaleString()}
                                        </span>
                                    </div>

                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="10"
                                        value={split}
                                        onChange={(e) => setSplit(Number(e.target.value))}
                                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#D1D5DB] "
                                    />
                            </div>
                            
                        
                            <div className="flex flex-wrap items-center max-w-[719px]" 
                                style={{
                                  border: '1px solid #2A4D78',
                                  borderRadius: '8px',
                            }}>
                                    <StatCard
                                    title="Short Term - Liquidity"
                                    sub="(3mo)"
                                    value="4.58%"
                                    subtitle="(50% · $10,000)"
                                    valueColor="text-[#2EA7FF]"
                                    />

                                    <StatCard
                                    title="Long Term - Growth"
                                    sub="(24 mo)"
                                    value="3.61%"
                                    subtitle="(50% · $10,000)"
                                    valueColor="text-[#00E396]"
                                    />

                                    <StatCard
                                    title="Blended After"
                                    sub="Tax APY"
                                    value="4.06%"
                                    subtitle="(Estimated)"
                                    valueColor="text-[#2EA7FF]"
                                    />

                                    <StatCard
                                    title="Estimated"
                                    sub="Total Return"
                                    value="$816"
                                    subtitle="After Taxes"
                                    valueColor="text-[#00E396]"
                                    last
                                    />
                                
                            </div>
                        
                        </div>
                    </div>    

                    
                </div>

                <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                  <div className="rounded-lg border border-[#A855F7] bg-[#0D1117] px-6 py-3 text-white">
                    Configuration Not Available
                  </div>
                </div>
            </section>

            {
              shortTermAlt && (
                <div>
                <section className="flex flex-col gap-[38px] max-w-[1286px] mb-8">
               <div className="text-[20px] text-[#FFFFFF]">Your Barbell Strategy</div>

               {simulationLoading && (
                <div className="mb-4 rounded-[10px] border border-[#23446A] bg-[#0D1B2D] px-4 py-3 text-[13px] text-[#9FB4D3]">
                  Loading latest strategy simulation...
                </div>
              )}

              {simulationData?.warnings?.length > 0 && (
                <div className="mb-4 rounded-[10px] border border-[#5B4A1C] bg-[#2A2411] px-4 py-3 text-[13px] text-[#FCD34D]">
                  <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#FDE68A]">Warnings</div>
                  {simulationData.warnings.map((w, idx) => (
                    <div key={`${idx}-${w}`} className="leading-[1.45]">{w}</div>
                  ))}
                </div>
              )}

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
                  <div className="bg-[#050D1F] border-b border-[#1E2939] pb-10">
                     <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 text-[20px] text-[#FFFFFF] cursor-pointer" onClick={() => setIsShortTerm((v) => !v)}>
                          <span>Short Term (Liquidity)</span>
                          <ChevronDownIcon className={`h-[15px] w-[15px] transition-transform duration-300 ${!isShortTerm ? 'rotate-180' : ''}`}/>
                        </div>

                        <div className="text-right text-[14px] text-[#99A1AF]">
                          {shortTermBest.term_months} months • {simulationData.selected_split.short_term_percentage}% of total investment • ${simulationData.selected_split.short_term_amount}
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
                            <Card info={shortTermBest} primary optionsExpanded={isShortTermExpanded} setOptionsExpanded={setIsShortTermExpanded} />
                            
                            <div
                              className={`overflow-hidden transition-all duration-300 ${
                                isShortTermExpanded
                                  ? 'max-h-[1000px] opacity-100'
                                  : 'max-h-0 opacity-0'
                              }`}
                            >
                                
                                  <Card info={shortTermAlt} primary={false} />
                                  
                            </div>
                          </div>
                      </div> 
                  </div>
                  
                  {/* Long Term */}
                  <div className="">
                     <div className="flex items-center justify-between  p-3">
                        <div className="flex items-center gap-2 text-[20px] text-[#FFFFFF]">
                          <span>Long Term (Growth)</span>
                          <ChevronDownIcon className="h-[15px] w-[15px]" />
                        </div>

                        <div className="text-right text-[14px] text-[#99A1AF]">
                          {longTermBest.term_months} months • {simulationData.selected_split.long_term_percentage}% of total investment • ${simulationData.selected_split.long_term_amount}
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
                            <Card info={longTermBest} primary future optionsExpanded={isLongTermExpanded} setOptionsExpanded={setIsLongTermExpanded} />
                            
                            <div
                              className={`overflow-hidden transition-all duration-300 ${
                                isLongTermExpanded
                                  ? 'max-h-[1000px] opacity-100'
                                  : 'max-h-0 opacity-0'
                              }`}
                            >
                                
                                  <Card info={longTermAlt} future />
                                  
                            </div>
                          </div>
                      </div> 
                  </div>

                  </div>
               </div>

               </section>

                 <section className="flex flex-col gap-[30px] max-w-[1286px]">
                  <div className="text-[20px] text-white flex justify-between px-2">
                    <div className='flex-start'>Barbell Strategy Summary</div>
                    <button
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
                      <div>MIN. DEPOSITE</div>
                      <div>MUTUIRITY DATE</div>
                  </div>
                      
                      <div className='mx-3'>
                          <Row type="Short Term" name={shortTermBest?.issuing_bank || shortTermBest.institution_name} term={shortTermBest.term_months} nominal={shortTermBest.apy_nominal} tax={shortTermBest.after_tax_apy} min={shortTermBest.minimum_deposit} date="2023-10-01" /> 
                          <Row type="Short Term" name={shortTermAlt?.issuing_bank || shortTermBest.institution_name} term={shortTermAlt.term_months} nominal={shortTermAlt.apy_nominal} tax={shortTermAlt.after_tax_apy} min={shortTermAlt.minimum_deposit} date="2023-10-01" /> 
                          <Row type="Long Term" name={longTermBest?.issuing_bank} term={longTermBest.term_months} nominal={longTermBest.apy_nominal} tax={longTermBest.after_tax_apy} min={longTermBest.minimum_deposit} date="2023-10-01" /> 
                          <Row type="Long Term" name={longTermAlt?.issuing_bank} term={longTermAlt.term_months} nominal={longTermAlt.apy_nominal} tax={longTermAlt.after_tax_apy} min={shortTermAlt.minimum_deposit} date="2023-10-01" /> 
                      </div>
                                
                  </div>
                </section>             
               </div>
              )
            }                
            

             
            
        </div>
    )
}

export default BarbellTab;