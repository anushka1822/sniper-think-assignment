import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

# Default voice: "Rachel" or "Adam"
VOICE_ID = "21m00Tcm4TlvDq8ikWAM" # Rachel

async def stream_tts(text: str):
    """
    Streams TTS audio bytes from ElevenLabs API for a given sentence.
    Yields raw MP3 or PCM bytes depending on the configuration.
    """
    load_dotenv(override=True)
    ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
    if not ELEVENLABS_API_KEY:
        print("Warning: ElevenLabs API Key missing.")
        return
        
    print(f"DEBUG: First 5 chars of ElevenLabs Key: {ELEVENLABS_API_KEY[:5]}...")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}/stream?output_format=pcm_16000"
    
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", url, json=data, headers=headers) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes(chunk_size=4096):
                    if chunk:
                        yield chunk
    except asyncio.CancelledError:
        print("ElevenLabs TTS stream cancelled.")
        raise
    except Exception as e:
        print(f"ElevenLabs TTS error: {e}")
