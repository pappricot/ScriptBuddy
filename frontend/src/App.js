import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [script, setScript] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState("translate");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100%
  const utteranceRef = useRef(null); // Store SpeechSynthesisUtterance
  const startTimeRef = useRef(null); // Track start time for progress

  // Load cached output from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem(getCacheKey(script, mode));
    if (cached) {
      setOutput(cached);
    }
  }, [script, mode]); // Recheck cache when script or mode changes

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
        "http://192.168.1.72:5000/process",
        { text: script, mode, lang: "it" },
        { headers: { "Content-Type": "application/json" } }
      );
      const result = response.data.result;
      setOutput(result);
      localStorage.setItem(cacheKey, result);
    } catch (error) {
      console.error("Error:", error);
      setOutput("Processing failed.");
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
    utteranceRef.current = null; // Reset utterance on mode change
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Script Script</h1>
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows="6"
        placeholder="Paste script here..."
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />
      <div className="flex space-x-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            mode === "translate" ? "bg-blue-500" : "bg-gray-300"
          }`}
          onClick={() => handleModeChange("translate")}
          disabled={isLoading} // Disable while loading
        >
          Translate to Italian
        </button>
        <button
          className={`px-4 py-2 rounded ${
            mode === "summarize" ? "bg-blue-500" : "bg-gray-300"
          }`}
          onClick={() => handleModeChange("summarize")}
          disabled={isLoading} // Disable while loading
        >
          Summarize in Italian
        </button>
      </div>
      <button
        className={`w-full py-2 rounded text-white ${
          isLoading ? "bg-green-300 cursor-not-allowed" : "bg-green-500"
        }`}
        onClick={processText}
        disabled={isLoading || !script.trim()} // Disable if loading or no input
      >
        {isLoading ? "Loading..." : "Process & Read"}
      </button>
      {output && (
        <div className="mt-4">
          <div className="flex items-center space-x-2 mb-2">
            <button
              className={`px-4 py-2 rounded text-white ${
                isPlaying ? "bg-red-500" : "bg-blue-500"
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
          <div className="p-2 bg-white border rounded">
            <p>{output}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;