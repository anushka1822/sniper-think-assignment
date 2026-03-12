import { motion } from "framer-motion";

export function VoiceOrb({ isSpeaking, isListening, volume }) {
  // Normalize volume to drive scale and wobble intensity
  const audioScaleBoost = Math.min(volume * 5.0, 1.3);
  
  // Decide the base scale based on state
  const baseScale = isSpeaking ? 1.25 : isListening ? 1.1 : 0.85;
  const currentScale = baseScale + audioScaleBoost;

  // Ultra-premium colors matching OpenAI's advanced voice aesthetic
  const glowColor = isSpeaking
    ? "rgba(217, 70, 239, 0.6)"  // Fuchsia-500
    : isListening
    ? "rgba(45, 212, 191, 0.6)"  // Teal-400
    : "rgba(71, 85, 105, 0.3)";  // Slate-600

  // The actual liquid glass color
  const coreColor = isSpeaking
    ? "rgba(192, 38, 211, 0.8)"  // Rich Fuchsia
    : isListening
    ? "rgba(20, 184, 166, 0.8)"  // Rich Teal
    : "rgba(30, 41, 59, 0.5)";   // Dark Slate

  // Inner diffuse gradient for spherical realistic 3D volume
  const innerGradient = isSpeaking
    ? "radial-gradient(circle at 30% 30%, rgba(252, 165, 241, 0.9), rgba(192, 38, 211, 0.8) 50%, rgba(134, 25, 143, 0.9))"
    : isListening
    ? "radial-gradient(circle at 30% 30%, rgba(153, 246, 228, 0.9), rgba(20, 184, 166, 0.8) 50%, rgba(15, 118, 110, 0.9))"
    : "radial-gradient(circle at 30% 30%, rgba(148, 163, 184, 0.4), rgba(51, 65, 85, 0.6) 50%, rgba(15, 23, 42, 0.8))";

  // Liquid bubble border radius animation arrays
  const isAudioActive = (isSpeaking || isListening) && volume > 0.01;
  const idleBorderRadius = ["50% 50% 50% 50%"];
  
  // Highly irregular fluid shapes that morph smoothly
  const activeBorderRadius = [
    "50% 50% 50% 50%",
    "60% 40% 30% 70%", 
    "40% 60% 70% 30%", 
    "55% 45% 35% 65%",
    "45% 55% 60% 40%", 
    "50% 50% 50% 50%"
  ];

  return (
    <div className="relative flex flex-col items-center justify-center p-16">
      
      {/* 1. Outer Massive Pulsing Diffuse Glow */}
      <motion.div
        className="absolute w-72 h-72 rounded-full blur-[100px] opacity-70 z-0 pointer-events-none"
        animate={{
          backgroundColor: glowColor,
          scale: currentScale * 1.6,
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* 2. Middle Ring - Subtle rotating corona line */}
      {(isSpeaking || isListening) && (
         <motion.div
           className="absolute w-56 h-56 rounded-full border border-white/10 z-0 pointer-events-none border-t-white/40 blur-[2px]"
           animate={{ rotate: 360, scale: currentScale * 1.15 }}
           transition={{ rotate: { duration: 8, ease: "linear", repeat: Infinity }, scale: { duration: 0.3 } }}
         />
      )}

      {/* 3. The Core Liquid Glass Drop */}
      <motion.div
        className="relative w-48 h-48 z-10 flex items-center justify-center backdrop-blur-xl overflow-hidden"
        animate={{
          scale: currentScale,
          borderRadius: isAudioActive ? activeBorderRadius : idleBorderRadius,
          boxShadow: `0 0 ${40 + audioScaleBoost * 60}px ${glowColor}, inset 0 -15px 30px rgba(0,0,0,0.5), inset 0 10px 20px rgba(255,255,255,0.4)`,
        }}
        transition={{
          scale: { type: "spring", stiffness: 250, damping: 20, mass: 0.8 },
          boxShadow: { duration: 0.3 },
          borderRadius: {
            duration: Math.max(0.6, 2.0 - audioScaleBoost), // Faster wobble when louder
            ease: "easeInOut",
            repeat: isAudioActive ? Infinity : 0,
            repeatType: "mirror"
          }
        }}
        style={{
          background: innerGradient,
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        {/* Hyper-realistic 3D Surface Reflections */}
        {/* Top left curved highlight */}
        <div className="absolute top-[10%] left-[15%] w-[40%] h-[20%] bg-gradient-to-b from-white/60 to-transparent rounded-full blur-[2px] transform -rotate-[20deg]" />
        
        {/* Bottom right subtle dark reflection */}
        <div className="absolute bottom-[5%] right-[10%] w-[50%] h-[30%] bg-black/40 rounded-full blur-[8px] transform rotate-[15deg]" />

        {/* Center core pulse engine (Only visible when active) */}
        <motion.div 
           className="w-16 h-16 bg-white rounded-full blur-xl z-20 mix-blend-overlay"
           animate={{
              scale: isAudioActive ? 1.0 + audioScaleBoost : 0,
              opacity: isAudioActive ? 0.3 + (audioScaleBoost * 0.3) : 0
           }}
           transition={{ duration: 0.15 }}
        />
      </motion.div>
    </div>
  );
}
