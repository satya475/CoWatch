from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os, json
from typing import Dict, List

load_dotenv(Path(__file__).parent / '.env')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

# Room registry
rooms: Dict[str, List[WebSocket]] = {}

@app.get("/api/")
async def root():
    return {"message": "CoWatch API running"}

@app.websocket("/ws/room/{room_code}")
async def room_websocket(websocket: WebSocket, room_code: str):
    await websocket.accept()
    if room_code not in rooms:
        rooms[room_code] = []
    rooms[room_code].append(websocket)
    print(f"[+] {room_code} → {len(rooms[room_code])} connected")

    try:
        while True:
            data = await websocket.receive_text()
            dead = []
            for ws in rooms[room_code]:
                if ws is websocket:
                    continue
                try:
                    await ws.send_text(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                rooms[room_code].remove(ws)
    except WebSocketDisconnect:
        rooms[room_code].remove(websocket)
        if not rooms[room_code]:
            del rooms[room_code]
        print(f"[-] {room_code} → {len(rooms.get(room_code, []))} connected")

@app.on_event("shutdown")
async def shutdown():
    client.close()