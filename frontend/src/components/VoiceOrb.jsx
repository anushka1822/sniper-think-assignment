import { motion } from "framer-motion";

export function VoiceOrb({ isSpeaking, isListening, volume }) {
  // Normalize volume for extreme visual responsiveness
  const audioScaleBoost = Math.min(volume * 6.0, 1.2); 
  
  // Decide the base scale based on state
  const baseScale = isSpeaking ? 1.2 : isListening ? 1.05 : 0.85;
  const currentScale = baseScale + audioScaleBoost;

  // Determine dynamic colors and glows
  // Idle: subtle Slate
  // Listening: vibrant Emerald / Cyan
  // Speaking: warm Fuchsia / Purple
  const orbColor = isSpeaking
    ? "rgba(232, 121, 249, 1)"   // fuchsia-400
    : isListening
    ? "rgba(52, 211, 153, 1)"    // emerald-400
    : "rgba(71, 85, 105, 1)";    // slate-600

  const glowColor = isSpeaking
    ? "rgba(192, 38, 211, 0.6)"  // fuchsia-600
    : isListening
    ? "rgba(16, 185, 129, 0.6)"  // emerald-500
    : "rgba(30, 41, 59, 0.4)";   // slate-800

  // Liquid crystal morphing effect (border radius animation)
  // When active (speaking/listening with volume), it bubbles drastically.
  const isAudioActive = (isSpeaking || isListening) && volume > 0.02;
  
  const idleBorderRadius = ["50% 50% 50% 50%"];
  const activeBorderRadius = [
    "60% 40% 30% 70%", 
    "40% 60% 70% 30%", 
    "50% 50% 40% 60%", 
    "40% 70% 50% 40%",
    "60% 40% 30% 70%"
  ];

  return (
    <div className="relative flex flex-col items-center justify-center p-12">
      
      {/* Background massive ambient diffuse glow */}
      <motion.div
        className="absolute w-64 h-64 rounded-full blur-[80px] opacity-60 z-0"
        animate={{
          backgroundColor: glowColor,
          scale: currentScale * 1.5,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />

      {/* The core Liquid Orb */}
      <motion.div
        className="relative w-48 h-48 z-10 flex items-center justify-center backdrop-blur-md"
        animate={{
          scale: currentScale,
          backgroundColor: isAudioActive ? orbColor : 'rgba(30, 41, 59, 0.8)',
          boxShadow: `0 0 ${30 + audioScaleBoost * 50}px ${glowColor}, inset 0 0 20px rgba(255,255,255,0.4)`,
          borderRadius: isAudioActive ? activeBorderRadius : idleBorderRadius,
        }}
        transition={{
          scale: { type: "spring", stiffness: 200, damping: 15, mass: 0.5 },
          backgroundColor: { duration: 0.4 },
          boxShadow: { duration: 0.2 },
          borderRadius: {
            duration: isAudioActive ? 2.5 : 0.8,
            ease: "easeInOut",
            repeat: isAudioActive ? Infinity : 0,
            repeatType: "mirror"
          }
        }}
        style={{
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {/* Inner high-light reflection to make it look like 3D glass */}
        <div className="absolute top-4 left-6 w-16 h-8 bg-white/30 rounded-full blur-md transform -rotate-45" />
        <div className="absolute bottom-4 right-8 w-12 h-6 bg-black/20 rounded-full blur-md" />
        
        {/* Core resting dot indicator */}
        <motion.div 
           className="w-4 h-4 bg-white rounded-full z-20"
           animate={{
              scale: isAudioActive ? 0 : 1,
              opacity: isAudioActive ? 0 : 1
           }}
           transition={{ duration: 0.3 }}
        />
      </motion.div>
    </div>
  );
}
