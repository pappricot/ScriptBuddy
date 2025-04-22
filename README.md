# Cipher

Cipher is a privacy-first, offline tool to translate and summarize text locally on any device.

## Installation

### Prerequisites
- Install [Miniconda](https://docs.conda.io/en/latest/miniconda.html) for your platform (macOS, Windows, or Linux). This manages Python and dependencies.
- Install [Node.js](https://nodejs.org/en/download/) (v20.12.0 or later recommended).
- Ensure you have Git installed.

### Steps
1. **Clone the Repository**:
   

2. **Set Up the Python Backend**:
   - Create and activate a Conda environment:
     
   - Install Python dependencies:
     
   - Download the required models (requires internet, ~1.5GB disk space):
     

3. **Set Up the Frontend**:
   - Navigate to the frontend directory and install Node.js dependencies:
     

4. **Run the Application**:
   - Ensure the  script is executable:
     
   - Start both the backend and frontend:
     
   - On macOS/Linux, this starts the Flask backend () and the Node.js frontend.
   - On Windows, use  instead:
     
   - Access the app in your browser at  (backend runs on  by default; if you changed the port to 5001, update  accordingly).

## Notes
- Requires Python 3.11 or higher (managed by Conda) and Node.js v20.12.0 or higher.
- If port 5000 is in use, change the port in  (e.g., to 5001) and update  and  to match.
- For advanced users, Docker support is planned for future updates.
