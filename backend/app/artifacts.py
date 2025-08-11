from typing import Optional, Dict, Any


class ArtifactAggregator:
    def __init__(self) -> None:
        self._buffer: str = ""
        self._full_text_parts: list[str] = []
        self._in_code_block: bool = False
        self._code_language: Optional[str] = None
        self._code_buffer: list[str] = []
        self._last_artifact: Optional[Dict[str, Any]] = None

    def ingest(self, chunk: str) -> Optional[Dict[str, Any]]:
        self._buffer += chunk
        self._full_text_parts.append(chunk)

        # Process buffer for code fences
        event: Optional[Dict[str, Any]] = None
        while True:
            if not self._in_code_block:
                start = self._buffer.find("```")
                if start == -1:
                    break
                # Emit text before code fence, then enter code block
                lang = None
                # Find end of fence line
                fence_end = self._buffer.find("\n", start + 3)
                if fence_end == -1:
                    # Wait for newline
                    break
                lang = self._buffer[start + 3 : fence_end].strip() or None
                self._code_language = lang
                self._in_code_block = True
                # Remove up to fence_end
                self._buffer = self._buffer[fence_end + 1 :]
                self._code_buffer = []
            else:
                end = self._buffer.find("```")
                if end == -1:
                    # Accumulate until we find closing fence later
                    self._code_buffer.append(self._buffer)
                    self._buffer = ""
                    break
                # Capture code content until end
                code_content = "".join(self._code_buffer) + self._buffer[:end]
                artifact = {
                    "language": self._code_language or "",
                    "content": code_content,
                }
                self._last_artifact = artifact
                event = {"type": "artifact", "artifact": artifact}
                # Move buffer past closing fence
                self._buffer = self._buffer[end + 3 :]
                # Reset state
                self._in_code_block = False
                self._code_language = None
                self._code_buffer = []
                # Continue to see if more code blocks exist
        return event

    def get_full_text(self) -> str:
        return "".join(self._full_text_parts)

    def get_last_artifact(self) -> Optional[Dict[str, Any]]:
        return self._last_artifact
