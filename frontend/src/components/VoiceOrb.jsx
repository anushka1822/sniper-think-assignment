import { motion } from "framer-motion";

export function VoiceOrb({ isSpeaking, isListening, volume }) {
  // Normalize volume for reasonable scale. 
  // RMS usually is between 0 and 0.5 for loud speech, so we can map it generously
  const baseScale = isSpeaking ? 1.2 : isListening ? 1.0 : 0.8;
  const audioScaleBoost = Math.min(volume * 5.0, 1.0); // Cap boost at 1.0
  const currentScale = baseScale + audioScaleBoost;

  // Colors mapping logic matching index.css Variables
  const orbColor = isSpeaking
    ? "var(--color-speaking)"
    : isListening
    ? "var(--color-listening)"
    : "var(--color-primary-orb)";

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <motion.div
        className="relative w-48 h-48 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center"
        animate={{
          scale: currentScale,
          backgroundColor: orbColor,
          boxShadow: `0 0 ${20 + audioScaleBoost * 40}px ${orbColor}`,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          mass: 0.5,
        }}
      >
        {/* Inner static core */}
        <div className="w-32 h-32 bg-dark-bg/40 rounded-full flex items-center justify-center">
            <span className="text-white font-bold tracking-wider uppercase text-sm">
                {isSpeaking ? "Speaking" : isListening ? "Listening" : "Idle"}
            </span>
        </div>
      </motion.div>
    </div>
  );
}
