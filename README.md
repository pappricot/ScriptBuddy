
# Cipher - Offline Text Translation & Summarization Tool

Helper tool for translating and summarizing texts OFFLINE! <br />
Cipher is a privacy-first, offline tool to translate and summarize text locally on any device. <br />

## Getting Started
Follow these steps to run Cipher on your device.

### Prerequisites

Git (Install Git) <br />
Python 3.11+ (Install Python)

### Installation

Clone this repository to your local machine: <br />
> git clone https://github.com/anya-p-nguyen/cipher.git <br />
> cd cipher


Install DependenciesInstall the required Python packages: <br />
> pip install -r requirements.txt


Download Language ModelsRun the setup script to download necessary models (requires internet for first-time setup): <br />
> python setup_models.py

Models are stored locally after download and used offline thereafter. <br />

Run CipherStart the application: <br />
> python main.py



### Notes

Ensure you have write permissions in the project directory for model downloads. <br />
If you encounter issues, check the console output or contact the developer via the landing page. <br />

## Optional: Run with Docker (Advanced)
_For a containerized environment, use Docker:_

### Prerequisites

Docker installed (Install Docker) <br />


Build the Docker Image <br />
> docker build -t cipher:latest .


Run the Container <br />
> docker run -p 8000:8000 cipher:latest


Access Cipher <br />

Open http://localhost:8000 if it has a web interface, or check the terminal for CLI output. <br />



## Contributing <br />
Contributions are welcome! Please fork the repository and submit a pull request. <br />
## Contact <br />
For support, visit the Contact Me at _https://cipher-landing.netlify.app/#contact-me_.
