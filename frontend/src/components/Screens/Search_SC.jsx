import StrictSelect from '../StrictSelect';
import StateAutocomplete from '../StateAutocomplete';
import SearchableSelect from '../SearchableSelect';
import {LockIcon, SparkleIcon, ShieldCheckIcon} from '../Icons/index';
import {useState} from 'react';
import { locationData } from '../../utils/locationData';
import { usStates } from '../../utils/statesData';
import { stateNameToCode } from '../../utils/stateCodes';

const STATES_WITH_LOCAL_TAX = ['New York', 'Maryland', 'Indiana', 'Michigan'];

const ALLOWED_TERM_MONTHS = [3, 6, 9, 12, 18, 24, 36, 48, 60];
const TERM_LENGTH_OPTIONS = [
  '3 Month',
  '6 Month',
  '9 Month',
  '12 Month',
  '18 Month',
  '24 Month',
  '3 Year',
  '4 Year',
  '5 Year',
];

const INCOME_RANGE_OPTIONS = [
  '<$25,000',
  '$25,000 - $50,000',
  '$50,000 - $75,000',
  '$75,000 - $100,000',
  '$100,000 - $150,000',
  '$150,000 - $200,000',
  '$200,000+',
];

const FILING_STATUS_OPTIONS = [
  'Single',
  'Married Filing Jointly (includes Qualifying Surviving Spouse)',
  'Married Filing Separately',
  'Head of Household',
];

const parseTermToMonths = (label) => {
  const v = (label || '').trim();
  const m = v.match(/^(\d+)\s*(Month|Year)/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = (m[2] || '').toLowerCase();
    return unit.startsWith('year') ? n * 12 : n;
  }
  if (/^5\s*Year/i.test(v)) return 60;
  // Safe fallback: 12 months
  return 12;
};

