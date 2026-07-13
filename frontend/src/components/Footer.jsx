const Footer = (showResults) => {
    return(
    <footer className="mt-auto flex w-full flex-col items-center justify-center bg-[#1E2941] py-3 max-[768px]:px-[14px] max-[768px]:py-[22px]">
          <div className="text-[0.8rem] font-medium text-[rgba(255,255,255,0.52)]">Last updated: March 2026</div>
          <div className="mb-2 text-[0.85rem] font-semibold text-[rgba(255,255,255,0.85)]">
            © 2026 SmartCD.ai - All Rights Reserved
          </div>
          <div className="max-w-[1300px] text-center text-[0.75rem] font-medium leading-[1.5] text-[rgba(255,255,255,0.55)]">
            SmartCD.AI is an AI-powered aggregator of publicly available information. Annual Percentage Yields (APY) are subject to change without notice. Minimum deposit requirements and regional availability may apply. This tool provides information for educational purposes only and does not constitute investment, financial, tax, or legal advice. Always verify rates directly with the financial institution before making investment decisions.
          </div>
    </footer>
)}

export default Footer;

