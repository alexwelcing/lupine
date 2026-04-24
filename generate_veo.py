import time
import os
import sys
from google import genai
from google.genai import types

def generate_veo_video(prompt, output_file="veo_manifold_simulation.mp4"):
    print(f"Initializing Vertex AI Client (Project: endlesse, Location: us-central1)...")
    # Initialize the client for Vertex AI using the user's active credentials
    client = genai.Client(vertexai=True, project="endlesse", location="us-central1")
    
    print(f"Triggering Veo-2.0-generate-001...")
    print(f"Prompt: {prompt}")
    
    # Start the Long Running Operation
    operation = client.models.generate_videos(
        model="veo-2.0-generate-001",
        source=types.GenerateVideosSource(
            prompt=prompt
        )
    )
    
    print(f"Operation started: {operation.name}")
    print("Waiting for generation to complete (this usually takes a few minutes)...")
    
    # Poll for completion
    while not operation.done:
        time.sleep(15)
        operation = client.operations.get(operation)
        print("Polling... still processing.")
        
    if operation.error:
        print(f"Error during generation: {operation.error}")
        return
        
    print("Generation complete!")
    
    # Fetch the resulting video URI
    for i, video_result in enumerate(operation.result.generated_videos):
        uri = video_result.video.uri
        print(f"Video URI [{i}]: {uri}")
        
        if uri.startswith("gs://"):
            print(f"Downloading from GCS to {output_file}...")
            # Use gsutil to pull the file locally into the workspace
            os.system(f'gsutil cp "{uri}" "{output_file}"')
            print(f"Successfully saved to {output_file}")

if __name__ == "__main__":
    prompt = "A high-fidelity cinematic visualization of a high-dimensional mathematical manifold in an abstract void. The topology maps stiff and sloppy parameter dimensions in dark blue, orange, and neon accents. Professional, photorealistic, physics simulation style. 4k resolution, smooth looping."
    
    generate_veo_video(prompt)
