import React, { useState } from 'react';

// Map of normalized provider name -> public URL of bank logo asset.
// Add an entry per provider variant the API may return (e.g. "Marcus", "Marcus by Goldman Sachs").
// Filenames in /public/bank-logos/ may contain spaces — URL-encode paths here if needed (e.g. 'Goldman Sachs.svg' → 'Goldman%20Sachs.svg').
const BANK_LOGO_MAP = {
  'bank of america': '/bank-logos/BoA.wine.svg',
  'bank of america corporation': '/bank-logos/BoA.wine.svg',
  'bofa': '/bank-logos/BoA.wine.svg',
  'boa': '/bank-logos/BoA.wine.svg',

  'chase': '/bank-logos/Chase.wine.svg',
  'chase bank': '/bank-logos/Chase.wine.svg',
  'jpmorgan': '/bank-logos/Chase.wine.svg',
  'jpmorgan chase': '/bank-logos/Chase.wine.svg',
  'jpmorgan chase bank': '/bank-logos/Chase.wine.svg',
  'jp morgan chase': '/bank-logos/Chase.wine.svg',
  'jp morgan': '/bank-logos/Chase.wine.svg',

  'citi': '/bank-logos/CitiBank.wine.svg',
  'citi bank': '/bank-logos/CitiBank.wine.svg',
  'citibank': '/bank-logos/CitiBank.wine.svg',
  'citigroup': '/bank-logos/CitiBank.wine.svg',

  'goldman sachs': '/bank-logos/GoldmanSachs.wine.svg',
  'goldman sachs bank usa': '/bank-logos/GoldmanSachs.wine.svg',
  'marcus': '/bank-logos/GoldmanSachs.wine.svg',
  'marcus by goldman sachs': '/bank-logos/GoldmanSachs.wine.svg',

  'wells fargo': '/bank-logos/WellsFargo.wine.svg',
  'wells fargo bank': '/bank-logos/WellsFargo.wine.svg',
  'wells fargo & company': '/bank-logos/WellsFargo.wine.svg',
};

const normalizeProviderForLogo = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[.,'"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const getBankLogoUrl = (result) => {
  // All Treasury products share a single icon regardless of "provider" string.
  if (result?.productType === 'Treasuries') return '/bank-logos/Treasury.svg';
  const key = normalizeProviderForLogo(result?.provider);
  if (!key) return null;
  if (BANK_LOGO_MAP[key]) return BANK_LOGO_MAP[key];
  // Fall back to a substring match so e.g. "Goldman Sachs Bank USA, N.A." still matches "goldman sachs".
  for (const [k, url] of Object.entries(BANK_LOGO_MAP)) {
    if (key.includes(k)) return url;
  }
  return null;
};

const BankBadge = ({ result }) => {
  const logoUrl = getBankLogoUrl(result);
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(logoUrl) && !failed;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white max-[480px]:h-8 max-[480px]:w-8">
      {showLogo ? (
        <img
          src={logoUrl}
          alt={result.provider ? `${result.provider} logo` : 'Bank logo'}
          className="h-full w-full object-contain p-1"
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
