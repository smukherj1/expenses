import json
import random
from ollama import chat
from ollama import ChatResponse

_model = "gemma3:4b"
#_model = "qwen3:8b"
_source_to_desc = {
    "RBC_CHEQUING": "Checking account at Royal Bank of Canada",
    "RBC_MASTERCARD": "Credit Card",
    "CIBC_VISA": "Credit Card",
    "AMEX_COBALT": "Credit Card",
}


def _cannonicalize_tag(predicted: str | None, tags: list[str]) -> tuple[str, bool]:
  if predicted is None:
    return "unknown", False
  if predicted in tags:
    return predicted, True
  prompt = f"""
Which of the following words is {predicted} most similar to?
{", ".join(tags)}

Only respond with the single that is most similar and nothing else.
"""
  response: ChatResponse = chat(
    model=_model,
    stream=False,
    think=False,
    messages=[{
        'role': 'user',
        'content': prompt,
    }])
  predicted = response.message.content
  print("Tag cannolicalization prompt: {}\nPredicted: {}".format(prompt, predicted))
  if predicted in tags:
    return predicted, False
  return "unknown", False


def categorize(txn, tags: list[str]) -> tuple[str, bool]:
  a = float(txn["amount"])
  a = f"CREDIT {abs(a)}" if a >= 0 else f"DEBIT {abs(a)}"
  prompt = f"""
Classifying the following financial transaction into
into one of the following categories:
{", ".join(tags)}

Details about the transaction:
- Date: {txn["date"]}
- Description: {txn["description"]}
- Amount: {a}
- Account: {_source_to_desc[txn["source"]]}

Your answer should just be the tag you've categorized it as and nothing else.
"""
  response: ChatResponse = chat(
    model=_model,
    stream=False,
    think=False,
    messages=[
        {
            'role': 'user',
            'content': prompt,
        },
    ])
  predicted = response.message.content
  print("Classification prompt: {}\nPrediction: {}".format(prompt, predicted))
  if predicted is None:
    return "unknown", False
  return _cannonicalize_tag(predicted=predicted, tags=tags)


def unique_tags(txns):
  tags = set([t for txn in txns for t in txn["tags"]])
  return list(tags)


if __name__ == "__main__":
  txns = json.load(open("data/all.json"))
  tags = unique_tags(txns)
  random.seed(0)
  sample_txns = random.sample(txns, 100)
  correct = 0
  oneshots = 0
  for t in sample_txns:
    predicted, oneshot = categorize(t, tags)
    if oneshot:
      oneshots += 1
    actual = t["tags"][0]
    print(f"{t["date"]} {t["description"]} {t["amount"]} {t["source"]}, predicted {predicted}, actual {actual}")
    if predicted == actual:
      correct += 1
  print(f"Accuracy {round(correct * 100.0 / len(sample_txns), 1)}, Correct: {correct} out of {len(sample_txns)}, One shots: {oneshots}")
