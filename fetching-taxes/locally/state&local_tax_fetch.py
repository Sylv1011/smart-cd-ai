from dotenv import load_dotenv
from supabase import create_client, Client
from pathlib import Path
import os, numpy as np, pandas as pd


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
state_taxes_path = os.path.join(base_dir, os.environ.get("STATE_TAXES_FILE_NAME"))
local_taxes_path = os.path.join(base_dir, os.environ.get("LOCAL_TAXES_FILE_NAME"))

# create supabase client
supabase: Client = create_client(url, key)



# -------------------Fetch data from excel files-----------------
# --------------------Fetch local taxes data-----------------
# read excel files into pandas dataframes
df_local = pd.read_excel(local_taxes_path)

# drop columns with all NaN values & reset idx
df_local.dropna(axis=0, how='all', inplace=True)
df_local.reset_index(drop=True, inplace=True)

# change column names to align with db
df_local.columns = ['state', 'county', 'city', 'tax_rate']


# --------------------Fetch state taxes data & processing data-----------------
# state in excel -> state abbreviation mapping
state_mapping = {
    "Ala.": "AL", "Alaska": "AK", "Ariz.": "AZ", "Ark.": "AR", "Calif.": "CA",
    "Colo.": "CO", "Conn.": "CT", "Del.": "DE", "Fla.": "FL", "Ga.": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Ill.": "IL", "Ind.": "IN", "Iowa": "IA",
    "Kans.": "KS", "Ky.": "KY", "La.": "LA", "Maine": "ME", "Mass.": "MA",
    "Mich.": "MI", "Minn.": "MN", "Miss.": "MS", "Mo.": "MO", "Mont.": "MT",
    "Nebr.": "NE", "Nev.": "NV", "N.H.": "NH", "N.J.": "NJ", "N.M.": "NM",
    "N.Y.": "NY", "N.C.": "NC", "N.D.": "ND", "Ohio": "OH", "Okla.": "OK",
    "Ore.": "OR", "Pa.": "PA", "R.I.": "RI", "S.C.": "SC", "S.D.": "SD",
    "Tenn.": "TN", "Tex.": "TX", "Utah": "UT", "Vt.": "VT", "Va.": "VA",
    "Wash.": "WA", "W.Va.": "WV", "Wis.": "WI", "Wyo.": "WY", "D.C.": "DC"
}

# read excel file into pandas dataframe
df_state = pd.read_excel(state_taxes_path, header = 1)


def validate_state(val):
    """
    validate if the value is a valid state name in the mapping, if valid return the state name,
    else return NaN
    """
    val_str = str(val).strip()
    # matching the state name directly
    if val_str in state_mapping:
        return val_str
    # check if the value starts with any of the keys in the mapping (to handle cases like "Ala. (AL)")
    for key in state_mapping.keys():
        if val_str.startswith(key):
            return key
    return np.nan

# fill in state names by filling down
df_state['State'] = df_state['State'].apply(validate_state)
df_state['State'] = df_state['State'].ffill()

# two copies of dfs
df_for_config = df_state.copy()
df_for_brackets = df_state.copy()


def to_num(val):
    """
    clean $, %, commas, and "credit"
    """
    if pd.isna(val) or str(val).lower() == 'n.a.':
        return 0
    clean_val = str(val).replace('$', '').replace('%', '').replace(',', '').replace('>', '').lower().replace('credit', '').strip()
    return pd.to_numeric(clean_val, errors='coerce')

def clean_config(df):
    """
    process data for states_tax_config table in db
    """
    # state abbreviation mapping
    df['state_id'] = df['State'].map(state_mapping)
    
    # get each state's first row to extract config info (std deduction, personal exemption, has_tax)
    config_df = df.groupby('State').first().reset_index()
    
    # process has_tax: if Rates column contains "none" (case-insensitive), then has_tax = False, else True
    config_df['has_tax'] = ~config_df['Rates'].astype(str).str.contains('none', case=False)
    
    # rename columns to align with db
    result = pd.DataFrame()
    result['state_id'] = config_df['state_id']
    result['has_tax'] = config_df['has_tax']
    result['std_ded_sgl'] = config_df['Single'].apply(to_num)
    result['std_ded_jnt'] = config_df['Couple'].apply(to_num)
    
    # check if the state has personal exemption credit: 
    # if "Single.1" column contains "credit", then is_exmpt_credit = True, else False
    result['is_exmpt_credit'] = config_df['Single.1'].astype(str).str.contains('credit', case=False)
    
    result['pers_exmpt_sgl'] = config_df['Single.1'].apply(to_num)
    result['pers_exmpt_jnt'] = config_df['Couple.1'].apply(to_num)
    result['dep_exmpt'] = config_df['Dependent'].apply(to_num)
    
    return result.dropna(subset=['state_id'])

