from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path
import os, numpy as np, pandas as pd, re
from datetime import datetime
from scrape import scrape_ferderal_tax, scrape_state_tax
from extract_taxes import get_federal_taxes, get_state_taxes, get_local_taxes

# ---------Initialization ---------
# current file path
base_dir = Path(__file__).resolve().parent

# parent directory path
parent_dir = base_dir.parent

# load .env file from parent directory
load_dotenv(parent_dir / ".env")

# load variables from .env file
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

# get folder path from .env file
base_dir = os.path.dirname(os.path.abspath(__file__))
local_taxes_path = os.path.join(base_dir, os.environ.get("LOCAL_TAXES_FILE_NAME"))

# create webiste urls
# get currect
year = datetime.now().year

federal_tax_url = f"https://taxfoundation.org/data/all/federal/{year}-tax-brackets/"
state_tax_url = f"https://taxfoundation.org/data/all/state/state-income-tax-rates-{year}/"


# -------------Fetch data from website-----------------
# get excel files from websites (federal and state tax data)
print("Fetching data from website and excel file...")
df_federal = scrape_ferderal_tax(federal_tax_url)
df_state = scrape_state_tax(state_tax_url)

# get local tax from excel file
df_local = get_local_taxes(local_taxes_path)
print("\n-----------Data fetching completed-----------\n")


# -------------Extract relevant data and transform data-----------------
print("Extracting relevant data and transforming data for federal and statetaxes ...\n")
df_federal_cleaned = get_federal_taxes(df_federal)
df_config_cleaned, df_brackets_cleaned = get_state_taxes(df_state)
df_local_cleaned = get_local_taxes(local_taxes_path)
print("\n-----------Data extraction and transformation completed-----------\n")

print(df_federal_cleaned.head())
print(df_config_cleaned.head())
print(df_brackets_cleaned.head())
print(df_local_cleaned.head())
# -------------store data into database-------------
print("Storing data into database...\n")
# convert cleaned dataframes to list of dicts for db insertion
federal_data = df_federal_cleaned.replace({np.nan: None}).to_dict(orient='records')
config_data = df_config_cleaned.replace({np.nan: None}).to_dict(orient='records')
brackets_data = df_brackets_cleaned.replace({np.nan: None}).to_dict(orient='records')
local_data = df_local_cleaned.replace({np.nan: None}).to_dict(orient='records')

# create supabase client
supabase: Client = create_client(url, key)

# rebuild bd tables by deleting existing data and inserting new data
### federal taxes table
supabase.table("federal_taxes").delete().neq("id", -1).execute()

# insert new data into db
supabase.table("federal_taxes").insert(federal_data).execute()


### state and local taxes tables
supabase.table("states_tax_config").delete().neq("state_id", "NONE").execute()
supabase.table("tax_brackets").delete().neq("state_id", "NONE").execute()
supabase.table("local_taxes").delete().neq("state", "NONE").execute()


# insert data into db
supabase.table("states_tax_config").insert(config_data).execute()
supabase.table("tax_brackets").insert(brackets_data).execute()
supabase.table("local_taxes").insert(local_data).execute()


print('Finished upserting data to Database.')