import os
import json
import asyncio
import certifi
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["SSL_CERT_DIR"] = certifi.where()

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

from llm import generate_response_stream
from tts import stream_tts

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Initialize Deepgram
    deepgram = DeepgramClient(DEEPGRAM_API_KEY)
    dg_connection = deepgram.listen.asynclive.v("1")
    
    current_transcript = ""
    state = "LISTENING" # LISTENING or SPEAKING
    
    # Track the active background task so we can cancel it via barge-in
    active_generation_task = None
    
    # Queue for TTS audio to send back
    audio_queue = asyncio.Queue()
    
    async def process_ai_response(text: str):
        """
        Background task that streams LLM and then streams TTS.
        """
        nonlocal state
        try:
            # 1. Stream the LLM response sentence by sentence
            async for sentence in generate_response_stream(text):
                print(f"LLM Sentence generated: {sentence}")
                
                # 2. For each sentence, stream the TTS audio bytes and queue them
                async for audio_chunk in stream_tts(sentence):
                    await audio_queue.put(audio_chunk)
                    
            # Put a sentinel value or empty bytes to indicate the end of speaking
            await audio_queue.put(b"END_OF_AUDIO")
        except asyncio.CancelledError:
            print("process_ai_response was cancelled due to interruption.")
            raise

    async def audio_sender():
        """
        Continuously reads from audio_queue and sends to client.
        """
        nonlocal state
        try:
             while True:
                chunk = await audio_queue.get()
                if chunk == b"END_OF_AUDIO":
                    print("Finished speaking audio queue.")
                    state = "LISTENING"
                    audio_queue.task_done()
                    continue
                # While we are sending out audio, we are officially "SPEAKING"
                # The frontend expects binary data.
                await websocket.send_bytes(chunk)
                audio_queue.task_done()
        except asyncio.CancelledError:
             print("Audio sender task cancelled.")
        except Exception as e:
             print(f"Audio sender error: {e}")

    sender_task = asyncio.create_task(audio_sender())

    async def on_message(self, result, **kwargs):
        nonlocal current_transcript, state, active_generation_task
        
        sentence = result.channel.alternatives[0].transcript
        if not sentence:
            return
            
        # BARGE-IN INTERRUPTION LOGIC
        # If Deepgram hears anything with enough confidence while we are SPEAKING
        if state == "SPEAKING" and len(sentence.strip()) > 3:
            print(f"BARGE IN DETECTED: User said '{sentence}'")
            
            # 1. Cancel ongoing LLM + TTS streaming
            if active_generation_task and not active_generation_task.done():
                active_generation_task.cancel()
            
            # 2. Flush the outbound audio queue
            while not audio_queue.empty():
                try:
                    audio_queue.get_nowait()
                    audio_queue.task_done()
                except asyncio.QueueEmpty:
                    break
                    
            # 3. Send "interrupt" control message
            await websocket.send_json({"type": "interrupt"})
            
            # 4. Return immediately to listening state
            state = "LISTENING"
            current_transcript = sentence # Keep this so we don't lose the interrupted bit
            return
            

        if result.is_final:
            current_transcript += f" {sentence}"
            if result.speech_final:
                print(f"Turn Complete (speech_final): [{current_transcript.strip()}]")
                
                # Start generating AI response
                state = "SPEAKING"
                if active_generation_task and not active_generation_task.done():
                     active_generation_task.cancel()
                     
                active_generation_task = asyncio.create_task(
                    process_ai_response(current_transcript.strip())
                )
                
                current_transcript = ""

    async def on_utterance_end(self, utterance_end, **kwargs):
        nonlocal current_transcript, state, active_generation_task
        if current_transcript.strip() and state == "LISTENING":
            print(f"Turn Complete (UtteranceEnd): [{current_transcript.strip()}]")
            
            # Start generating AI response
            state = "SPEAKING"
            if active_generation_task and not active_generation_task.done():
                 active_generation_task.cancel()
                 
            active_generation_task = asyncio.create_task(
                process_ai_response(current_transcript.strip())
            )
            
            current_transcript = ""

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
            message = await websocket.receive()
            if "bytes" in message:
                data = message["bytes"]
                # Always send audio to Deepgram to monitor for barge-ins!
                await dg_connection.send(data)
            elif "text" in message:
                print(f"Received text message from client: {message['text']}")

    except WebSocketDisconnect:
        print("Client disconnected from WebSocket")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        manager.disconnect(websocket)
        await dg_connection.finish()
        if sender_task:
            sender_task.cancel()
        if active_generation_task and not active_generation_task.done():
            active_generation_task.cancel()
