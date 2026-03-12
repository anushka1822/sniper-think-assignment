class RawAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096; // Buffer size before sending
    this.buffer = new Int16Array(this.bufferSize);
    this.bufferCount = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if we have an active input channel (mono)
    if (input && input.length > 0) {
      const channelData = input[0];
      
      for (let i = 0; i < channelData.length; i++) {
        // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        this.buffer[this.bufferCount++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;

        if (this.bufferCount === this.bufferSize) {
          // Send the full Int16 buffer off the audio thread back to the main JS thread
          this.port.postMessage(this.buffer);
          
          // Reset buffer
          this.buffer = new Int16Array(this.bufferSize);
          this.bufferCount = 0;
        }
      }
    }

    return true; // Keep the processor alive
  }
}

registerProcessor("raw-audio-processor", RawAudioProcessor);
