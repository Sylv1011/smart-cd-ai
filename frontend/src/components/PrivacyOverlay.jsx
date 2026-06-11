import { ChevronLeftIcon, SolidLockIcon, DocumentIcon, ShieldCheckIcon } from './Icons/index';

export default function PrivacyOverlay({showPrivacy, setShowPrivacy}) {
    if (!showPrivacy) return null;
    return (
        <div className="fixed inset-0 z-[2000] flex h-screen w-screen flex-col overflow-hidden overscroll-none bg-white text-[#374151]">
                  <div className="relative flex h-full flex-col bg-white">
        
                    <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain max-[768px]:w-full max-[768px]:overflow-x-hidden">
                      <div className="mx-auto max-w-[900px] flex-1 bg-white px-6 py-10 max-[768px]:px-4 max-[768px]:py-6">
                        {/* Logo Section */}
                        <div className="mb-8 flex flex-col items-start">
                          <button type="button" className="flex items-center gap-1 border-none bg-transparent p-0 py-2 cursor-pointer font-sans text-[14px] font-[600] leading-[20px] tracking-normal text-[#111827] transition-opacity hover:opacity-70" onClick={() => setShowPrivacy(false)}>
                            <ChevronLeftIcon className="h-5 w-5" />
                            Back
                          </button>
                        </div>
        
                        {/* Privacy Notice Section */}
                        <div className="mb-6 flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF5FF]">
                            <SolidLockIcon className="h-5 w-5 text-[#1557F5]" />
                          </div>
                          <h2 className="m-0 text-[1.75rem] font-bold text-[#1557F5] max-[768px]:text-[1.35rem]">Privacy Notice</h2>
                        </div>
        
                        <p className="mb-4 text-base font-normal leading-[1.5] text-[#111827]">SmartCD.AI respects your privacy.</p>
                        <p className="mb-4 text-[0.95rem] leading-[1.6] text-[#4B5563]">We may collect basic information you provide (such as income range, filing status, and residential state and city) to generate personalized CD and Treasury comparisons. We also collect limited usage data (like browser type and page visits) to improve our product.</p>
        
                        <div className="my-6 flex items-start gap-3 rounded-xl border border-[#D1E5F9] bg-[#F0F7FF] px-5 py-4 max-[768px]:px-[14px] max-[768px]:py-3">
                          <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#1D8DEE]" />
                          <span className="text-[0.95rem] font-medium leading-[1.5] text-[#1D8DEE]"><strong>We do not collect Social Security numbers or bank account credentials. We do not sell your personal information.</strong></span>
                        </div>
        
                        <p className="mb-4 text-[0.95rem] leading-[1.6] text-[#4B5563]">Your data is used only to provide recommendations and improve our AI models.</p>
                        <p className="mb-4 text-[0.95rem] leading-[1.6] text-[#4B5563]">By continuing to use SmartCD.AI, you agree to this Privacy Notice.</p>
        
                        <hr className="my-10 border-0 border-t border-[#E5E7EB]" />
        
                        {/* Terms of Service Section */}
                        <div className="mb-6 flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EBF5FF] text-blue">
                            <DocumentIcon className="h-5 w-5 text-[#1D8DEE]" />
                          </div>
                          <h2 className="m-0 text-[1.75rem] font-bold text-[#1557F5] max-[768px]:text-[1.35rem]">Terms of Service</h2>
                        </div>
        
                        <p className="mb-4 text-base font-bold leading-[1.5] text-[#111827]">By using SmartCD.AI, you agree to the following terms:</p>
        
                        <div className="mb-10 grid grid-cols-2 gap-y-8 gap-x-16 max-[640px]:grid-cols-1 max-[640px]:gap-6">
                          <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> Informational Use Only</div>
                            <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">SmartCD.AI provides CD, brokerage CD, and Treasury comparisons for informational purposes only. We do not provide financial, investment, tax, or legal advice.</p>
                          </div>
        
                          <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> No Guarantees</div>
                            <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">Rates, yields, and tax estimates are based on available data and assumptions. We do not guarantee accuracy, completeness, or future performance.</p>
                          </div>
        
                          <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> User Responsibility</div>
                            <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">You are responsible for verifying product terms directly with financial institutions before making investment decisions.</p>
                          </div>
        
                          <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> Acceptable Use</div>
                            <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">You agree not to misuse, copy, scrape, reverse engineer, or disrupt the platform in any way.</p>
                          </div>
        
                          <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FEF3C7] bg-[#FFFBEB] px-3 py-1.5 text-[0.85rem] font-semibold text-[#D97706]"><span className="inline-block h-2 w-2 rounded-full bg-[#F59E0B]"></span> Limitation of Liability</div>
                            <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">SmartCD.AI is not liable for investment decisions, financial losses, or damages arising from use of this service.</p>
                          </div>
        
                          <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[0.85rem] font-semibold text-[#1557F5]"><span className="inline-block h-2 w-2 rounded-full bg-[#1557F5]"></span> Updates</div>
                            <p className="text-[0.85rem] leading-[1.5] text-[#6B7280]">We may update these terms at any time. Continued use of SmartCD.AI means you accept the updated terms.</p>
                          </div>
                        </div>
                      </div>
                      
                      <footer className="mt-auto flex w-full flex-col items-center justify-center bg-[#1E2941] px-16 pt-8 pb-6 max-[768px]:px-[14px] max-[768px]:pt-[22px] max-[768px]:pb-[22px]">
                        <div className="mb-8 max-w-[1200px] text-center text-[0.75rem] font-medium leading-[1.5] text-[rgba(255,255,255,0.55)]">
                          SmartCD.AI is an AI-powered aggregator of publicly available information. Annual Percentage Yields (APY) are subject to change without notice. Minimum deposit requirements and regional availability may apply. This tool provides information for educational purposes only and does not constitute investment, financial, tax, or legal advice. Always verify rates directly with the financial institution before making investment decisions.
                        </div>
                        <div className="flex w-full max-w-[1200px] items-center justify-between border-t border-[rgba(255,255,255,0.1)] pt-6 max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-[10px] max-[768px]:pt-[14px]">
                          <div className="text-[0.8rem] font-medium text-[rgba(255,255,255,0.52)]">Last updated: March 2026</div>
                          <div className="text-[0.8rem] font-medium text-[rgba(255,255,255,0.85)]">© 2026 SmartCD.ai - All Rights Reserved</div>
                          <div className="text-[0.8rem] font-medium text-[rgba(255,255,255,0.52)] transition-opacity hover:opacity-80">
                            Privacy Policy · Terms of Service
                          </div>
                        </div>
                      </footer>
                    </div>
                  </div>
                </div>
    )
}