def clean_brackets(df):
    """
    process data for tax_brackets table in db
    """
    brackets_list = []
    for _, row in df.iterrows():
        sid = state_mapping.get(row['State'])
        if not sid: continue
        
        rate_raw = str(row['Rates']).lower()
        rate_joint_raw = str(row['Rates_Joint']).lower()

        # process state without income tax: 
        # if "none" in Rates or Rates_Joint, 
        # we insert a record with 0 tax rate and 0 bracket threshold for both single and joint filing status
        if 'none' in rate_raw:
            brackets_list.append({
                'state_id': sid,
                'filing_status': 'single',
                'tax_rate': 0.0,
                'bracket_thrld': 0.0
            })
            brackets_list.append({
                'state_id': sid,
                'filing_status': 'joint',
                'tax_rate': 0.0,
                'bracket_thrld': 0.0
            })
            continue 

        # single filing status
        rate_val = to_num(row['Rates'])
        if rate_val > 0 or '>' in rate_raw:
            final_rate = rate_val / 100 if rate_val > 0.2 else rate_val
            brackets_list.append({
                'state_id': sid,
                'filing_status': 'single',
                'tax_rate': round(float(final_rate), 5),
                'bracket_thrld': to_num(row['Brackets'])
            })
        
        # joint filing status
        rate_j_val = to_num(row['Rates_Joint'])
        if rate_j_val > 0 or '>' in rate_joint_raw:
            final_rate_j = rate_j_val / 100 if rate_j_val > 0.2 else rate_j_val
            brackets_list.append({
                'state_id': sid,
                'filing_status': 'joint',
                'tax_rate': round(float(final_rate_j), 5),
                'bracket_thrld': to_num(row['Brackets_Joint'])
            })
            
    return pd.DataFrame(brackets_list)



# --------------Convert data to dict & Upser to DB-----------------
# convert to dict from df for local_taxes table in db
local_tax_data = df_local.replace({np.nan: None}).to_dict(orient='records')

# process data for states_tax_config and tax_brackets tables
config_df = clean_config(df_for_config)
# rename index for fetching brackets data
rename_map = {
    df_for_brackets.columns[1]: "Rates",
    df_for_brackets.columns[3]: "Brackets",
    df_for_brackets.columns[4]: "Rates_Joint",
    df_for_brackets.columns[6]: "Brackets_Joint"
}
df_for_brackets = df_for_brackets.rename(columns=rename_map)
brackets_df = clean_brackets(df_for_brackets) 


# convert to dict for states_tax_config and tax_brackets tables in db
config_data = config_df.replace({np.nan: None}).to_dict(orient='records')
brackets_data = brackets_df.replace({np.nan: None}).to_dict(orient='records')


print("Some sample data:")
print("Local taxes data:")
print(df_local.head())
print("\nState tax config data:")
print(config_df.head())
print("\nState tax brackets data:")
print(brackets_df.head())

print('\nSuccessfully processed data, start uploading to DB...\n')
"""
# -----------------Insert Data into Database-----------------
# rebuild db to avoid excel change causing duplicate entries in db
supabase.table("tax_brackets").delete().neq("state_id", "NONE").execute()
supabase.table("local_taxes").delete().neq("state", "NONE").execute()
supabase.table("states_tax_config").delete().neq("state_id", "NONE").execute()
print('Finished rebuilding tables, start upserting data...\n')

# insert data into db
supabase.table("local_taxes").insert(local_tax_data).execute()
supabase.table("states_tax_config").insert(config_data).execute()
supabase.table("tax_brackets").insert(brackets_data).execute()
print('Finished upserting data to Database.')
"""