import requests

url = "http://localhost:5000/process"
payload = {"text": "The hero saves the city.", "mode": "translate", "lang": "it"}
response = requests.post(url, json=payload)
print("Translation:", response.json()["result"])