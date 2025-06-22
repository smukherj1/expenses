import pandas as pd
import requests
import json
from datetime import datetime

_upload_url = "http://localhost:4000/txns"
_ollama_url = "http://localhost:11434/api/embed"


def _embedding(text: str) -> str:
  resp = requests.post(_ollama_url,
                       json={
                           "model": "nomic-embed-text",
                           "input": text,
                       })
  return json.dumps(json.loads(resp.text).get("embeddings")[0])


def _upload_df(df: pd.DataFrame, source: str):
  df = df.sort_values(by='Date', ascending=True)
  for date, desc, amount in zip(df["Date"], df["Description"], df["Amount"]):
    resp = requests.post(_upload_url,
                         json={
                             "date": date,
                             "description": desc,
                             "amount": str(amount),
                             "source": source,
                             "desc_embedding": _embedding(desc),
                         })
    if not resp.ok:
      raise RuntimeError(
          "Error uploading Txn: {}, {}, {}, {} -> {}, {}".format(
              date, desc, amount, source, resp, resp.text))
    print("Txn: {}, {}, {}, {} -> {}".format(date, desc, amount, source,
                                             resp.text))
  return


def rbc_chequing():
  df = pd.read_csv("data/rbc_chequing.csv")
  df = df[abs(df["Amount"]) >= 0.01].copy()
  _upload_df(df, "RBC_CHEQUING")


def rbc_mastercard():
  df = pd.read_csv("data/rbc_mastercard.csv")
  df["Date"] = df["Transaction Date"]
  _upload_df(df, "RBC_MASTERCARD")


def _cibc_amount_to_cents(amount: float) -> int:
  if pd.isna(amount):
    return 0
  return int(amount * 100)


def cibc():
  df = pd.read_csv("data/cibc.csv")
  df["Date"] = pd.to_datetime(df["Date"], format="%Y-%m-%d",
                              errors='raise').dt.strftime("%Y/%m/%d")
  debit_cents = df["Debit"].apply(_cibc_amount_to_cents)
  credit_cents = df["Credit"].apply(_cibc_amount_to_cents)
  df["Amount"] = -1 * debit_cents + credit_cents
  _upload_df(df, "CIBC_VISA")


def _amex_transform_date(date: str) -> str:
  if "May" in date and not "May." in date:
    date = date.replace("May", "May.")
  return datetime.strptime(date, "%d %b. %Y").strftime("%Y/%m/%d")


def _amex_transform_amount(amount: str) -> int:
  amount = amount.replace("$", "").replace(",", "")
  dollars, cents = amount.split(".")
  pos, dollars, cents = not dollars.startswith("-"), abs(
      int(dollars)), int(cents)
  amount_cents = dollars * 100 + cents if pos else -(dollars * 100 + cents)
  return amount_cents


def amex():
  df = pd.read_excel("data/amex.xls")
  df["Date"] = df["Date"].apply(_amex_transform_date)
  df["Amount"] = df["Amount"].apply(_amex_transform_amount)
  _upload_df(df, "AMEX_COBALT")


if __name__ == "__main__":
  # rbc_chequing()
  # rbc_mastercard()
  cibc()
  amex()
