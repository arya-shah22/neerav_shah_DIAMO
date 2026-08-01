import pandas as pd

nivoda_path = "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Nivoda Formate CSV.xlsx"
rapnet_path = "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Rapnet Formate CSV.csv"
vdb_path = "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/VDB Formate CSV.xlsx"

df_nivoda = pd.read_excel(nivoda_path, nrows=1)
df_rapnet = pd.read_csv(rapnet_path, nrows=1)
df_vdb = pd.read_excel(vdb_path, nrows=1)

niv_cols = [c.strip().lower() for c in df_nivoda.columns]
rap_cols = [c.strip().lower() for c in df_rapnet.columns]
vdb_cols = [c.strip().lower() for c in df_vdb.columns]

print("=== NIVODA vs RAPNET ===")
print("Nivoda columns not strictly matching Rapnet names:")
for c in df_nivoda.columns:
    if c.strip().lower() not in rap_cols:
        print(f"  - {c}")

print("\n=== VDB vs RAPNET ===")
print("VDB columns not strictly matching Rapnet names:")
for c in df_vdb.columns:
    if c.strip().lower() not in rap_cols:
        print(f"  - {c}")
