import pandas as pd
from io import BytesIO
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def scrape_ferderal_tax(url):
    """
    Scrape federal tax data by getting the table from Tax Foundation website
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)

    soup = BeautifulSoup(response.text, "html.parser")

    table = soup.find("table")

    rows = []
    for tr in table.find_all("tr"):
        cols = [td.get_text(strip=True) for td in tr.find_all(["td","th"])]
        rows.append(cols)

    df = pd.DataFrame(rows[1:], columns=rows[0])
    return df


def scrape_state_tax(url):
    """
    Scrape state tax data from Tax Foundation website 
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)

    soup = BeautifulSoup(response.text, "html.parser")

    excel_link = None
    for link in soup.find_all("a", href=True):
        if ".xlsx" in link["href"]:
            excel_link = link["href"]
            print("Excel link for state taxes:", excel_link)
            break
    
    if not excel_link:
        raise ValueError("Excel link not found. Check URL or website structure.")
    else:
        response = requests.get(excel_link, headers=headers)
        df = pd.read_excel(BytesIO(response.content), header=1)
        return df