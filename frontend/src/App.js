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
  const startTimeRef = useRef(null); // Track start time for progress
  const canvasRef = useRef(null); // Reference to the canvas element
  const utteranceRef = useRef(null); // Reference to the current utterance

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
    utteranceRef.current = null;
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
      if (progress === 0 || progress === 100) {
        // Start fresh if at the beginning or end
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(output);
        utterance.lang = "it";
        utterance.rate = 0.9;

        // Update progress based on character position
        utterance.onboundary = (event) => {
          const totalChars = output.length;
          const currentChar = event.charIndex || 0;
          const newProgress = totalChars > 0 ? (currentChar / totalChars) * 100 : 0;
          setProgress(newProgress);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setProgress(100);
        };

        utterance.onerror = (event) => {
          console.error("SpeechSynthesisUtterance error:", event.error);
          setIsPlaying(false);
          setProgress(0);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        startTimeRef.current = Date.now();
      } else {
        window.speechSynthesis.resume();
      }
      setIsPlaying(true);
    }
  };

  const handleProgressChange = (e) => {
    if (!output) return;

    const newProgress = Number(e.target.value);
    setProgress(newProgress);

    // Stop current speech and restart from the new position
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    const utterance = new SpeechSynthesisUtterance(output);
    utterance.lang = "it";
    utterance.rate = 0.9;

    // Update progress based on character position
    utterance.onboundary = (event) => {
      const totalChars = output.length;
      const currentChar = event.charIndex || 0;
      const newProgress = totalChars > 0 ? (currentChar / totalChars) * 100 : 0;
      setProgress(newProgress);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setProgress(100);
    };

    utterance.onerror = (event) => {
      console.error("SpeechSynthesisUtterance error:", event.error);
      setIsPlaying(false);
      setProgress(0);
    };

    utteranceRef.current = utterance;

    // Estimate the character index to start from based on progress
    const charIndex = Math.floor((newProgress / 100) * output.length);
    const partialText = output.substring(charIndex);
    utterance.text = partialText;

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    startTimeRef.current = Date.now();
  };

  const handleModeChange = (newMode) => {
    stopSpeaking();
    setMode(newMode);
    setOutput(""); // Clear output on mode change
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
            <p>{output.split("|||").join(" ")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;