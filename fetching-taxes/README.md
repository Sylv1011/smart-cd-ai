# Tax Fetcher

## Summary
`fetching-taxes` is a tool for extracting and storing tax data. It consists of two main modules:

* **`locally`**: Requires you to manually download Excel files into the folder before running scripts to extract and store data.
* **`auto-fetcher`**: Automatically crawls the Tax Foundation website to find Excel links, downloads the data, and inserts it into the database.

### Data Sources
Federal and state tax data are sourced from the [Tax Foundation](https://taxfoundation.org/). Specifically:
* [Federal Tax Rates, 2026](https://taxfoundation.org/data/all/federal/2026-tax-brackets/)
* [State Tax Rates, 2026](https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/)

> **Note on Local Taxes:** Because local tax rates in the U.S. are extremely numerous, this tool only stores data for specific cities or counties. You must manually provide the local tax Excel file in the appropriate folder and specify the file name in your `.env` file. Please don't change current overall format of the local tax Excel file, which is `local_taxes.xlsx`, because the Python script strictly follows current format to extract data. However, you can add new rows, change the name in a cell (not a column), or change the number in a cell. Anything, like changing the column names or adding a new column, may cause the code execution to fail. 


## Database Schema

The data is stored in **Supabase** across four primary tables.

### 1. `federal_taxes`
Stores federal income tax brackets and rates.
* **Columns**: `id`, `rate`, `min_income`, `max_income`, `filing_status`

### 2. `states_tax_config`
Stores the high-level tax rules and standard deductions for each state. This table must be used in conjunction with `tax_brackets`.
* **Columns**: 
    * `state_id`: Unique identifier (e.g., AL, CA).
    * `has_tax`: Boolean indicating if the state has income tax.
    * `std_ded_sgl` / `std_ded_jnt`: Standard deductions for single and joint filers.
    * `is_exmpt_credit`: Boolean; indicates if the state uses an exemption credit system.
    * `pers_exmpt_sgl` / `pers_exmpt_jnt`: Personal exemptions.
    * `dep_exmpt`: Exemption amount per dependent.

### 3. `tax_brackets`
Contains specific tax rates per bracket. It connects to `states_tax_config` via a **Foreign Key** on `state_id`.
* **Columns**: `id`, `state_id`, `filing_status`, `tax_rate`, `bracket_thrld` (The income threshold for the rate).

### 4. `local_taxes`
Stores tax data for specific U.S. cities or counties.
* **Columns**: `id`, `state`, `county`, `city`, `tax_rate`

## Implementation

1.  **Environment Setup**: Before running either module, create a `.env` file and add the following variables:
    * `SUPABASE_URL`
    * `SUPABASE_KEY`
    * `LOCAL_TAXES_FILE_NAME`

2.  **Using `locally`**: You must manually download the Federal and State tax Excel files from the Tax Foundation and place them inside the `locally` folder. Also, don't forget to include the **local** tax Excel file in this folder.

3.  **Using `auto-fetcher`**: You only need to manually upload the **local** tax rate Excel file to the `auto-fetcher` folder; the Federal and State files will be retrieved automatically by the crawler.

4.  **Details**: For more specific details, please refer to the individual sections below.

## Processed Data Samples
**Federal tax data:**
```
   rate  min_income  max_income filing_status
0  0.10           0     12400.0        single
1  0.12       12401     50400.0        single
2  0.22       50401    105700.0        single
3  0.24      105701    201775.0        single
4  0.32      201776    256225.0        single
```
**Local taxes data:**
```
  state   county city  tax_rate
0    IN    union  NaN      2.75
1    IN    grant  NaN      2.75
2    IN  carroll  NaN      2.47
3    IN   howard  NaN      2.35
4    IN   greene  NaN      2.35
```
**State tax config data:**
```
  state_id  has_tax  std_ded_sgl  std_ded_jnt  is_exmpt_credit  pers_exmpt_sgl  pers_exmpt_jnt  dep_exmpt
0       AL     True       3000.0       8500.0            False          1500.0          3000.0     1000.0
1       AK    False          0.0          0.0            False             0.0             0.0        0.0
2       AZ     True       8350.0      16700.0            False             0.0             0.0      100.0
3       AR     True       2470.0       4940.0             True            29.0            58.0       29.0
4       CA     True       5540.0      11080.0             True           153.0           306.0      153.0
```
**State tax brackets data:**
```
  state_id filing_status  tax_rate  bracket_thrld
0       AL        single      0.02            0.0
1       AL         joint      0.02            0.0
2       AL        single      0.04          500.0
3       AL         joint      0.04         1000.0
4       AL        single      0.05         3000.0
```

## Locally
### Overview
The `locally` folder contains scripts designed to process local Excel files and store the extracted data into your Supabase database.

### Setup
Once your environment variables and Excel files are ready, run the following Python scripts:
* `federal_tax_fetcher.py`: Extracts and stores Federal tax data.
* `state&local_tax_fetch.py`: Extracts and stores State and Local tax data.

## Auto-fetcher
### Overview
The `auto-fetcher` folder contains scripts designed to automatically get the excel files by web crawling and store the extracted data into your Supabase database.
### Setup
Once your environment variables and Excel files are ready, run the following Python script:
* `main.py`: call all needed functions from other Python scripts to complete scraping websites, processing data, and storing to the database.
