import json
import logging
import asyncio
from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("devpulse.websocket")


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")
        
        # Send initial welcome payload
        welcome_payload = {
            "type": "connection_established",
            "message": "Connected to DevPulse Real-Time Telemetry Stream",
            "active_clients": len(self.active_connections),
        }
        await websocket.send_text(json.dumps(welcome_payload))

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON-serializable message to all connected clients."""
        payload_text = json.dumps(message)
        dead_connections: List[WebSocket] = []

        async with self._lock:
            connections_snapshot = list(self.active_connections)

        for connection in connections_snapshot:
            try:
                await connection.send_text(payload_text)
            except Exception as e:
                logger.warning(f"Error transmitting to client: {e}. Marking for cleanup.")
                dead_connections.append(connection)

        if dead_connections:
            async with self._lock:
                for dead in dead_connections:
                    if dead in self.active_connections:
                        self.active_connections.remove(dead)

    @property
    def client_count(self) -> int:
        return len(self.active_connections)


manager = ConnectionManager()
