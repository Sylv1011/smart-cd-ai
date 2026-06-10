import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, SparkleIcon } from './Icons/index';
import BankBadge from './BankBadge';

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

const RenderResultCard = ({result, showProductType = false, expandedCardId, setExpandedCardId, whyThisFitsLoading, setWhyThisFitsLoading, whyThisFitsExpanded, setWhyThisFitsExpanded, whyThisFitsFetched, whyThisFitsOverrides, setWhyThisFitsOverrides, setWhyThisFitsFetched}) => {
    const isExpanded = expandedCardId === result.id;
    const toggleExpand = () => {
      setExpandedCardId(isExpanded ? null : result.id);
      setWhyThisFitsExpanded((prev) => ({ ...prev, [result.id]: false }));
    };
    const safeMatch = Math.max(0, Math.min(100, Number(result.matchPercentage) || 0));
    const isWhyLoading = Boolean(whyThisFitsLoading?.[result.id]);
    const isWhyExpanded = Boolean(whyThisFitsExpanded?.[result.id]);
    const whyEntry = (whyThisFitsOverrides && Object.prototype.hasOwnProperty.call(whyThisFitsOverrides, result.id))
        ? whyThisFitsOverrides[result.id]
        : null;
    const whyHeadline = typeof whyEntry === 'string' ? whyEntry : (whyEntry?.headline ?? '');
    const whyInsight  = typeof whyEntry === 'string' ? '' : (whyEntry?.insight ?? '');
    const whyChunks = splitWhyThisFitsText(whyHeadline);
      
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

    const explainWhyThisFits = async (result) => {
    const id = result?.id;
    if (!id) return;
    
    if (!import.meta.env.VITE_AI_LAYER_URL) {
      setWhyThisFitsOverrides((prev) => ({ ...prev, [id]: 'AI is not configured. Set VITE_AI_LAYER_URL to enable this explanation.' }));
      return;
    }

    if (whyThisFitsLoading[id]) return;

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
      const res = await fetch(`${import.meta.env.VITE_AI_LAYER_URL}/explain-why-this-fits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload.detail || 'AI explanation request failed.');
      }
      
      const data = await res.json().catch(() => ({}));
      const headline = String(data?.headline ?? '').trim();
      const insight = String(data?.insight ?? '').trim();
      if (!headline || !insight) {
        throw new Error('No explanation returned from AI service.');
      }

      setWhyThisFitsOverrides((prev) => ({ ...prev, [id]: { headline, insight } }));
      setWhyThisFitsFetched((prev) => ({ ...prev, [id]: true }));
    } catch (e) {
      setWhyThisFitsOverrides((prev) => ({ ...prev, [id]: e?.message || 'Unable to reach the AI service right now.' }));
    } finally {
      setWhyThisFitsLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

    return (
      <div key={result.id}>
        <div
          className={`smartcd-result-row ${result.isTopPick ? 'smartcd-top-pick' : ''} relative transition-colors max-[768px]:flex max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3 max-[768px]:px-4 max-[768px]:py-3 md:grid md:items-center md:gap-4 md:px-5 md:hover:bg-[rgba(29,141,238,0.05)] ${result.isTopPick ? 'md:pt-8 md:pb-5' : 'md:py-5'} ${showProductType ? 'md:grid-cols-[minmax(220px,2.05fr)_minmax(145px,1.12fr)_minmax(118px,0.9fr)_minmax(150px,1.02fr)_minmax(130px,0.9fr)_220px]' : 'md:grid-cols-[minmax(220px,2.2fr)_minmax(118px,0.95fr)_minmax(150px,1.05fr)_minmax(130px,0.95fr)_220px]'} ${isExpanded ? 'bg-[#0A1E14] border-b-0' : result.isTopPick ? 'bg-[#062314] border-b border-[#1E293B]' : 'bg-[#081329] border-b border-[#1E293B]'}`}
        >
          <div className="flex items-center max-[768px]:order-1 max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-2 max-[768px]:border-b max-[768px]:border-[#1E293B] max-[768px]:pb-3">
            {result.isTopPick && <span className="theme-keep-white inline-flex shrink-0 rounded-full bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)] px-3 py-1 text-[0.64rem] font-extrabold uppercase tracking-[0.04em] text-white md:hidden">★ TOP PICK</span>}
            <div className="flex w-full min-w-0 items-center gap-3 md:pr-3">
              <BankBadge result={result} />
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="break-words text-[1.02rem] font-bold tracking-[-0.01em] text-[#F8FAFC] max-[480px]:text-[0.95rem]">{result.provider}</span>
                </div>
                <div className="break-words text-[0.72rem] leading-[1.35] tracking-[0.005em] text-[#5F7EA6]">{result.institutionType}</div>
              </div>
            </div>
            {result.isTopPick && <span className="theme-keep-white absolute left-4 top-2 hidden shrink-0 rounded-full bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)] px-3 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.04em] text-white md:inline-flex">★ TOP PICK</span>}
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
            <span className="text-[0.74rem] font-bold uppercase tracking-[0.04em] text-[#94A3B8] md:hidden">After-Ta Yield</span>
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
                className="theme-keep-white flex h-11 min-w-[154px] w-full max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] bg-[#1A3050] px-4 text-[0.82rem] font-bold text-[#EEF2FF] transition-all hover:bg-[#2F568F] appearance-none border-none focus:outline-none ring-0 shadow-none md:h-[50px] md:w-[138px] md:min-w-0 md:px-3 md:text-[0.82rem]"
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
                className="theme-keep-white flex h-11 min-w-[140px] w-full max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-[#FFFFFF] px-5 text-[0.82rem] font-bold text-black transition-all enabled:hover:bg-[linear-gradient(180deg,#D3D3D3_0%,#FFFFFF_100%)] appearance-none border-none focus:outline-none ring-0 shadow-none md:h-[50px] md:w-[106px] md:min-w-0 md:px-3 md:text-[0.86rem] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={openProviderLink}
                disabled={!result.detailsUrl}
              >
                Provider <ExternalLinkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-[#050d1f] px-0 pb-0 pt-0">
            <div className="grid grid-cols-2 gap-4 border-t border-[rgba(255,255,255,0.2)] px-6 py-5 max-[768px]:grid-cols-1 max-[768px]:px-3 max-[768px]:py-3">
              <div className="rounded-[10px] border border-[#0B5C2A] bg-[linear-gradient(105deg,rgba(6,50,31,0.88)_0%,rgba(2,14,22,0.95)_68%)] p-4">
                <div className="mb-3 border-b border-[rgba(34,197,94,0.14)] pb-3 text-[13px] font-bold leading-none text-[#F8FAFC]">
                  Read Tax Break down
                </div>
                <div className="space-y-4 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8FB3C4]">Interest Earned :</span>
                    <span className="font-bold text-[#22C55E]">{result.taxBreakdown.interestEarned}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8FB3C4]">Total Tax :</span>
                    <span className="font-bold text-[#FF3B3B]">{result.taxBreakdown.totalTax}</span>
                  </div>
                </div>
                <div className="my-4 border-t border-[rgba(34,197,94,0.12)]"></div>
                <div className="flex items-center justify-between rounded-[10px] border border-[#0B5C2A] bg-[linear-gradient(92deg,rgba(8,58,36,0.85)_0%,rgba(3,36,23,0.9)_100%)] px-3 py-2 text-[13px] font-bold">
                  <span className="text-[#E2E8F0]">Net Return :</span>
                  <span className="text-[17px] text-[#22C55E]">{result.netReturn}</span>
                </div>
                {result.productType === 'Treasuries' && (
                  <div className="mt-3 flex items-center justify-between gap-3 text-[0.78rem]">
                    <span className="text-[#6B7280]">Includes <span className="font-bold text-[#22C55E]">{result.taxBreakdown.totalSavings}</span> in state &amp; local tax savings</span>
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
                      <div className="absolute left-[212px] top-1/2 -translate-y-1/2 text-[14px] font-bold leading-none text-[#22C55E]">{safeMatch}% Match</div>
                      <button
                        type="button"
                        className="absolute left-[411px] top-1/2 inline-flex h-[28px] w-[155px] -translate-y-1/2 items-center justify-center gap-1 rounded-[8px] border border-[#6A9ABE] bg-transparent px-[6px] py-[5px] text-[12px] font-bold leading-none text-[#6A9ABE] shadow-[inset_0_0_0_1px_rgba(106,154,190,0.35)] hover:bg-[#0f2a1f]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isWhyLoading) return;
                          setWhyThisFitsExpanded((prev) => ({ ...prev, [result.id]: true }));
                          if (!whyThisFitsFetched?.[result.id]) explainWhyThisFits(result);
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
                        <div className="h-[6px] rounded-full bg-[#22C55E]" style={{ width: `${Math.max(0, Math.min(100, safeMatch))}%` }} />
                      </div>
                      <div className="absolute right-[18px] top-1/2 -translate-y-1/2 text-[18px] font-bold leading-none text-[#22C55E]">{safeMatch}%</div>
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
                                {whyChunks.length > 0 && whyChunks.map((chunk, idx) => (
                                  <React.Fragment key={`${result.id}-why-${idx}`}>
                                    <span aria-hidden="true" className="h-5 w-5" />
                                    <p className="m-0 break-words text-[0.86rem] leading-[1.55] tracking-[0.003em] text-[#80A4CC] max-[768px]:text-[0.84rem] max-[768px]:leading-[1.7]">
                                      {chunk}
                                    </p>
                                  </React.Fragment>
                                ))}
                                {whyInsight && (
                                  <React.Fragment key={`${result.id}-why-insight`}>
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
      </div>
    );
  };

  export default RenderResultCard;