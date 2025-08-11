from typing import Dict, List, Any, Optional
from collections import defaultdict


class InMemoryConversationStore:
    def __init__(self) -> None:
        self._session_to_messages: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self._session_to_last_artifact: Dict[str, Dict[str, Any]] = {}
        self._max_messages: int = 20

    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        return list(self._session_to_messages[session_id])

    def set_history(self, session_id: str, messages: List[Dict[str, Any]]) -> None:
        # Trim to last N messages for short-term memory
        if len(messages) > self._max_messages:
            messages = messages[-self._max_messages :]
        self._session_to_messages[session_id] = list(messages)

    def reset(self, session_id: str) -> None:
        self._session_to_messages.pop(session_id, None)
        self._session_to_last_artifact.pop(session_id, None)

    def set_last_artifact(self, session_id: str, artifact: Dict[str, Any]) -> None:
        self._session_to_last_artifact[session_id] = artifact

    def get_last_artifact(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self._session_to_last_artifact.get(session_id)


memory_store = InMemoryConversationStore()
