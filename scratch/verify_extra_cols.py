import pandas as pd

nivoda_path = "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Nivoda Formate CSV.xlsx"
rapnet_path = "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Rapnet Formate CSV.csv"
vdb_path = "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/VDB Formate CSV.xlsx"

df_niv = pd.read_excel(nivoda_path, nrows=1)
df_rap = pd.read_csv(rapnet_path, nrows=1)
df_vdb = pd.read_excel(vdb_path, nrows=1)

rap_cols = set(c.strip().lower() for c in df_rap.columns)

print("Rapnet has 'treatment':", 'treatment' in rap_cols)
print("Rapnet has 'laser inscription':", 'laser inscription' in rap_cols)
