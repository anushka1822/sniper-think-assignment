import { useState, useCallback } from 'react';
import { useAudioStream } from './hooks/useAudioStream';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { VoiceOrb } from './components/VoiceOrb';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  
  // 1. Hook to capture microphone and send via WS
  const { 
    startStreaming, 
    stopStreaming, 
    isRecording, 
    isConnected, 
    inputVolume, 
    ws, 
    audioContext 
  } = useAudioStream();

  // 2. Hook to receive WS binary data and play via AudioContext gaplessly
  const { 
    isPlaying, 
    playbackVolume, 
    stopPlayback 
  } = useAudioPlayer(ws, audioContext);

  const toggleVoiceMode = useCallback(async () => {
    if (isRecording) {
      stopStreaming();
      stopPlayback();
      setHasStarted(false);
    } else {
      await startStreaming();
      setHasStarted(true);
    }
  }, [isRecording, startStreaming, stopStreaming, stopPlayback]);

  // If AI is playing back, show its volume, else show mic volume
  const getDisplayVolume = () => {
     if (isPlaying) return playbackVolume;
     if (isRecording) return inputVolume;
     return 0;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-6 selection:bg-blue-500/30">
      <div className="max-w-md w-full flex flex-col items-center space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Voice AI</h1>
          <p className="text-slate-400">Real-time low latency conversation</p>
        </div>

        {/* Central Orb Animation */}
        <VoiceOrb 
          isSpeaking={isPlaying} 
          isListening={isRecording && !isPlaying} 
          volume={getDisplayVolume()} 
        />

        {/* Controls */}
        <div className="flex flex-col items-center gap-4 w-full pt-8">
          <button
            onClick={toggleVoiceMode}
            className={`
              relative px-8 py-4 rounded-full font-bold text-lg 
              transition-all duration-300 transform hover:scale-105 active:scale-95
              shadow-[0_0_20px_rgba(0,0,0,0.3)]
              ${isRecording 
                ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-rose-500/50' 
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50'
              }
            `}
          >
            {isRecording ? "Stop Conversation" : "Start Conversation"}
          </button>
          
          {/* Status Text */}
          <div className="text-sm font-medium flex items-center gap-2">
             Status: 
             <span className={`${isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                {isConnected ? 'Connected to Backend' : 'Disconnected'}
             </span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
