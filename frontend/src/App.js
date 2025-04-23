import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { initGridAnimation } from "./GridAnimation";

function App() {
  const [script, setScript] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState("translate");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100%
  const utteranceRef = useRef(null); // Store SpeechSynthesisUtterance
  const startTimeRef = useRef(null); // Track start time for progress
  const canvasRef = useRef(null); // Reference to the canvas element

  // Load cached output from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem(getCacheKey(script, mode));
    if (cached) {
      setOutput(cached);
    }
  }, [script, mode]); // Recheck cache when script or mode changes

  // Initialize the grid animation when the component mounts
  useEffect(() => {
    if (canvasRef.current) {
      const cleanup = initGridAnimation(canvasRef.current);
      return cleanup; // Cleanup on unmount
    }
  }, []);

  const getCacheKey = (text, mode) => `${mode}_${text}`; // Unique key for each combo

  const stopSpeaking = () => {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    setIsPlaying(false);
    setProgress(0);
  };

  const processText = async () => {
    stopSpeaking();
    const cacheKey = getCacheKey(script, mode);
    const cachedOutput = localStorage.getItem(cacheKey);
    
    if (cachedOutput) {
      setOutput(cachedOutput);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/process",
        { text: script, mode, lang: "it" },
        { headers: { "Content-Type": "application/json" } }
      );
      const result = response.data.result;
      setOutput(result);
      localStorage.setItem(cacheKey, result);
    } catch (error) {
      console.error("Error details:", error.message);
      console.error("Error response:", error.response ? error.response.data : "No response");
      setOutput(`Processing failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!output) return;

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (!utteranceRef.current) {
        // New utterance if none exists
        const utterance = new SpeechSynthesisUtterance(output);
        utterance.lang = "it";
        utterance.rate = 0.9;
        utterance.onboundary = (event) => {
          // Update progress based on char position (approximation)
          const totalChars = output.length;
          const currentChar = event.charIndex || 0;
          const newProgress = totalChars > 0 ? (currentChar / totalChars) * 100 : 0;
          setProgress(newProgress);
        };
        utterance.onend = () => {
          setIsPlaying(false);
          setProgress(100);
          startTimeRef.current = null;
        };
        utteranceRef.current = utterance;
      }

      window.speechSynthesis.resume(); // Resume if paused
      if (progress === 0 || progress === 100) {
        window.speechSynthesis.cancel(); // Reset if at start/end
        window.speechSynthesis.speak(utteranceRef.current);
        startTimeRef.current = Date.now(); // Track start time
      }
      setIsPlaying(true);
    }
  };

  const handleProgressChange = (e) => {
    if (!utteranceRef.current || !output) return;

    const newProgress = Number(e.target.value);
    setProgress(newProgress);

    // Stop current speech
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    // Restart at new position (approximate with char index)
    const totalChars = output.length;
    const charIndex = Math.floor((newProgress / 100) * totalChars);
    const newUtterance = new SpeechSynthesisUtterance(output.slice(charIndex));
    newUtterance.lang = "it";
    newUtterance.rate = 0.9;
    newUtterance.onboundary = (event) => {
      const currentChar = charIndex + (event.charIndex || 0);
      const updatedProgress = totalChars > 0 ? (currentChar / totalChars) * 100 : 0;
      setProgress(updatedProgress);
    };
    newUtterance.onend = () => {
      setIsPlaying(false);
      setProgress(100);
      startTimeRef.current = null;
    };
    utteranceRef.current = newUtterance;

    // Auto-play from new position
    window.speechSynthesis.speak(newUtterance);
    setIsPlaying(true);
    startTimeRef.current = Date.now();
  };

  const handleModeChange = (newMode) => {
    stopSpeaking();
    setMode(newMode);
    setOutput(""); // Clear output on mode change
    utteranceRef.current = null; // Reset utterance on mode change
  };

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen">
      <canvas ref={canvasRef} className="gridCanvas" />
      <h1 className="text-2xl font-bold mb-4">Cipher</h1>
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows="6"
        placeholder="Enter your text here..."
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />
      <div className="flex space-x-4 mb-4">
        <button
          className={`px-4 py-2 ${
            mode === "translate" ? "active" : "inactive"
          } text-white`}
          onClick={() => handleModeChange("translate")}
          disabled={isLoading}
        >
          Translate to Italian
        </button>
        <button
          className={`px-4 py-2 ${
            mode === "summarize" ? "active" : "inactive"
          } text-white`}
          onClick={() => handleModeChange("summarize")}
          disabled={isLoading}
        >
          Summarize in Italian
        </button>
      </div>
      <button
        className={`processing-button w-full py-2 ${
          isLoading ? "disabled cursor-not-allowed" : "processing"
        }`}
        onClick={processText}
        disabled={isLoading || !script.trim()}
      >
        {isLoading ? "Processing..." : "Process & Read"}
      </button>
      <div className="mt-4">
        {isLoading && (
          <div className="loading-container">
            <div className="loader"></div>
          </div>
        )}
        {output && (
          <div className="output-container">
            <div className="flex play-pause-button">
              <button
                className={` ${
                  isPlaying ? "pause play-pause-button" : "play play-pause-button"
                }`}
                onClick={togglePlayPause}
                disabled={!output}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleProgressChange}
                className="w-full custom-range"
                disabled={!output}
              />
            </div>
            <p>{output}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;