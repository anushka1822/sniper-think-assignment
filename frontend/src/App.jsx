import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Determine elegant UI State
  let systemState = "Idle";
  let stateColor = "text-slate-400";
  let stateBg = "bg-slate-500/10 border-slate-500/20";
  
  if (isRecording && !isPlaying) {
    systemState = "Listening";
    stateColor = "text-emerald-400";
    stateBg = "bg-emerald-500/10 border-emerald-500/20";
  } else if (isPlaying) {
    systemState = "Speaking";
    stateColor = "text-fuchsia-400";
    stateBg = "bg-fuchsia-500/10 border-fuchsia-500/20";
  }

  return (
    <>
      <div className="mesh-bg" />
      
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden selection:bg-fuchsia-500/30">
        
        {/* Dynamic Glass Panel */}
        <motion.div 
          className="glass-panel w-full max-w-xl mx-auto rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ minHeight: '600px' }}
        >
          
          {/* Header & Status Indicator */}
          <div className="w-full flex flex-col items-center space-y-4">
            <h1 className="text-3xl font-light tracking-widest text-white uppercase opacity-90">
              Tars <span className="font-bold opacity-100">AI</span>
            </h1>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={systemState}
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                transition={{ duration: 0.2 }}
                className={`px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide uppercase ${stateBg} ${stateColor} flex items-center gap-2`}
              >
                {/* Pulsing dot for active states */}
                {(systemState !== "Idle") && (
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemState === 'Speaking' ? 'bg-fuchsia-400' : 'bg-emerald-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${systemState === 'Speaking' ? 'bg-fuchsia-500' : 'bg-emerald-500'}`}></span>
                  </span>
                )}
                {systemState}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Central Animated Element Workspace */}
          <div className="flex-1 flex flex-col items-center justify-center w-full my-8 relative">
            <VoiceOrb 
               isSpeaking={isPlaying} 
               isListening={isRecording && !isPlaying} 
               volume={getDisplayVolume()} 
            />
          </div>

          {/* Controls Footer */}
          <div className="w-full flex flex-col items-center gap-6">
            
            <div className="h-4 flex items-center justify-center">
              {!isConnected && isRecording && (
                 <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-rose-400 font-medium tracking-wide uppercase"
                 >
                   Connecting to AI Core...
                 </motion.p>
              )}
            </div>

            <motion.button
              onClick={toggleVoiceMode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative px-10 py-4 rounded-full font-bold text-sm tracking-widest uppercase
                transition-colors duration-300
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                ${isRecording 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] focus:ring-rose-500' 
                  : 'bg-white hover:bg-slate-100 text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.2)] focus:ring-white'
                }
              `}
            >
              {isRecording ? "End Session" : "Initialize System"}
            </motion.button>
            
          </div>

        </motion.div>

      </div>
    </>
  );
}

export default App;
