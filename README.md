# Cipher

Cipher is a privacy-first, offline tool to translate and summarize text locally on any device.

## Installation

### Prerequisites
- Install [Miniconda](https://docs.conda.io/en/latest/miniconda.html) for your platform (macOS, Windows, or Linux). This manages Python and dependencies.
- Install [Node.js](https://nodejs.org/en/download/) (v20.12.0 or later recommended).
- Ensure you have Git installed (https://docs.github.com/en/get-started/git-basics/set-up-git).

### Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pappricot/cipher.git
   cd cipher
   ```

2. **Set Up the Python Backend**:
   - Create and activate a Conda environment:
     ```bash
     conda create -n cipher python=3.11
     conda activate cipher
     ```
   - Install Python dependencies (press [y] yes on following questions):
     ```bash
     pip install -r requirements.txt
     ```
   - Download the required models (requires internet, ~1.5GB disk space):
     ```bash
     python -c "from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer; M2M100ForConditionalGeneration.from_pretrained('facebook/m2m100_418M').save_pretrained('./models/m2m100_418M'); M2M100Tokenizer.from_pretrained('facebook/m2m100_418M').save_pretrained('./models/m2m100_418M')"
     python -c "from transformers import T5ForConditionalGeneration, T5Tokenizer; T5ForConditionalGeneration.from_pretrained('t5-small').save_pretrained('./models/t5-small'); T5Tokenizer.from_pretrained('t5-small').save_pretrained('./models/t5-small')"
     ```

3. **Set Up the Frontend**:
   - Navigate to the frontend directory and install Node.js dependencies:
     ```bash
     cd frontend
     npm install
     cd ..
     ```

4. **Run the Application**:
   - Ensure the `run.sh` script is executable:
     ```bash
     chmod +x run.sh
     ```
   - Start both the backend and frontend:
     ```bash
     bash run.sh
     ```
   - On macOS/Linux, this starts the Flask backend (`server.py`) and the Node.js frontend.
   - On Windows, use `run.bat` instead:
     ```bash
     run.bat
     ```
   - Access the app in your browser at `http://localhost:3000` (backend runs on `http://localhost:5000` by default; if you changed the port to 5001, update `frontend/src/App.js` accordingly).

## Notes
- Requires Python 3.11 or higher (managed by Conda) and Node.js v20.12.0 or higher.
- If port 5000 is in use, change the port in `server.py` (e.g., to 5001) and update `frontend/src/App.js` and `test_server.py` to match.
- For advanced users, Docker support is planned for future updates.