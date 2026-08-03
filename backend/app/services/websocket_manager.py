import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"WebSocket connected for user_id={user_id}. Total active: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user_id={user_id}")

    async def send_personal_event(self, user_id: str, event_type: str, payload: dict):
        """
        Broadcast an event to all active WebSocket connections belonging to a specific user_id.
        """
        if user_id not in self.active_connections:
            return

        message = {
            "event": event_type,
            "data": payload
        }
        json_str = json.dumps(message)

        dead_sockets = set()
        for websocket in list(self.active_connections[user_id]):
            try:
                await websocket.send_text(json_str)
            except Exception as e:
                logger.warning(f"Failed to send WS message to user {user_id}: {e}")
                dead_sockets.add(websocket)

        for dead in dead_sockets:
            self.disconnect(user_id, dead)

ws_manager = ConnectionManager()
