from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from generators import integration

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GENERATORS = {
    "integration": integration.generate,
}


@app.get("/")
def root():
    return {"status": "ok"}


@app.post("/generate")
def generate(topic: str, difficulty: str):
    if topic not in GENERATORS:
        return {"error": f"Unknown topic: {topic}"}

    return GENERATORS[topic](difficulty)