import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [script, setScript] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState("translate");
  const [isLoading, setIsLoading] = useState(false);

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
  };

  const processText = async () => {
    stopSpeaking();
    const cacheKey = getCacheKey(script, mode);
    const cachedOutput = localStorage.getItem(cacheKey);
    
    if (cachedOutput) {
      setOutput(cachedOutput);
      speak(cachedOutput);
      return; // Skip request if cached
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
      localStorage.setItem(cacheKey, result); // Cache the result
      speak(result);
    } catch (error) {
      console.error("Error:", error);
      setOutput("Processing failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleModeChange = (newMode) => {
    stopSpeaking(); // Cancel speech on mode switch
    setMode(newMode);
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
            mode === "translate" ? "bg-blue-500 text-white" : "bg-gray-300"
          }`}
          onClick={() => handleModeChange("translate")}
          disabled={isLoading} // Disable while loading
        >
          Translate to Italian
        </button>
        <button
          className={`px-4 py-2 rounded ${
            mode === "summarize" ? "bg-blue-500 text-white" : "bg-gray-300"
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
      <div className="mt-4 p-2 bg-white border rounded">
        <p>{output || "Output will appear here..."}</p>
      </div>
    </div>
  );
}

export default App;