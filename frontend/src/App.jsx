import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioStream } from './hooks/useAudioStream';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { VoiceOrb } from './components/VoiceOrb';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  
  // 1. Hook to capture microphone and send via WS
  // LOGIC IS STRICTLY UNTOUCHED
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
  // LOGIC IS STRICTLY UNTOUCHED
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
  // LOGIC IS STRICTLY UNTOUCHED
  const getDisplayVolume = () => {
     if (isPlaying) return playbackVolume;
     if (isRecording) return inputVolume;
     return 0;
  };

  // Determine elegant UI State
  let systemState = "Standby";
  let stateColor = "text-slate-400";
  let stateBg = "bg-slate-800/40 border-slate-700/50";
  let dotColor = "bg-slate-500";
  
  if (isRecording && !isPlaying) {
    systemState = "Listening";
    stateColor = "text-teal-300";
    stateBg = "bg-teal-900/30 border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.15)]";
    dotColor = "bg-teal-400";
  } else if (isPlaying) {
    systemState = "Speaking";
    stateColor = "text-fuchsia-300";
    stateBg = "bg-fuchsia-900/30 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]";
    dotColor = "bg-fuchsia-400";
  }

  return (
    <>
      {/* Deep cosmic mesh gradient background */}
      <div className="mesh-bg" />
      
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden selection:bg-fuchsia-500/30">
        
        {/* Dynamic Glass Panel */}
        <motion.div 
          className="glass-panel w-full max-w-xl mx-auto rounded-[2.5rem] p-8 sm:p-14 flex flex-col items-center justify-between"
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, type: "spring", bounce: 0.3 }}
          style={{ minHeight: '650px' }}
        >
          
          {/* Header & Status Indicator */}
          <div className="w-full flex flex-col items-center space-y-8 mt-4">
            <motion.h1 
              className="text-4xl font-light tracking-[0.2em] text-white opacity-95 text-glow"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              AURA <span className="font-bold opacity-100 tracking-[0.1em]">AI</span>
            </motion.h1>
            
            <AnimatePresence mode="popLayout">
              <motion.div
                key={systemState}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`px-5 py-2.5 rounded-full border text-xs font-semibold tracking-[0.15em] uppercase ${stateBg} ${stateColor} flex items-center gap-3 backdrop-blur-md`}
              >
                {/* Pulsing dot for all states */}
                <span className="relative flex h-2 w-2">
                  {(systemState !== "Standby") && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
                </span>
                {systemState}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Central Animated Element Workspace */}
          <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
            <VoiceOrb 
               isSpeaking={isPlaying} 
               isListening={isRecording && !isPlaying} 
               volume={getDisplayVolume()} 
            />
          </div>

          {/* Controls Footer */}
          <div className="w-full flex flex-col items-center gap-6 mt-4 relative z-20">
            
            <div className="h-6 flex items-center justify-center">
              <AnimatePresence>
                {!isConnected && isRecording && (
                   <motion.p 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs text-rose-400 font-semibold tracking-widest uppercase text-glow"
                   >
                     Connecting to Core...
                   </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              onClick={toggleVoiceMode}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`
                relative px-12 py-4.5 rounded-full font-bold text-sm tracking-[0.15em] uppercase overflow-hidden
                transition-all duration-500 ease-out
                focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-offset-[#0B0F19]
                ${isRecording 
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] border border-rose-400/50' 
                  : 'bg-gradient-to-r from-slate-100 to-white hover:from-white hover:to-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.2)] border border-white/50'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {isRecording ? "End Session" : "Initialize System"}
              </div>
              
              {/* Subtle button shine effect */}
              {!isRecording && (
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-40 animate-[shimmer_2.5s_infinite]" style={{ animation: 'shimmer 3s infinite' }} />
              )}
            </motion.button>
            <style jsx>{`
              @keyframes shimmer {
                100% { transform: translateX(300%) skewX(-12deg); }
              }
            `}</style>
            
          </div>

        </motion.div>

      </div>
    </>
  );
}

export default App;
