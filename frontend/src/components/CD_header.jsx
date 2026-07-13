
import React from 'react';
import {HeaderSearchIcon, MoonIcon, SunIcon} from './Icons/index';


//Screen Types
const MOCKUP_SCREENS = new Set(['bullet', 'barbell', 'ladder']);

//Sub Components


const SearchLabel = ({ containerClass }) => (
  <label className={containerClass}>
    <HeaderSearchIcon className="h-4 w-4 shrink-0 text-[#94A3B8]" />
    <span
      style={{
        color: '#94A3B8',
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 400,
        lineHeight: '20px',
      }}
    >
      Search Institution like Citi Bank
    </span>
  </label>
);

const ThemeToggle = ({ theme, setTheme, className }) => (
  <button
    type="button"
    aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    aria-pressed={theme === 'light'}
    onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
    className={className}
  >
    {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
  </button>
);




const CD_header = ( {theme, setTheme, onLogoClick }) => {

    return(
    <header className="flex items-center bg-[#101b30] px-4 py-3 max-[768px]:px-3 max-[768px]:py-2.5 hd">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onLogoClick}>
              <img
                src="/new-logo.png"
                alt="SmartCD.ai Logo"
                className="h-11 w-auto max-[768px]:h-9"
              />
            </div>
 
        

            
        <button
              type="button"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-pressed={theme === 'light'}
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className={`ml-auto inline-flex items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                theme === 'light'
                  ? 'h-10 w-10 border-[#CBD5E1] bg-[#EFF6FF] text-[#1E2941] focus:ring-[#1557F5] focus:ring-offset-white'
                  : 'h-10 w-10 border-[rgba(255,255,255,0.22)] bg-[rgba(255,255,255,0.08)] text-white focus:ring-[#92C5F9] focus:ring-offset-[#101b30]'
              }`}
            >
              {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
            </button>
    </header>
    )
}

export default CD_header;