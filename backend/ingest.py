import os
import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer

# We use a small, fast model suitable for CPU encoding
model_name = "all-MiniLM-L6-v2"
model = SentenceTransformer(model_name)

KNOWLEDGE_FILE = "knowledge.txt"
INDEX_FILE = "faiss_index.bin"
CHUNKS_FILE = "chunks.pkl"

def ingest():
    if not os.path.exists(KNOWLEDGE_FILE):
        print(f"Error: {KNOWLEDGE_FILE} not found.")
        return

    print("Reading knowledge base...")
    with open(KNOWLEDGE_FILE, "r") as f:
        text = f.read()

    # Simple chunking: split by sentences or newlines. 
    # Here we split by non-empty lines for simplicity.
    chunks = [line.strip() for line in text.split("\n") if line.strip()]
    
    if not chunks:
        print("Knowledge base is empty.")
        return

    print(f"Extracted {len(chunks)} chunks. Generating embeddings...")
    # Generate embeddings
    embeddings = model.encode(chunks, show_progress_bar=True)
    embeddings = np.array(embeddings).astype("float32")
    
    # Initialize FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    
    # Add embeddings to the index
    index.add(embeddings)
    
    # Save the index to disk
    faiss.write_index(index, INDEX_FILE)
    
    # Save the chunks to disk so we can retrieve the actual text later
    with open(CHUNKS_FILE, "wb") as f:
        pickle.dump(chunks, f)
        
    print(f"Successfully created FAISS index with {len(chunks)} chunks.")
    print(f"Saved to {INDEX_FILE} and {CHUNKS_FILE}.")

if __name__ == "__main__":
    ingest()
