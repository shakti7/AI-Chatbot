from typing import Optional


def format_sse(data: str, event: Optional[str] = None, id: Optional[str] = None) -> bytes:
    lines = []
    if event:
        lines.append(f"event: {event}")
    if id:
        lines.append(f"id: {id}")
    for line in data.splitlines() or [data]:
        lines.append(f"data: {line}")
    lines.append("")  # end of message
    return ("\n".join(lines) + "\n").encode("utf-8")
