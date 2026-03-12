import os
import asyncio
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = AsyncGroq(api_key=GROQ_API_KEY)

async def generate_response_stream(prompt: str):
    """
    Streams the response from Groq LLM, yielding complete sentences.
    """
    if not GROQ_API_KEY:
        yield "Error: Groq API key is missing."
        return

    # A simple prompt system to instruct the AI to keep answers concise for voice
    messages = [
        {"role": "system", "content": "You are a helpful voice assistant. Keep your answers concise, conversational, and direct. Do not use markdown like asterisks or code blocks, as this is being read aloud by a human-like voice."},
        {"role": "user", "content": prompt}
    ]

    try:
        stream = await client.chat.completions.create(
            model="llama3-8b-8192",  # Fast model for voice
            messages=messages,
            stream=True,
            max_tokens=256,
        )

        buffer = ""
        sentence_enders = {".", "?", "!"}

        async for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                text = chunk.choices[0].delta.content
                buffer += text
                
                # Check for a complete sentence
                for i, char in enumerate(buffer):
                    if char in sentence_enders:
                        # Extract the sentence including the punctuation mark
                        sentence = buffer[:i+1].strip()
                        if sentence:
                            yield sentence
                        # Update buffer to remainer
                        buffer = buffer[i+1:].lstrip()
                        break # Break out of inner loop after finding sentence, outer loop continues stream
                        
        if buffer.strip():
            yield buffer.strip()

    except asyncio.CancelledError:
        print("Groq stream cancelled.")
        raise
    except Exception as e:
        print(f"Groq generation error: {e}")
        yield "I encountered an error while thinking."
