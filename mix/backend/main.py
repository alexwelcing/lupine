from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from core.source_miner import SourceMiner

app = FastAPI(title="Mix (CineWeave) API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Engines
miner = SourceMiner()

class ExtractRequest(BaseModel):
    file_path: str
    prompt: str

@app.post("/extract")
async def extract_stem(req: ExtractRequest):
    try:
        result_path = await miner.extract_stem(req.file_path, req.prompt)
        return {"status": "success", "file": result_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "CineWeave Audio Engine Online"}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
