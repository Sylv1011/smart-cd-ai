import React, { useEffect, useState } from 'react';

const nameToSlug = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Maps slugified API name variants → canonical filename slug.
// Only needed when the API string doesn't naturally slug to the filename.
const SLUG_ALIASES = {
  // JPMorgan Chase
  'chase':                      'jpmorgan-chase',
  'chase-bank':                 'jpmorgan-chase',
  'jpmorgan':                   'jpmorgan-chase',
  'jpmorgan-chase-bank':        'jpmorgan-chase',
  'jp-morgan':                  'jpmorgan-chase',
  'jp-morgan-chase':            'jpmorgan-chase',
  'jp-morgan-chase-bank':       'jpmorgan-chase',

  // Bank of America
  'bank-of-america-corporation': 'bank-of-america',
  'bofa':                        'bank-of-america',
  'boa':                         'bank-of-america',

  // Citibank
  'citi':                       'citibank',
  'citi-bank':                  'citibank',
  'citigroup':                  'citibank',

  // Goldman Sachs
  'goldman-sachs-bank-usa':     'goldman-sachs',
  'marcus':                     'goldman-sachs',
  'marcus-by-goldman-sachs':    'goldman-sachs',

  // Wells Fargo
  'wells-fargo-bank':           'wells-fargo',
  'wells-fargo-company':        'wells-fargo',

  // U.S. Bank — "US Bank" (no periods) slugs to "us-bank", not "u-s-bank"
  'us-bank':                    'u-s-bank',
  'us-bancorp':                 'u-s-bank',
  'u-s-bancorp':                'u-s-bank',

  // U.S. Treasury
  'us-treasury':                'us-treasury',
  'u-s-treasury':               'us-treasury',
  'united-states-treasury':     'us-treasury',

  // BNY Mellon
  'bank-of-new-york-mellon':              'bny-mellon',
  'the-bank-of-new-york-mellon':          'bny-mellon',
  'bank-of-new-york-mellon-corporation':  'bny-mellon',

  // BMO
  'bank-of-montreal':           'bmo',
  'bmo-bank':                   'bmo',
  'bmo-harris':                 'bmo',
  'bmo-harris-bank':            'bmo',

  // TIAA Bank (rebranded back to EverBank in 2023)
  'everbank':                   'tiaa-bank',
  'tiaa-bank-everbank':         'tiaa-bank',
  'tiaa':                       'tiaa-bank',

  // Huntington
  'huntington':                 'huntington-national-bank',
  'huntington-bancshares':      'huntington-national-bank',
  'huntington-bank':            'huntington-national-bank',

  // PNC
  'pnc':                        'pnc-bank',
  'pnc-financial':              'pnc-bank',
  'pnc-financial-services':     'pnc-bank',

  // TD Bank
  'td-bank-n-a':                'td-bank',

  // Discover
  'discover':                   'discover-bank',
  'discover-financial':         'discover-bank',
  'discover-financial-services': 'discover-bank',

  // Charles Schwab
  'charles-schwab':             'charles-schwab-bank',
  'charles-schwab-corporation': 'charles-schwab-bank',

  // E*TRADE
  'e-trade':                    'e-trade-bank',
  'etrade':                     'e-trade-bank',
  'etrade-bank':                'e-trade-bank',

  // Regions
  'regions':                    'regions-bank',
  'regions-financial':          'regions-bank',
  'regions-financial-corporation': 'regions-bank',

  // KeyBank
  'keycorp':                    'keybank',
  'key-bank':                   'keybank',

  // Ally
  'ally':                       'ally-financial',
  'ally-bank':                  'ally-financial',

  // Truist
  'truist':                     'truist-bank',
  'truist-financial':           'truist-bank',

  // Barclays
  'barclays-bank':              'barclays',
  'barclays-bank-delaware':     'barclays',

  // Bread Savings
  'bread-financial':            'bread-savings',
  'bread-financial-holdings':   'bread-savings',

  // State Street
  'state-street':               'state-street-corporation',

  // American Express
  'amex':                       'american-express',
  'american-express-company':   'american-express',

  // Santander
  'santander':                  'santander-bank',
  'santander-bank-n-a':         'santander-bank',

  // HSBC
  'hsbc':                       'hsbc-bank-usa',
  'hsbc-usa':                   'hsbc-bank-usa',

  // Comerica
  'comerica':                   'comerica-bank',
  'comerica-incorporated':      'comerica-bank',

  // Zions
  'zions':                      'zions-bank',
  'zions-bancorporation':       'zions-bank',

  // Western Alliance
  'western-alliance':                  'western-alliance-bank',
  'western-alliance-bancorporation':   'western-alliance-bank',

  // NYCB
  'new-york-community-bancorp': 'new-york-community-bank',
  'nycb':                       'new-york-community-bank',

  // Flagstar
  'flagstar':                   'flagstar-bank',
  'flagstar-bancorp':           'flagstar-bank',

  // Popular Bank
  'popular-inc':                'popular-bank',
  'banco-popular':              'popular-bank',

  // East West Bank
  'east-west-bancorp':          'east-west-bank',

  // Wintrust
  'wintrust':                   'wintrust-financial',
  'wintrust-bank':              'wintrust-financial',

  // Synovus
  'synovus-bank':               'synovus',
  'synovus-financial':          'synovus',

  // City National
  'city-national':              'city-national-bank',
  'city-national-corporation':  'city-national-bank',

  // M&T Bank
  'm-t-bank-corporation':       'm-t-bank',
  'manufacturers-and-traders':  'm-t-bank',

  // Webster
  'webster':                    'webster-bank',
  'webster-financial':          'webster-bank',

  // Northern Trust
  'northern-trust-corporation': 'northern-trust',

  // Citizens Financial Group
  'citizens-bank':              'citizens-financial-group',
  'citizens-financial':         'citizens-financial-group',

  // First Citizens Bank
  'first-citizens-bancshares':  'first-citizens-bank',

  // Capital One
  'capital-one-financial':             'capital-one',
  'capital-one-financial-corporation': 'capital-one',

  // Raymond James
  'raymond-james-bank':         'raymond-james',
  'raymond-james-financial':    'raymond-james',

  // Pacific Western
  'pacwest':                    'pacific-western-bank',
  'pacwest-bancorp':            'pacific-western-bank',

  // Valley National
  'valley-national-bancorp':    'valley-national-bank',
  'valley-bank':                'valley-national-bank',

  // First National Bank (FNBO)
  'fnbo':                       'first-national-bank',
  'first-national-bank-of-omaha': 'first-national-bank',

  // Associated Bank
  'associated-banc-corp':       'associated-bank',

  // Fulton Bank
  'fulton-financial':           'fulton-bank',
  'fulton-financial-corporation': 'fulton-bank',

  // Capital City Bank
  'capital-city-bank-group':    'capital-city-bank',

  // Banc of California
  'banc-of-california-inc':     'banc-of-california',
};

export const getBankLogoUrl = (result) => {
  if (result?.productType === 'Treasuries') return '/bank-logos/us-treasury.svg';
  const slug = nameToSlug(result?.provider);
  if (!slug) return null;
  const canonical = SLUG_ALIASES[slug] ?? slug;
  return `/bank-logos/${canonical}.svg`;
};

const BankBadge = ({ result }) => {
  const logoUrl = getBankLogoUrl(result);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  const showLogo = Boolean(logoUrl) && !failed;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-white max-[480px]:h-8 max-[480px]:w-8">
      {showLogo ? (
        <img
          src={logoUrl}
          alt={result.provider ? `${result.provider} logo` : 'Bank logo'}
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[0.9rem] font-bold text-[#1D4ED8] max-[480px]:text-[0.72rem]">
          {String(result?.provider || '').substring(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default BankBadge;
