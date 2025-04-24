import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { initGridAnimation } from "./GridAnimation";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

function App() {
  const [script, setScript] = useState("");
  const [output, setOutput] = useState([]); // Array of {text, style, align}
  const [audioText, setAudioText] = useState(""); // For audio playback
  const [mode, setMode] = useState("translate");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100%
  const [metrics, setMetrics] = useState({
    word_count: 0,
    token_count: 0,
    est_seconds: 0,
    est_minutes: 0,
    start_time: null,
    finish_time: null,
  });
  const startTimeRef = useRef(null); // Track start time for progress
  const canvasRef = useRef(null); // Reference to the canvas element
  const utteranceRef = useRef(null); // Reference to the current utterance
  const audioSegmentsRef = useRef([]); // Store segments of audioText split by |||

  // Load cached output from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem(getCacheKey(script, mode));
    if (cached) {
      const data = JSON.parse(cached);
      setOutput(data.result);
      setAudioText(data.audio_text);
    }
  }, [script, mode]);

  // Initialize the grid animation when the component mounts
  useEffect(() => {
    if (canvasRef.current) {
      const cleanup = initGridAnimation(canvasRef.current);
      return cleanup; // Cleanup on unmount
    }
  }, []);

  // Update audio segments whenever audioText changes
  useEffect(() => {
    if (audioText) {
      audioSegmentsRef.current = audioText.split("|||").filter(segment => segment.trim());
    } else {
      audioSegmentsRef.current = [];
    }
  }, [audioText]);

  const getCacheKey = (text, mode) => `${mode}_${text}`; // Unique key for each combo

  const stopSpeaking = (resetProgress = true) => {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    setIsPlaying(false);
    if (resetProgress) {
      setProgress(0); // Only reset progress if explicitly requested
    }
    utteranceRef.current = null;
  };

  const processText = async () => {
    stopSpeaking();
    const cacheKey = getCacheKey(script, mode);
    const cachedOutput = localStorage.getItem(cacheKey);
    
    if (cachedOutput) {
      const data = JSON.parse(cachedOutput);
      setOutput(data.result);
      setAudioText(data.audio_text);
      return;
    }

    setIsLoading(true);
    const startTime = new Date();
    setMetrics((prev) => ({ ...prev, start_time: startTime }));

    try {
      const response = await axios.post(
        "http://localhost:5000/process",
        { text: script, mode, lang: "it" },
        { headers: { "Content-Type": "application/json" }, timeout: 60000 }
      );
      const data = response.data;
      setOutput(data.result);
      setAudioText(data.audio_text);

      // Update metrics with backend data
      const finishTime = new Date();
      setMetrics({
        word_count: data.word_count,
        token_count: data.token_count,
        est_seconds: data.est_seconds,
        est_minutes: data.est_minutes,
        start_time: startTime,
        finish_time: finishTime,
      });

      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error("Error details:", error.message);
      console.error("Error response:", error.response ? error.response.data : "No response");
      setOutput([{ text: `Processing failed: ${error.message}`, style: "normal", align: "left" }]);
      setMetrics((prev) => ({ ...prev, finish_time: new Date() }));
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioText || audioSegmentsRef.current.length === 0) return;

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel(); // Ensure any previous speech is stopped
      const totalSegments = audioSegmentsRef.current.length;
      const segmentIndex = Math.floor((progress / 100) * totalSegments);
      const remainingSegments = audioSegmentsRef.current.slice(segmentIndex).join("|||");

      const utterance = new SpeechSynthesisUtterance(remainingSegments);
      utterance.lang = "it";
      utterance.rate = 0.9;

      utterance.onboundary = (event) => {
        const charIndex = event.charIndex || 0;
        let currentCharCount = 0;
        let currentSegmentIndex = 0;

        const segmentsWithDelimiters = remainingSegments.split("|||");
        for (let i = 0; i < segmentsWithDelimiters.length; i++) {
          currentCharCount += segmentsWithDelimiters[i].length + 3; // Include "|||" length
          if (charIndex <= currentCharCount) {
            currentSegmentIndex = i;
            break;
          }
        }

        const globalSegmentIndex = segmentIndex + currentSegmentIndex;
        const newProgress = totalSegments > 0 ? (globalSegmentIndex / totalSegments) * 100 : 0;
        setProgress(newProgress);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setProgress(100);
      };

      utterance.onerror = (event) => {
        console.error("SpeechSynthesisUtterance error:", event.error);
        setIsPlaying(false);
        setProgress(0); // Reset progress on error
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      startTimeRef.current = Date.now();
      setIsPlaying(true);
    }
  };

  const handleProgressChange = (e) => {
    if (!audioText || audioSegmentsRef.current.length === 0) return;

    const newProgress = Number(e.target.value);
    setProgress(newProgress);

    // Stop playback without resetting progress
    stopSpeaking(false);
  };

  const handleModeChange = (newMode) => {
    stopSpeaking();
    setMode(newMode);
    setOutput([]); // Clear output on mode change
    setAudioText("");
    setMetrics({
      word_count: 0,
      token_count: 0,
      est_seconds: 0,
      est_minutes: 0,
      start_time: null,
      finish_time: null,
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    
    // Add title
    doc.setFontSize(16);
    doc.text(`${mode === "translate" ? "Translation" : "Summary"} to Italian`, 10, 10);

    // Add output with screenplay formatting
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 10;
    const marginRight = 10;
    const maxWidth = pageWidth - marginLeft - marginRight;

    output.forEach((item, index) => {
      if (!item.text) {
        yPosition += 5; // Space for empty lines
        return;
      }

      // Set font style
      doc.setFont("courier", item.style === "italic" ? "italic" : "normal");
      doc.setFontSize(12);

      // Handle all caps (use bold for emphasis)
      if (item.style === "allcaps") {
        doc.setFont("courier", "bold");
      }

      // Handle alignment
      let xPosition = marginLeft;
      if (item.align === "center") {
        const textWidth = doc.getTextWidth(item.text);
        xPosition = (pageWidth - textWidth) / 2;
      }

      // Split text to fit within page width
      const lines = doc.splitTextToSize(item.text, maxWidth);
      lines.forEach((line) => {
        doc.text(line, xPosition, yPosition);
        yPosition += 5; // Line spacing
      });

      // Add extra spacing after specific lines (e.g., "Nessuna risposta.")
      if (item.text.toLowerCase().includes("nessuna risposta")) {
        yPosition += 5;
      } else {
        yPosition += 2; // Default spacing after each block
      }

      // Add a new page if necessary
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 10;
      }
    });

    // Add disclaimer at the bottom
    yPosition += 10;
    doc.setFont("courier", "italic");
    doc.setFontSize(10);
    doc.text(
      "Disclaimer: Due to current limitations in intonation, the audio output may not fully capture emotional nuances. We are working on improvements for future releases.",
      10,
      yPosition,
      { maxWidth: 190 }
    );

    // Download the PDF
    doc.save(`${mode}_output.pdf`);
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
        {(isLoading || metrics.start_time) && (
          <div className="metrics-container mb-4 p-2 border rounded">
            <p><strong>Word Count:</strong> {metrics.word_count}</p>
            <p><strong>Token Count:</strong> {metrics.token_count}</p>
            <p><strong>Estimated Time:</strong> {metrics.est_seconds} seconds ({metrics.est_minutes} minutes)</p>
            <p><strong>Start Time:</strong> {metrics.start_time?.toLocaleTimeString()}</p>
            <p><strong>Approx. Finish Time:</strong> {metrics.start_time && !metrics.finish_time
              ? new Date(metrics.start_time.getTime() + metrics.est_seconds * 1000).toLocaleTimeString()
              : metrics.finish_time?.toLocaleTimeString()}</p>
          </div>
        )}
        {output.length > 0 && (
          <div className="output-container">
            <div className="flex play-pause-button">
              <button
                className={` ${
                  isPlaying ? "pause play-pause-button" : "play play-pause-button"
                }`}
                onClick={togglePlayPause}
                disabled={!audioText}
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
                disabled={!audioText}
              />
              <button
                className="ml-2 px-4 py-2 bg-green-500 text-white rounded"
                onClick={exportToPDF}
                disabled={!output.length}
              >
                Export as PDF
              </button>
            </div>
            <div>
              {output.map((item, index) => (
                <p
                  key={index}
                  className={`mb-2 ${
                    item.style === "allcaps" ? "font-bold" : 
                    item.style === "italic" ? "italic" : ""
                  } ${item.align === "center" ? "text-center" : "text-left"}`}
                >
                  {item.text}
                </p>
              ))}
            </div>
            <p className="mt-4 text-sm italic text-gray-600">
              Disclaimer: Due to current limitations in intonation, the audio output may not fully capture emotional nuances. We are working on improvements for future releases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;