from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path
import os, numpy as np, pandas as pd, re

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
federal_taxes_path = os.path.join(base_dir, os.environ.get("FEDERAL_TAXES_FILE_NAME"))

# print(federal_taxes_path)
# create supabase client
supabase: Client = create_client(url, key)


# -------------------Fetch data from excel files-----------------
# read excel file into pandas dataframe
df_federal = pd.read_excel(federal_taxes_path, header = 1)
# print(df_federal.columns)

# remove space and newline in column names
df_federal.columns = df_federal.columns.str.strip().str.replace('\n', ' ')

# convetrt from wide to long format
df_long = df_federal.melt(
    id_vars=['Tax Rate'], 
    var_name='raw_status', 
    value_name='income_range'
)


def map_status(name):
    """
    Map raw filing status to standardized filing status.
    """
    name = str(name).lower()
    if 'single' in name: return 'single'
    if 'married' in name: return 'married'
    if 'head' in name or 'household' in name: return 'head_household'
    return 'unknown'

# apply mapping function to create new column 'filing_status'
df_long['filing_status'] = df_long['raw_status'].apply(map_status)


def extract_income(text):
    """
    Extract lower and upper income bounds from the income range text.
    """
    if pd.isna(text): 
        return None, None
    
    # remove $ and spaces, and commas from the text
    s = str(text).replace('$', '').replace(',', '').strip()
    
    # matching "640601 or more"
    if 'or more' in s.lower():
        num = re.findall(r'\d+', s)
        return int(num[0]), None
        
    # matching "0 to 12400"
    nums = re.findall(r'\d+', s)
    if len(nums) >= 2:
        return int(nums[0]), int(nums[1])
    
    return None, None

# parse income range to get lower and upper bounds
income_data = df_long['income_range'].apply(extract_income)
df_long[['min_income', 'max_income']] = pd.DataFrame(income_data.tolist(), index=df_long.index)

# rename "Tax Rate" to "rate"
df_long.rename(columns={'Tax Rate': 'rate'}, inplace=True)

# select relevant columns for the final dataframe
df_final = df_long[['rate', 'min_income', 'max_income','filing_status']].copy()


print("Some sample data:")
print(df_final.head())

print('\nSuccessfully processed data, start uploading to DB...')

# -----------------Insert Data into Database-----------------
# rebuild db to avoid excel change causing duplicate entries in db
supabase.table("federal_taxes").delete().neq("id", -1).execute()
print("Existing data in federal_taxes table cleared.")

# insert new data into db
federal_data = df_final.replace({np.nan: None}).to_dict(orient='records')
supabase.table("federal_taxes").insert(federal_data).execute()
print("New data inserted into federal_taxes table successfully.")