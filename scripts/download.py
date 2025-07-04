import requests
import json

_url = "http://localhost:4000/txns"


def download():
  limit = 1000
  nextId = 0
  txns = []
  prevTxnId = None
  iter = 1
  while True:
    params = {
        "limit": limit,
        "startId": nextId,
    }
    print("#{}: Requesting txns startId={}, limit={}".format(
        iter, nextId, limit))
    resp = requests.get(_url, params=params)
    jsonResp = resp.json()
    nextId = jsonResp.get("nextId")
    respTxns = jsonResp.get("txns")
    if respTxns is None or len(respTxns) == 0:
      print("#{}: Received 0 txns.".format(iter))
      break
    print("#{}: Received {} txns.".format(iter, len(respTxns)))
    iter += 1
    for t in respTxns:
      tid = int(t["id"])
      if prevTxnId and tid <= prevTxnId:
        raise RuntimeError(
            "resp was not sorted in acsending order of txns id needed to properly paginate over all txns, got prev id {}, cur id {}"
            .format(prevTxnId, tid))
      prevTxnId = tid
      txns.append(t)
  outfile = "data/all.json"
  with open(outfile, "w") as ofp:
    json.dump(txns, ofp)
  print("Wrote {}.".format(outfile))


if __name__ == "__main__":
  download()
