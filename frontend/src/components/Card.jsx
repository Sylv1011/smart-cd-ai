import React from 'react';
import { useState } from 'react';
import BankBadge from './BankBadge';
import { ChevronDownIcon, ExternalLinkIcon, SparkleIcon } from './Icons/index';
const DESKTOP_GRID = 'md:grid-cols-[330px_180px_150px_170px_130px_254px]';

const Rate = ({ value, tone = 'text-white', projected = false, allocationText = '' }) => (
  <div className={`${tone} text-left text-[26px] font-bold leading-none max-[520px]:text-[22px]`}>
    {value}<span className="ml-2 text-[13px] font-medium">%</span>
    
  </div>
);

const formatMoney = (n) => {
    const x = Number(n);
    if (!isFinite(x)) return '$0.00';
    return `$${x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

const adaptSingleOfferToUiResult = (o) => {
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

  const productType = toProductType(o?.product_type);
  const provider = o?.institution_name || o?.issuing_bank || o?.brokerage_firm || 'Unknown';

  const grossInterest = Number(o?.nominal_interest_usd ?? 0);
  const fedRate = Number(o?.fed_rate ?? 0);
  const stateRate = productType === 'Treasuries' ? 0 : Number(o?.state_rate ?? 0);
  const localRate = productType === 'Treasuries' ? 0 : Number(o?.local_rate ?? 0);

  const fedTax = grossInterest * fedRate;
  const stateTax = grossInterest * stateRate;
  const localTax = grossInterest * localRate;
  const totalTax = fedTax + stateTax + localTax;

  const estimatedSavings = productType === 'Treasuries'
    ? Math.max(0, grossInterest * (Number(o?.state_rate ?? 0) + Number(o?.local_rate ?? 0)))
    : 0;

  const rankOverall = Number(o?.rank_overall);
  const topPickRank = Number.isFinite(rankOverall) && rankOverall >= 1 && rankOverall <= 3 ? rankOverall : null;

  const linkKey = o?.destination_url || o?.source_url || '';
  const detailsUrl = typeof o?.destination_url === 'string' && o.destination_url.trim()
    ? o.destination_url.trim()
    : (typeof o?.source_url === 'string' && o.source_url.trim() ? o.source_url.trim() : null);

  return {
    id: `${productType}-${provider}-${o?.term_months ?? ''}-${o?.apy_nominal ?? ''}-${linkKey}`,
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



const Card = ({info, primary, taxOpen=false, future=false ,optionsExpanded=true, setOptionsExpanded}) => {
  
  const [taxOpenState, setTaxOpenState] = useState(false);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);
  const [isWhyLoading, setIsWhyLoading] = useState(false);
  const [whyHeadline, setWhyHeadline] = useState('');
  const [whyInsight, setWhyInsight] = useState('');
  
  
  const highlight = primary;
  const cleanInfo = adaptSingleOfferToUiResult(info);
  
  //Fetching "Why this fits" data from backend
  const explainWhyThisFits = async (result) => {
    
    const id = result?.id;
    if (!id) return;
    
    if (!import.meta.env.VITE_AI_LAYER_URL) {
      setWhyChunks((prev) => ({ ...prev, [id]: 'AI is not configured. Set VITE_AI_LAYER_URL to enable this explanation.' }));
      return;
    }



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
    console.log('Generating explanation for:', payload);
    setIsWhyLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_AI_LAYER_URL}/explain-why-this-fits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('AI response status:', res.status);
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload.detail || 'AI explanation request failed.');
      }
      
      const data = await res.json().catch(() => ({}));
      const headline = String(data?.headline ?? '').trim();
      const insight = String(data?.insight ?? '').trim();
      console.log('AI explanation data:', { headline, insight });
      if (!headline || !insight) {
        throw new Error('No explanation returned from AI service.');
      }

      setWhyHeadline(headline);
      setWhyInsight(insight);
      console.log('Updated whyChunks state:',{ headline, insight } );
    } catch (e) {
      setWhyChunks((prev) => ({ ...prev, [id]: e?.message || 'Unable to reach the AI service right now.' }));
    } finally {
      setIsWhyLoading(false);
    }
  };

   
  return (
    <div className={`${primary ? 'rounded-none border-0 border-b border-[#1E2939] px-[8px] py-5 last:border-b-0' : 'border border-[#1E2939] px-3 py-3'}`}>
      {primary && (
        <div className="mb-2 inline-flex rounded-full bg-[#22C55E] px-3 py-1 text-[12px] leading-none text-white">
           Recommended
      </div>
      )}
      <div className={`grid items-center gap-0 ${DESKTOP_GRID}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={`${highlight ? 'h-[100px] opacity-100' : 'h-[68px] opacity-0'} w-1 shrink-0 rounded ${highlight ? 'bg-[#22C55E]' : 'bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)]'}`} />
          <BankBadge result={cleanInfo} />
          <div className="min-w-0">
            <div className="text-[16px] font-bold leading-[20px] text-white">{cleanInfo.provider}</div>
            <div className="text-[11px] font-normal leading-[16px] text-[#4A7A9A]">{cleanInfo.institutionType}</div>
          </div>
        </div>
        <div className="text-[16px] font-bold text-white md:text-left max-[760px]:pl-[56px]">{cleanInfo.productType}</div>
        <div className="md:text-left"><Rate value={cleanInfo.nominalRate.toFixed(2)} /></div>
        <div className="md:text-left"><Rate value={cleanInfo.afterTaxYield.toFixed(2)} tone={!future ? 'text-[#0077FF]' : 'text-[#22C55E]'} projected={primary} allocationText={"allocationText"} /></div>
        <div className="text-[18px] font-bold text-white md:text-left max-[760px]:text-left">${cleanInfo.minDeposit}</div>
        <div className="flex items-center justify-start gap-3 max-[760px]:pl-[56px] max-[520px]:flex-wrap">
          <button
            type="button"
            onClick={() => {
                setTaxOpenState(!taxOpenState)
                setIsWhyExpanded(false);
            }}
            className={`inline-flex h-[43px] w-[145px] items-center justify-center gap-2 rounded-[10px] border-0 px-2 py-2 text-[14px] font-semibold leading-[24px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] outline-none ring-0 transition-colors ${
              taxOpenState ? 'bg-[#0D1B2E] text-[#F59E0C] shadow-[inset_0_0_0_1px_#F59E0C,0_4px_4px_rgba(0,0,0,0.25)]' : 'bg-[#1A3050] text-white hover:bg-[#254873]'
            }`}
          >
            <span className="whitespace-nowrap">Tax Breakdown</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${taxOpenState ? 'rotate-180 text-[#F59E0C]' : ''}`} />
          </button>
          
          <button type="button" onClick={() => window.open(cleanInfo.detailsUrl, '_blank', 'noopener,noreferrer')} className="inline-flex h-[43px] w-[145px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border px-2 py-2 text-[14px] font-semibold leading-[24px] shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-all border-[#E2E8F0] bg-white text-[#1A3050] hover:bg-[#eef3fb]">
            Provider<ExternalLinkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {taxOpenState && (
                <div className="bg-[#050d1f] px-0 pb-0 pt-0">
                  <div className="grid grid-cols-2 gap-4 border-t border-[rgba(255,255,255,0.2)] px-6 py-5 max-[768px]:grid-cols-1 max-[768px]:px-3 max-[768px]:py-3">
                    <div className="rounded-[10px] border border-[#0B5C2A] bg-[linear-gradient(105deg,rgba(6,50,31,0.88)_0%,rgba(2,14,22,0.95)_68%)] p-4">
                      <div className="mb-3 border-b border-[rgba(34,197,94,0.14)] pb-3 text-[13px] font-bold leading-none text-[#F8FAFC]">
                        Read Tax Break down
                      </div>
                      <div className="space-y-4 text-[12.5px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#8FB3C4]">Interest Earned :</span>
                          <span className="font-bold text-[#22C55E]">{cleanInfo.taxBreakdown.interestEarned}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#8FB3C4]">Total Tax :</span>
                          <span className="font-bold text-[#FF3B3B]">{cleanInfo.taxBreakdown.totalTax}</span>
                        </div>
                      </div>
                      <div className="my-4 border-t border-[rgba(34,197,94,0.12)]"></div>
                      <div className="flex items-center justify-between rounded-[10px] border border-[#0B5C2A] bg-[linear-gradient(92deg,rgba(8,58,36,0.85)_0%,rgba(3,36,23,0.9)_100%)] px-3 py-2 text-[13px] font-bold">
                        <span className="text-[#E2E8F0]">Net Return :</span>
                        <span className="text-[17px] text-[#22C55E]">{cleanInfo.netReturn}</span>
                      </div>
                      {cleanInfo.productType === 'Treasuries' && (
                        <div className="mt-3 flex items-center justify-between gap-3 text-[0.78rem]">
                          <span className="text-[#6B7280]">Includes <span className="font-bold text-[#22C55E]">{cleanInfo.taxBreakdown.totalSavings}</span> in state &amp; local tax savings</span>
                        </div>
                      )}
                    </div>
      
                    <div
                      className={`overflow-hidden rounded-[12px] ${
                        isWhyExpanded
                          ? 'h-[231px] border border-[#1557F5] bg-[linear-gradient(180deg,#07170F_0%,#06120D_100%)] shadow-[inset_0_0_0_1px_rgba(140,194,255,0.18)]'
                          : 'h-[52px] border border-[#1557F5] bg-[#07170F] shadow-[inset_0_0_0_1px_rgba(140,194,255,0.26)]'
                      }`}
                    >
                      <div
                        className={`flex items-center ${
                          isWhyExpanded
                            ? 'relative mt-[6px] h-[52px] rounded-[12px] border border-[rgba(21,87,245,0.45)] bg-[#07170F]'
                            : 'relative h-full'
                        }`}
                      >
                        {!isWhyExpanded ? (
                          <>
                            <div className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none text-white">Why this Fits</div>
                            <div className="absolute left-[212px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none text-[#22C55E]">{100}% Match</div>
                            <button
                              type="button"
                              className="absolute left-[411px] top-1/2 inline-flex h-[28px] w-[155px] -translate-y-1/2 items-center justify-center gap-1 rounded-[8px] border border-[#6A9ABE] bg-transparent px-[6px] py-[5px] text-[12px] font-bold leading-none text-[#6A9ABE] shadow-[inset_0_0_0_1px_rgba(106,154,190,0.35)] hover:bg-[#0f2a1f]"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isWhyLoading) return;
                                setIsWhyExpanded(!isWhyExpanded);
                                explainWhyThisFits(cleanInfo);  
                              }}
                            >
                              <SparkleIcon className="h-[11px] w-[11px] text-[#6A9ABE]" />
                              Generate Summary
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="absolute left-[16px] top-1/2 -translate-y-1/2 whitespace-nowrap text-[14px] font-bold leading-none text-white">Why this Fits</div>
                            <div className="absolute left-[244px] top-1/2 -translate-y-1/2 text-[12px] font-bold leading-none text-[#3A6090]">Match Score</div>
                            <div className="absolute left-[352px] top-1/2 h-[6px] w-[180px] -translate-y-1/2 rounded-full bg-[#0D2A1F]">
                              <div className="h-[6px] rounded-full bg-[#22C55E]" style={{ width: `${Math.max(0, Math.min(100, cleanInfo.matchPercentage))}%` }} />
                            </div>
                            <div className="absolute right-[18px] top-1/2 -translate-y-1/2 text-[18px] font-bold leading-none text-[#22C55E]">{cleanInfo.matchPercentage}%</div>
                          </>
                        )}
                      </div>
      
                      {isWhyExpanded && (
                        <div className="pb-4 pt-3">
                          <div className="rounded-xl border border-[rgba(29,141,238,0.22)] bg-[rgba(2,10,22,0.55)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] max-[768px]:px-3 max-[768px]:py-3">
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
                                       {whyHeadline && (
                                          <React.Fragment key={`${cleanInfo.id}-why-headline`}>
                                            <span aria-hidden="true" className="h-5 w-5" />
                                            <p className="m-0 break-words text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#80A4CC] max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                                              {whyHeadline}
                                            </p>
                                          </React.Fragment>
                                        )}
                                        {whyInsight && (
                                          <React.Fragment key={`${cleanInfo.id}-why-insight`}>
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
      
      {primary && (
        <button
          type="button"
          onClick={() => {setOptionsExpanded((v) => !v)}}
          className={`inline-flex appearance-none items-center gap-1  bg-transparent pl-1 text-[14px] font-normal leading-[20px] text-white shadow-none outline-none transition-colors hover:text-[#c7d7ee] }`}
        >
          Other great options
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${optionsExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

export default Card;