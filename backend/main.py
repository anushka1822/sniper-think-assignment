import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from deepgram import (
    DeepgramClient,
    LiveTranscriptionEvents,
    LiveOptions,
)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

if not DEEPGRAM_API_KEY:
    print("WARNING: DEEPGRAM_API_KEY is not set in the environment.")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

manager = ConnectionManager()

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Initialize Deepgram
    deepgram = DeepgramClient(DEEPGRAM_API_KEY)
    dg_connection = deepgram.listen.asyncwebsocket.v("1")
    
    current_transcript = ""
    state = "LISTENING"

    async def on_message(self, result, **kwargs):
        nonlocal current_transcript, state
        
        sentence = result.channel.alternatives[0].transcript
        if not sentence:
            return

        # result.is_final means Deepgram has definitively recognized this chunk of audio
        if result.is_final:
            current_transcript += f" {sentence}"
            
            # If Deepgram determines it's the end of the spoken phrase (via endpointing)
            # Some endpointing configs trigger speech_final instead of UtteranceEnd depending on exact audio, 
            # so we check speech_final as well based on requirements.
            if result.speech_final:
                state = "PROCESSING"
                print(f"Turn Complete (speech_final): [{current_transcript.strip()}]")
                current_transcript = ""
                state = "LISTENING"
        else:
            # Interim results (e.g. while the user is still speaking)
            pass

    async def on_utterance_end(self, utterance_end, **kwargs):
        nonlocal current_transcript, state
        if current_transcript.strip():
            state = "PROCESSING"
            print(f"Turn Complete (UtteranceEnd): [{current_transcript.strip()}]")
            current_transcript = ""
            state = "LISTENING"

    async def on_error(self, error, **kwargs):
        print(f"Deepgram Error: {error}")

    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
    dg_connection.on(LiveTranscriptionEvents.UtteranceEnd, on_utterance_end)
    dg_connection.on(LiveTranscriptionEvents.Error, on_error)

    options = LiveOptions(
        model="nova-2",
        language="en",
        encoding="linear16",
        channels=1,
        sample_rate=16000,
        endpointing=500, # 500ms of silence
        interim_results=True,
        utterance_end_ms="1000",
    )

    if not await dg_connection.start(options):
        print("Failed to start Deepgram connection")
        return

    print("Deepgram connection started. Waiting for audio...")

    try:
        while True:
            # Receive raw PCM 16-bit, 16kHz mono audio chunks from the frontend
            data = await websocket.receive_bytes()
            
            if state == "LISTENING":
                await dg_connection.send(data)

    except WebSocketDisconnect:
        print("Client disconnected from WebSocket")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        manager.disconnect(websocket)
        await dg_connection.finish()
