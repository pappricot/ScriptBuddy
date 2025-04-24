from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer, T5ForConditionalGeneration, T5Tokenizer
import nltk
import re
import json

nltk.download('punkt')  # Sentence tokenizer
nltk.download('punkt_tab')  # Tabular data for Punkt tokenizer
from nltk.tokenize import sent_tokenize

app = Flask(__name__)
CORS(app)

# Load models
print("Loading models...")
trans_model = M2M100ForConditionalGeneration.from_pretrained("./models/m2m100_418M")
trans_tokenizer = M2M100Tokenizer.from_pretrained("./models/m2m100_418M")
summ_model = T5ForConditionalGeneration.from_pretrained("./models/t5-small")
summ_tokenizer = T5Tokenizer.from_pretrained("./models/t5-small")
print("Models loaded!")

# Load idioms dictionary
with open("idioms.json", "r") as f:
    idioms_dict = json.load(f)

def apply_idioms(text):
    """Replace idioms and poetic expressions with their Italian translations."""
    modified_text = text
    for phrase, translation in idioms_dict.items():
        # Case-insensitive replacement
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)
        modified_text = pattern.sub(translation, modified_text)
    return modified_text

def parse_formatting(text):
    """Parse the input text for screenplay formatting (all caps, italics, line breaks)."""
    lines = text.split("\n")
    formatted_lines = []
    for line in lines:
        if not line.strip():
            formatted_lines.append({"text": "", "style": "normal", "align": "left"})
            continue
        # Detect all-caps lines (e.g., character names, scene headings)
        if line.strip().isupper():
            if line.strip().startswith(("INT.", "EXT.", "INSERT TITLE:", "OVERTURE")):
                formatted_lines.append({"text": line.strip(), "style": "allcaps", "align": "left"})
            else:
                formatted_lines.append({"text": line.strip(), "style": "allcaps", "align": "center"})
        # Detect italicized text (wrapped in *text*)
        elif line.strip().startswith("*") and line.strip().endswith("*"):
            formatted_lines.append({"text": line.strip()[1:-1], "style": "italic", "align": "left"})
        # Detect dialogue or other text
        else:
            formatted_lines.append({"text": line.strip(), "style": "normal", "align": "left"})
    return formatted_lines

def apply_formatting(translated_lines, original_formats):
    """Apply the original formatting to the translated lines."""
    if len(translated_lines) != len(original_formats):
        return [{"text": sent, "style": "normal", "align": "left"} for sent in translated_lines]
    
    formatted_output = []
    for translated, original in zip(translated_lines, original_formats):
        formatted_output.append({
            "text": translated,
            "style": original["style"],
            "align": original["align"]
        })
    return formatted_output

@app.route("/process", methods=["POST"])
def process_text():
    try:
        data = request.json
        text = data["text"]
        mode = data["mode"]
        lang = data.get("lang", "it")  # Italian default
        print(f"Requested mode: {mode}, lang: {lang}")

        # Parse the input text for formatting
        formatted_lines = parse_formatting(text)

        # Calculate word count and token count
        word_count = len(text.split())
        tokens = trans_tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        token_count = tokens.input_ids.shape[1]

        # Estimate processing time (assume 75 tokens/sec for translation, 100 tokens/sec for summarization)
        est_seconds = token_count / 75 if mode == "translate" else token_count / 100
        est_minutes = est_seconds / 60

        # Translate or summarize each line while preserving formatting
        translated_lines = []
        for line in formatted_lines:
            if not line["text"]:  # Preserve empty lines
                translated_lines.append("")
                continue
            # Apply idioms before translation
            modified_text = apply_idioms(line["text"])
            if mode == "translate":
                trans_tokenizer.src_lang = "en"
                trans_tokenizer.tgt_lang = lang
                inputs = trans_tokenizer(modified_text, return_tensors="pt", padding=True, truncation=True, max_length=512)
                lang_id = trans_tokenizer.get_lang_id(lang)
                outputs = trans_model.generate(**inputs, forced_bos_token_id=lang_id)
                translated = trans_tokenizer.decode(outputs[0], skip_special_tokens=True)
                translated_lines.append(translated)
            else:  # summarize
                # Summarize the entire text first, then translate
                modified_text = apply_idioms(text)
                inputs = summ_tokenizer(f"summarize: {modified_text}", return_tensors="pt", max_length=512, truncation=True)
                outputs = summ_model.generate(**inputs, max_length=150)
                english_summary = summ_tokenizer.decode(outputs[0], skip_special_tokens=True)
                trans_tokenizer.src_lang = "en"
                trans_tokenizer.tgt_lang = lang
                inputs = trans_tokenizer(english_summary, return_tensors="pt", padding=True, truncation=True, max_length=512)
                lang_id = trans_tokenizer.get_lang_id(lang)
                outputs = trans_model.generate(**inputs, forced_bos_token_id=lang_id)
                translated = trans_tokenizer.decode(outputs[0], skip_special_tokens=True)
                translated_lines.append(translated)
                break  # Summarization results in one line

        # Apply the original formatting to the translated lines
        formatted_output = apply_formatting(translated_lines, formatted_lines)

        # Join non-empty lines with a delimiter for audio playback
        audio_text = "|||".join(sent["text"] for sent in formatted_output if sent["text"])

        response = jsonify({
            "result": formatted_output,
            "audio_text": audio_text,
            "word_count": word_count,
            "token_count": token_count,
            "est_seconds": round(est_seconds, 2),
            "est_minutes": round(est_minutes, 2)
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    except Exception as e:
        print(f"Processing failed with error: {str(e)}")
        response = jsonify({"error": f"Processing failed: {str(e)}"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)