const Search_SC = ({onFetchRank, loading, setShowPrivacy, showResults, formData, setFormData }) => {

    const [error, setError] = useState(null);
    const [showErrors, setShowErrors] = useState(false);
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [touchedFields, setTouchedFields] = useState({});
    const [selectedStateCode, setSelectedStateCode] = useState('');

    const getAllowedAreas = (stateSelection) => {
        const state = (stateSelection || '').trim();
        return state ? (locationData[state] || []) : [];
      };  

    const getFieldError = (fieldName, data = formData) => {
        const amount = parseFloat(data.investment_amount);
        const state = (data.state_selection || '').trim();
        const income = (data.income_range || '').trim();
        const filing = (data.tax_filing_status || '').trim();
        const term = (data.term_length_months || '').trim();
        const cityCounty = (data.city_county || '').trim();
        const cityCountyLower = cityCounty.toLowerCase();
        const isCityRequired = STATES_WITH_LOCAL_TAX.includes(state);
        const allowedAreas = getAllowedAreas(state);
        const allowedAreasLower = allowedAreas.map((x) => String(x).toLowerCase());
    
        if (fieldName === 'investment_amount') {
          if (!data.investment_amount) return 'Please enter a cash amount.';
          if (!Number.isFinite(amount)) return 'Please enter a valid amount.';
          if (amount < 5000) return 'Minimum cash amount is $5,000.';
          return '';
        }
    
        if (fieldName === 'term_length_months') {
          if (!term) return 'Please select a duration.';
          if (!ALLOWED_TERM_MONTHS.includes(parseTermToMonths(term))) return 'Please select a valid duration.';
          return '';
        }
    
        if (fieldName === 'income_range') {
          if (!income) return 'Please select an annual income range.';
          if (!INCOME_RANGE_OPTIONS.includes(income)) return 'Please select a valid income range.';
          return '';
        }
    
        if (fieldName === 'state_selection') {
          if (!state) return 'Please select a state.';
          if (!usStates.includes(state)) return 'Please select a valid U.S. state from the list.';
          return '';
        }
    
        if (fieldName === 'city_county') {
          if (!isCityRequired) return '';
          if (!cityCounty) return 'Please select a city/county for this state.';
          if (cityCountyLower !== 'other' && !allowedAreasLower.includes(cityCountyLower)) {
            return 'Please select a valid city/county from the list.';
          }
          return '';
        }
    
        if (fieldName === 'tax_filing_status') {
          if (!filing) return 'Please select a filing status.';
          if (!FILING_STATUS_OPTIONS.includes(filing)) return 'Please select a valid filing status.';
          return '';
        }
    
        return '';
      };

    const getVisibleFieldError = (fieldName) => {
        if (!showErrors && !touchedFields[fieldName]) {
        return '';
        }
        return getFieldError(fieldName);
    };

    const isAutoRefreshField = (name) => (
        name === 'term_length_months' ||
        name === 'income_range' ||
        name === 'state_selection' ||
        name === 'city_county' ||
        name === 'tax_filing_status'
      );
    
      const handleChange = (e) => {
        const { name, value } = e.target;
    
        if (name === 'state_selection') {
          const isCityCountyEnabled = STATES_WITH_LOCAL_TAX.includes(value);
          const allowedAreas = isCityCountyEnabled ? getAllowedAreas(value) : [];
          const nextCityCounty =
            isCityCountyEnabled
              ? (allowedAreas.includes(formData.city_county) ? formData.city_county : '')
              : '';
          setSelectedStateCode(stateNameToCode[value] || '');
          const nextFormData = {
            ...formData,
            [name]: value,
            city_county: nextCityCounty,
          };
          setFormData(nextFormData);
          if (showResults) {
            scheduleAutoRefreshRank(nextFormData);
          }
          return;
        }
    
        const nextFormData = { ...formData, [name]: value };
        setFormData(nextFormData);
    
        if (isAutoRefreshField(name) && showResults) {
          scheduleAutoRefreshRank(nextFormData);
        }
      };
    
      const handleFieldBlur = (e) => {
        const { name, value } = e.target;
        if (!name) {
          return;
        }
    
        if (name === 'state_selection' && value !== formData.state_selection) {
          const isCityCountyEnabled = STATES_WITH_LOCAL_TAX.includes(value);
          const allowedAreas = isCityCountyEnabled ? getAllowedAreas(value) : [];
          const nextCityCounty =
            isCityCountyEnabled
              ? (allowedAreas.includes(formData.city_county) ? formData.city_county : '')
              : '';
    
          setSelectedStateCode(stateNameToCode[value] || '');
          setFormData((prev) => ({
            ...prev,
            state_selection: value,
            city_county: nextCityCounty,
          }));
        }
    
        setTouchedFields((prev) => ({
          ...prev,
          [name]: true,
        }));
      };
    
      const handleSearch = async (e) => {
        e.preventDefault();
    
        const hasFieldValidationError = [
          'investment_amount',
          'term_length_months',
          'income_range',
          'state_selection',
          'city_county',
          'tax_filing_status',
        ].some((fieldName) => Boolean(getFieldError(fieldName)));
    
        if (hasFieldValidationError || !termsAgreed) {
          setTouchedFields((prev) => ({
            ...prev,
            investment_amount: true,
            term_length_months: true,
            income_range: true,
            state_selection: true,
            city_county: true,
            tax_filing_status: true,
          }));
          setShowErrors(true);
          setError("Please enter at least $5,000 and complete all selections.");
          return;
        }
    
        setShowErrors(false);
        await onFetchRank(formData, { navigateToResults: true, scrollToTop: true });
      };


    const investmentAmountError = getVisibleFieldError('investment_amount');
    const termLengthError = getVisibleFieldError('term_length_months');
    const incomeRangeError = getVisibleFieldError('income_range');
    const stateSelectionError = getVisibleFieldError('state_selection');
    const cityCountyError = getVisibleFieldError('city_county');
    const filingStatusError = getVisibleFieldError('tax_filing_status');

    const hasAnyValidationError = [
        'investment_amount',
        'term_length_months',
        'income_range',
        'state_selection',
        'city_county',
        'tax_filing_status',
    ].some((fieldName) => Boolean(getFieldError(fieldName)));

    const isFormValid = !hasAnyValidationError && termsAgreed;

    

    return (
         <>
            <div className="text-center max-w-[900px] mb-[60px] flex flex-col items-center max-[768px]:mb-7">
                      <div className="inline-flex items-center gap-2 bg-[rgba(29,141,238,0.1)] border border-[rgba(29,141,238,0.3)] text-[#92C5F9] px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] mb-8 normal-case max-[768px]:mb-[18px]">
                        <SparkleIcon className="w-3 h-3 text-[#1D8DEE]" />
                        AI Powered Fixed Income Analysis
                      </div>
        
                      <div className="border-0 outline-none shadow-none px-10 py-[10px] mb-6 relative max-[768px]:px-0 max-[768px]:py-2 max-[768px]:mb-4">
                        <h1 className="text-[3.5rem] font-extrabold leading-[1.15] tracking-[-0.02em] max-[768px]:text-[clamp(1.8rem,8.5vw,2.4rem)] max-[768px]:leading-[1.2] max-[480px]:text-[clamp(1.6rem,9vw,2rem)]">
                          <span className="text-blue-light">
                            The Only AI That Calculates Your <br className="max-[768px]:hidden" />
                            True{' '}
                          </span>
                          <span className="text-green">After-Tax Winner.</span>
                        </h1>
                      </div>
        
                      <p className="text-[1.125rem] text-[#8B9BB4] leading-[1.6] max-w-[760px] mx-auto mb-8 max-[768px]:text-[0.96rem] max-[768px]:leading-[1.5] max-[768px]:mb-5 max-[768px]:px-1">
                        Our AI scans thousands of CDs and Treasuries to find your optimal investment —<br className="max-[768px]:hidden" />
                        automatically factoring in state tax exemptions to reveal the true after-tax winner.
                      </p>
        
                      <div className="flex gap-4 justify-center max-[768px]:flex-wrap max-[768px]:gap-[10px]">
                        <div className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#E2E8F0] px-[14px] py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] normal-case max-[480px]:px-3 max-[480px]:py-[5px] max-[480px]:text-[0.7rem]"><LockIcon className="w-3 h-3 text-[#FFD54F]" /> Secure</div>
                        <div className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#E2E8F0] px-[14px] py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] normal-case max-[480px]:px-3 max-[480px]:py-[5px] max-[480px]:text-[0.7rem]"><SparkleIcon className="w-3 h-3 text-white" /> AI Powered</div>
                        <div className="inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#E2E8F0] px-[14px] py-1.5 rounded-full text-xs font-semibold tracking-[0.05em] normal-case max-[480px]:px-3 max-[480px]:py-[5px] max-[480px]:text-[0.7rem]"><ShieldCheckIcon className="w-3 h-3 text-[#4DD0E1]" /> Tax Aware</div>
                      </div>
                    </div>
        
                    {/* Dashboard Layout */}
                    <div className="dashboard-grid justify-center">
                      <div className="card-container main-card">
                        <h2 className="card-title">
                          <div className="title-icon-wrapper">
                            <SparkleIcon className="card-title-icon" />
                          </div>
                          Your Investment Preferences
                        </h2>
        
                        {error && <div role="alert" className="text-[#FF5252] mb-4 text-[0.9rem] text-center">{error}</div>}
        
                        <form className="flex flex-col gap-6 max-[768px]:gap-4" onSubmit={handleSearch}>
                          <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1 max-[640px]:gap-4">
                            <div className="flex flex-col gap-2.5 relative">
                              <label htmlFor="investment_amount" className="text-xs font-semibold text-[#6B7280] capitalize">Cash Amount</label>
                              <div className="relative flex items-center">
                                <span className="absolute left-4 text-[#111827] font-semibold pointer-events-none flex items-center">$</span>
                                <input
                                  type="number"
                                  id="investment_amount"
                                  name="investment_amount"
                                  value={formData.investment_amount}
                                  onChange={handleChange}
                                  onBlur={handleFieldBlur}
                                  className={`w-full pl-8 pr-4 py-4 text-base font-medium rounded-[8px] border outline-none bg-white text-[#111827] transition-all placeholder:text-[#9CA3AF] placeholder:font-normal appearance-none focus:shadow-[0_0_0_2px_rgba(29,141,238,0.3)] ${investmentAmountError ? 'border-[#FF5252] shadow-[0_0_0_2px_rgba(255,82,82,0.2)]' : 'border-[#E5E7EB]'}`}
                                  placeholder="Enter amount ($5,000 minimum)"
                                  min="5000"
                                  required
                                />
                              </div>
                              {investmentAmountError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{investmentAmountError}</p>}
                            </div>
                            <div className="flex flex-col gap-2.5 relative">
                              <label htmlFor="term_length_months" className="text-xs font-semibold text-[#6B7280] capitalize">Duration</label>
                              <StrictSelect
                                name="term_length_months"
                                value={formData.term_length_months}
                                onChange={handleChange}
                                onBlur={handleFieldBlur}
                                options={TERM_LENGTH_OPTIONS}
                                placeholder="Select Duration"
                                hasError={Boolean(termLengthError)}
                                hasSeparators={true}
                              />
                              {termLengthError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{termLengthError}</p>}
                            </div>
                          </div>
        
                          <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1 max-[640px]:gap-4">
                            <div className="flex flex-col gap-2.5 relative">
                              <label htmlFor="state_selection" className="text-xs font-semibold text-[#6B7280] capitalize">State</label>
                              <StateAutocomplete
                                name="state_selection"
                                value={formData.state_selection}
                                onChange={handleChange}
                                onBlur={handleFieldBlur}
                                options={usStates}
                                placeholder="Select State"
                                hasError={Boolean(stateSelectionError)}
                              />
                              {stateSelectionError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{stateSelectionError}</p>}
                            </div>
                            <div className="flex flex-col gap-2.5 relative">
                              <label htmlFor="city_county" className="text-xs font-semibold text-[#6B7280] capitalize">City / County</label>
                              <SearchableSelect
                                name="city_county"
                                value={formData.city_county}
                                onChange={handleChange}
                                onBlur={handleFieldBlur}
                                options={
                                  formData.state_selection 
                                    ? (locationData[formData.state_selection] || []) 
                                    : Object.values(locationData).flat()
                                }
                                placeholder="Select or type City/County"
                                hasError={Boolean(cityCountyError)}
                                disabled={!STATES_WITH_LOCAL_TAX.includes(formData.state_selection)}
                              />
                              {cityCountyError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{cityCountyError}</p>}
                            </div>
                          </div>
        
                          <div className="grid grid-cols-2 gap-6 max-[640px]:grid-cols-1 max-[640px]:gap-4">
                            <div className="flex flex-col gap-2.5 relative">
                              <label htmlFor="income_range" className="text-xs font-semibold text-[#6B7280] capitalize">Annual Income Range</label>
                              <StrictSelect
                                name="income_range"
                                value={formData.income_range}
                                onChange={handleChange}
                                onBlur={handleFieldBlur}
                                options={INCOME_RANGE_OPTIONS}
                                placeholder="Select Income Range"
                                hasError={Boolean(incomeRangeError)}
                              />
                              {incomeRangeError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{incomeRangeError}</p>}
                            </div>
                            <div className="flex flex-col gap-2.5 relative">
                              <label htmlFor="tax_filing_status" className="text-xs font-semibold text-[#6B7280] capitalize">Tax Filing Status</label>
                              <StrictSelect
                                name="tax_filing_status"
                                value={formData.tax_filing_status}
                                onChange={handleChange}
                                onBlur={handleFieldBlur}
                                options={FILING_STATUS_OPTIONS}
                                placeholder="Select Filing Status"
                                hasError={Boolean(filingStatusError)}
                              />
                              {filingStatusError && <p className="text-[0.75rem] font-medium text-[#FF5252]">{filingStatusError}</p>}
                            </div>
                          </div>
        
                          <div className="flex justify-center items-center mt-3 mb-6 max-[768px]:mt-1.5 max-[768px]:mb-3.5">
                            <label className="flex items-center gap-2 text-[0.8rem] text-[#9CA3AF] normal-case font-medium cursor-pointer max-[768px]:items-start max-[768px]:leading-[1.4]">
                              <input
                                type="checkbox"
                                checked={termsAgreed}
                                onChange={(e) => setTermsAgreed(e.target.checked)}
                                className="w-4 h-4 accent-[#1D8DEE] cursor-pointer"
                              />
                              <span>
                                By continuing to use SmartCD.AI, you agree to our{' '}
                                <u className="text-[#E2E8F0] cursor-pointer underline" onClick={() => setShowPrivacy(true)}>Privacy Policy and Terms of Service</u>.
                              </span>
                            </label>
                          </div>
        
                          <div className="flex justify-center mt-6 max-[768px]:mt-2">
                            <button type="submit" className="theme-keep-white flex items-center justify-center gap-3 w-full max-w-[500px] px-4 py-4 text-base font-bold tracking-[0.02em] text-white bg-[linear-gradient(90deg,#1C74E9_0%,#15B0F8_100%)] border-0 rounded-full cursor-pointer transition-all shadow-[0_10px_20px_-5px_rgba(29,141,238,0.4)] [&:not(:disabled):hover]:-translate-y-0.5 [&:not(:disabled):hover]:shadow-[0_14px_24px_-5px_rgba(29,141,238,0.5)] [&:not(:disabled):active]:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed max-[768px]:max-w-full" disabled={loading || !isFormValid}>
                              <SparkleIcon className="w-4 h-4" />
                              {loading ? "Submitting..." : "FIND BEST YIELDS"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </>
    )
}

export default Search_SC; 