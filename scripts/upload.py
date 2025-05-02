import pandas as pd
import requests

if __name__ == "__main__":
  df = pd.read_csv("data/rbc_chequing.csv")
  for date, desc, amount in zip(df["Date"], df["Description"], df["Amount"]):
    if abs(amount) < 0.01:
      continue
    resp = requests.post("http://localhost:3000/txns",
                         json={
                             "date": date,
                             "description": desc,
                             "amount": str(amount),
                         })
    print("Txn: {}, {}, {} -> {}".format(date, desc, amount, resp.text))
