import pandas as pd
import requests
import json

_upload_url = "http://localhost:4000/txns"
_ollama_url = "http://localhost:11434/api/embed"


def embedding(text: str) -> str:
  resp = requests.post(_ollama_url,
                       json={
                           "model": "nomic-embed-text",
                           "input": text,
                       })
  return json.dumps(json.loads(resp.text).get("embeddings")[0])


def rbc_chequing():
  df = pd.read_csv("data/rbc_chequing.csv")
  for date, desc, amount in zip(df["Date"], df["Description"], df["Amount"]):
    if abs(amount) < 0.01:
      continue
    resp = requests.post(_upload_url,
                         json={
                             "date": date,
                             "description": desc,
                             "amount": str(amount),
                             "source": "RBC_CHEQUING",
                             "desc_embedding": embedding(desc),
                         })
    if not resp.ok:
      raise RuntimeError("Error uploading Txn: {}, {}, {} -> {}, {}".format(
          date, desc, amount, resp, resp.text))
    print("Txn: {}, {}, {} -> {}".format(date, desc, amount, resp.text))


def rbc_mastercard():
  df = pd.read_csv("data/rbc_mastercard.csv")
  for date, desc, amount in zip(df["Transaction Date"], df["Description"],
                                df["Amount"]):
    resp = requests.post(_upload_url,
                         json={
                             "date": date,
                             "description": desc,
                             "amount": str(amount),
                             "source": "RBC_MASTERCARD",
                             "desc_embedding": embedding(desc),
                         })
    if not resp.ok:
      raise RuntimeError("Error uploading Txn: {}, {}, {} -> {}, {}".format(
          date, desc, amount, resp, resp.text))
    print("Txn: {}, {}, {} -> {}".format(date, desc, amount, resp.text))
  return


if __name__ == "__main__":
  rbc_chequing()
  rbc_mastercard()
