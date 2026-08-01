import pandas as pd

files = {
    "Nivoda": "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Nivoda Formate CSV.xlsx",
    "Rapnet": "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/Rapnet Formate CSV.csv",
    "VDB": "/Users/aryashah/Documents/Code/Software/Neerav_Shah_DIAMO/CSV Formate/VDB Formate CSV.xlsx"
}

for name, path in files.items():
    try:
        if path.endswith(".csv"):
            df = pd.read_csv(path, nrows=2)
        else:
            df = pd.read_excel(path, nrows=2)
        print(f"=== {name} Format ===")
        print(f"Total Columns: {len(df.columns)}")
        print("Columns:")
        for idx, col in enumerate(df.columns, 1):
            print(f"  {idx}. {col}")
        print("\n")
    except Exception as e:
        print(f"Error reading {name}: {e}\n")
