# scripts/bank_maps.py
import re
from typing import Optional, Dict

def norm_name(s: str) -> str:
    s = (s or "").strip().lower()
    s = s.replace("&", "and")
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


# Aliases to improve matching when scraped names vary
BANK_NAME_ALIASES: Dict[str, str] = {
    norm_name("E*TRADE"): norm_name("E*Trade"),
    norm_name("E TRADE"): norm_name("E*Trade"),
    norm_name("American Express"): norm_name("American Express National Bank"),
    norm_name("AmEx National Bank"): norm_name("American Express National Bank"),
}


def canonical_bank_key(bank_name: str) -> str:
    n = norm_name(bank_name)
    return BANK_NAME_ALIASES.get(n, n)


# Unified, single source of truth for bank destination pages
# Keys are normalized canonical names
BANK_DEST_URL_MAP: Dict[str, str] = {
    canonical_bank_key("Marcus by Goldman Sachs"): "https://www.marcus.com/us/en/savings/high-yield-cds",
    canonical_bank_key("Capital One"): "https://www.capitalone.com/bank/cds/",
    canonical_bank_key("American Express National Bank"): "https://www.americanexpress.com/en-us/banking/online-savings/cd-account/",
    canonical_bank_key("Synchrony Bank"): "https://www.synchronybank.com/banking/cd/",
    canonical_bank_key("Ally Bank"): "https://www.ally.com/bank/high-yield-cd/",
    canonical_bank_key("Discover Bank"): "https://www.discover.com/online-banking/cd/",
    canonical_bank_key("CIT Bank"): "https://www.cit.com/cit-bank/bank/cds",
    canonical_bank_key("Barclays"): "https://www.banking.barclaysus.com/online-cd.html",
    canonical_bank_key("Popular Direct"): "https://www.populardirect.com/products/cds",
    canonical_bank_key("First National Bank of America"): "https://www.fnba.com/personal-banking/certificates-of-deposit/",
    canonical_bank_key("Bread Savings"): "https://www.breadsavings.com/products/certificates-of-deposit/",
    canonical_bank_key("Limelight Bank"): "https://www.limelightbank.com/certificates-of-deposit",
    canonical_bank_key("Live Oak Bank"): "https://www.liveoak.bank/personal-cd-accounts/",
    canonical_bank_key("BMO Alto"): "https://www.alto.bmo.com/en-us/high-yield-cd/",
    canonical_bank_key("Vio Bank"): "https://www.viobank.com/cd",
    canonical_bank_key("Quontic Bank"): "https://www.quontic.com/banking/savings/certificates-of-deposit/",
    canonical_bank_key("Newtek Bank"): "https://www.newtekbank.com/certificate-of-deposit/",
    canonical_bank_key("CFG Bank"): "https://www.cfg.bank/personal-banking/personal-deposit-rates/",
    canonical_bank_key("Sallie Mae"): "https://www.salliemae.com/banking/cds/",
    canonical_bank_key("TAB Bank"): "https://www.tabbank.com/cd-rates-terms/",
    canonical_bank_key("Alliant Credit Union"): "https://www.alliantcreditunion.org/bank/credit-union-certificate",
    canonical_bank_key("Colorado Federal Savings Bank"): "https://www.coloradofederalbank.com/deposits",
    canonical_bank_key("E*Trade"): "https://us.etrade.com/invest/cd-rates",
    canonical_bank_key("M.Y. Safra Bank"): "https://www.mysafra.com/MYSB-Online-Offers",
    canonical_bank_key("WebBank"): "https://www.webbank.com/rates-fees",
    canonical_bank_key("Credit One Bank"): "https://www.creditonebank.com/deposits/cd-brx?productId=12M_CD_STAND&app_source=BRLPT_090524_BRX_RTX_CDPP_01",
    canonical_bank_key("Lending Club"): "https://www.lendingclub.com/pd/af/personal-savings/cd?utm_campaign=00695&pid=2&utm_medium=affiliate&utm_source=Bankrate&utm_content=7&publisher_details=Bankrate&ranMID=53672&ranEAID=27pXCeFyR%2FA&ranSiteID=27pXCeFyR_A-HEUhrwyWsNdZB1EzJ6KoAg",

}


def bank_destination_url(bank_name: str) -> Optional[str]:
    return BANK_DEST_URL_MAP.get(canonical_bank_key(bank_name))