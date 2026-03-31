import pandas as pd
import os, numpy as np, pandas as pd, re


def get_federal_taxes(df_federal):
    """
    extract federal tax data from raw data that was scraped from website
    """
    # remove space and newline in column names
    df_federal.columns = df_federal.columns.str.strip().str.replace('\n', ' ')

    # convetrt from wide to long format
    df_long = df_federal.melt(
        id_vars=['Tax Rate'], 
        var_name='raw_status', 
        value_name='income_range'
    )

    # apply mapping function to create new column 'filing_status'
    df_long['filing_status'] = df_long['raw_status'].apply(map_status)
    
    # parse income range to get lower and upper bounds
    income_data = df_long['income_range'].apply(extract_income)
    df_long[['min_income', 'max_income']] = pd.DataFrame(income_data.tolist(), index=df_long.index)

    # rename "Tax Rate" to "rate"
    df_long.rename(columns={'Tax Rate': 'rate'}, inplace=True)

    # convert percent string to decimal
    df_long['rate'] = (
        df_long['rate']
        .astype(str)
        .str.replace('%', '')
        .astype(float) / 100
    )

    # select relevant columns for the final dataframe
    df_final = df_long[['rate', 'min_income', 'max_income','filing_status']].copy()


    print("Some sample data for federal taxes:")
    print(df_final.head())
    return df_final


def get_state_taxes(df_state):
    """
    extract state tax data from raw data that was scraped from website
    """
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

    # fill in state names by filling down
    df_state['State'] = df_state['State'].apply(validate_state, args=(state_mapping,))
    df_state['State'] = df_state['State'].ffill()

    # two copies of dfs
    df_for_config = df_state.copy()
    df_for_brackets = df_state.copy()

    # process data for states_tax_config and tax_brackets tables
    config_df = clean_config(df_for_config, state_mapping)
    # rename index for fetching brackets data
    rename_map = {
        df_for_brackets.columns[1]: "Rates",
        df_for_brackets.columns[3]: "Brackets",
        df_for_brackets.columns[4]: "Rates_Joint",
        df_for_brackets.columns[6]: "Brackets_Joint"
    }
    df_for_brackets = df_for_brackets.rename(columns=rename_map)
    brackets_df = clean_brackets(df_for_brackets, state_mapping) 

    print("\nSome sample data for state taxes:")
    print("Config data:")
    print(config_df.head())
    print("Brackets data:")
    print(brackets_df.head())
    return config_df, brackets_df


def get_local_taxes(path):
    """
    read local tax data from excel file
    """
    # read data from excel file
    df_local = pd.read_excel(path)

    # drop columns with all NaN values & reset idx
    df_local = df_local.dropna(how='all', axis=1).reset_index(drop=True)
    
    # change column names to align with db
    df_local.columns = ['state', 'county', 'city', 'tax_rate']

    print("\nSome sample data for local taxes:")
    print(df_local.head())
    
    return df_local


# --- helper functions for data cleaning and transformation ---
def map_status(name):
    """
    Map raw filing status to standardized filing status.
    """
    name = str(name).lower()
    if 'single' in name: return 'single'
    if 'married' in name: return 'married'
    if 'head' in name or 'household' in name: return 'head_household'
    return 'unknown'

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


def validate_state(val, state_mapping):
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


def to_num(val):
    """
    clean $, %, commas, and "credit"
    """
    if pd.isna(val) or str(val).lower() == 'n.a.':
        return 0
    clean_val = str(val).replace('$', '').replace('%', '').replace(',', '').replace('>', '').lower().replace('credit', '').strip()
    return pd.to_numeric(clean_val, errors='coerce')

def clean_config(df, state_mapping):
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


def clean_brackets(df, state_mapping):
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