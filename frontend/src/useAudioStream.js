import { useState, useRef, useCallback } from "react";

const BACKEND_WS_URL = "ws://localhost:8000/ws/stream";

export function useAudioStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const wsRef = useRef(null);

  const startStreaming = useCallback(async () => {
    try {
      // 1. Establish WebSocket connection
      wsRef.current = new WebSocket(BACKEND_WS_URL);
      wsRef.current.binaryType = "arraybuffer";

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        stopStreaming();
      };

      wsRef.current.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      // 2. Request microphone access
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,      // Mono
          sampleRate: 16000,    // Hardcode to 16kHz for Deepgram compatibility
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 3. Set up AudioContext using the standard 16kHz sample rate
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });

      // 4. Load the audio processor from the public folder
      await audioContextRef.current.audioWorklet.addModule("/audioProcessor.js");

      // 5. Connect the nodes
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, "raw-audio-processor");

      // 6. Handle messages sent from the AudioWorklet to the main thread
      workletNodeRef.current.port.onmessage = (event) => {
        // event.data is the Int16Array from the processor
        const int16Buffer = event.data;

        // Send binary PCM data over WebSocket if open
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(int16Buffer.buffer);
        }
      };

      sourceNodeRef.current.connect(workletNodeRef.current);
      setIsRecording(true);

    } catch (err) {
      console.error("Failed to start audio stream:", err);
      stopStreaming();
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsRecording(false);
    setIsConnected(false);
  }, []);

  return {
    startStreaming,
    stopStreaming,
    isRecording,
    isConnected,
    ws: wsRef.current, // Expose websocket for listening to incoming TTS later
  };
}
