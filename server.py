from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer, T5ForConditionalGeneration, T5Tokenizer

app = Flask(__name__)
CORS(app)

# Load models
print("Loading models...")
trans_model = M2M100ForConditionalGeneration.from_pretrained("./models/m2m100_418M")
trans_tokenizer = M2M100Tokenizer.from_pretrained("./models/m2m100_418M")
summ_model = T5ForConditionalGeneration.from_pretrained("./models/t5-small")
summ_tokenizer = T5Tokenizer.from_pretrained("./models/t5-small")
print("Models loaded!")

@app.route("/process", methods=["POST"])
def process_text():
    try:
        data = request.json
        text = data["text"]
        mode = data["mode"]
        lang = data.get("lang", "it")  # Italian default
        print(f"Requested mode: {mode}, lang: {lang}")

        if mode == "translate":
            # English to Italian
            trans_tokenizer.src_lang = "en"
            trans_tokenizer.tgt_lang = lang
            inputs = trans_tokenizer(text, return_tensors="pt", padding=True)
            lang_id = trans_tokenizer.get_lang_id(lang)
            outputs = trans_model.generate(**inputs, forced_bos_token_id=lang_id)
            result = trans_tokenizer.decode(outputs[0], skip_special_tokens=True)
        else:  # summarize
            # Step 1: Summarize in English directly (input assumed English)
            inputs = summ_tokenizer(f"summarize: {text}", return_tensors="pt", max_length=512, truncation=True)
            outputs = summ_model.generate(**inputs, max_length=150)
            english_summary = summ_tokenizer.decode(outputs[0], skip_special_tokens=True)

            # Step 2: Translate summary to target language
            trans_tokenizer.src_lang = "en"
            trans_tokenizer.tgt_lang = lang
            inputs = trans_tokenizer(english_summary, return_tensors="pt", padding=True)
            lang_id = trans_tokenizer.get_lang_id(lang)
            outputs = trans_model.generate(**inputs, forced_bos_token_id=lang_id)
            result = trans_tokenizer.decode(outputs[0], skip_special_tokens=True)

        return jsonify({"result": result})
    except Exception as e:
        print(f"Processing failed with error: {str(e)}")
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)