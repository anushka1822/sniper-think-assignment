import { useState, useRef, useCallback, useEffect } from "react";

export function useAudioPlayer(ws, audioContext) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackVolume, setPlaybackVolume] = useState(0);
  
  const nextStartTimeRef = useRef(0);
  const activeNodesRef = useRef([]);
  const analyzerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Setup analyzer for RMS volume
  useEffect(() => {
    if (!audioContext) return;
    analyzerRef.current = audioContext.createAnalyser();
    analyzerRef.current.fftSize = 512;
    analyzerRef.current.connect(audioContext.destination);

    const updateVolume = () => {
      if (!analyzerRef.current) return;
      const dataArray = new Float32Array(analyzerRef.current.frequencyBinCount);
      analyzerRef.current.getFloatTimeDomainData(dataArray);
      
      let sumSquares = 0.0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      setPlaybackVolume(rms);

      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (analyzerRef.current) {
        analyzerRef.current.disconnect();
        analyzerRef.current = null;
      }
    };
  }, [audioContext]);

  const stopPlayback = useCallback(() => {
    // Stop all active nodes
    activeNodesRef.current.forEach((node) => {
      try { node.stop(); } catch (e) {}
      node.disconnect();
    });
    activeNodesRef.current = [];
    nextStartTimeRef.current = 0;
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!ws || !audioContext) return;

    const handleMessage = async (event) => {
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        // Binary Data from Backend -> ElevenLabs PCM
        let buffer = event.data;
        if (event.data instanceof Blob) {
           buffer = await event.data.arrayBuffer();
        }

        const int16Data = new Int16Array(buffer);
        const float32Data = new Float32Array(int16Data.length);
        
        // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
        for (let i = 0; i < int16Data.length; i++) {
            float32Data[i] = int16Data[i] / 32768.0;
        }

        // Must match eleven labs "pcm_16000" output format
        const audioBuffer = audioContext.createBuffer(1, float32Data.length, 16000);
        audioBuffer.getChannelData(0).set(float32Data);

        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        
        // Connect to our analyzer which is connected to destination
        sourceNode.connect(analyzerRef.current || audioContext.destination);

        // Gapless playback scheduling
        const currentTime = audioContext.currentTime;
        if (nextStartTimeRef.current < currentTime) {
            nextStartTimeRef.current = currentTime;
        }

        sourceNode.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        
        activeNodesRef.current.push(sourceNode);
        setIsPlaying(true);

        sourceNode.onended = () => {
           activeNodesRef.current = activeNodesRef.current.filter((n) => n !== sourceNode);
           if (activeNodesRef.current.length === 0) {
               setIsPlaying(false);
               nextStartTimeRef.current = 0;
           }
        };

      } else if (typeof event.data === "string") {
         try {
           const msg = JSON.parse(event.data);
           if (msg.type === "interrupt") {
              console.log("Interrupt received! Halting playback.");
              stopPlayback();
           }
         } catch(e) {}
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => {
       ws.removeEventListener("message", handleMessage);
    };
  }, [ws, audioContext, stopPlayback]);

  return { isPlaying, playbackVolume, stopPlayback };
}
