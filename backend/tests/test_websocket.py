import pytest
from app.websocket_manager import ConnectionManager


class MockWebSocket:
    def __init__(self):
        self.accepted = False
        self.sent_messages = []

    async def accept(self):
        self.accepted = True

    async def send_text(self, text: str):
        self.sent_messages.append(text)


@pytest.mark.asyncio
async def test_websocket_manager_lifecycle():
    cm = ConnectionManager()
    assert cm.client_count == 0

    ws1 = MockWebSocket()
    ws2 = MockWebSocket()

    await cm.connect(ws1)
    assert ws1.accepted is True
    assert cm.client_count == 1
    assert len(ws1.sent_messages) == 1  # welcome message

    await cm.connect(ws2)
    assert cm.client_count == 2

    # Broadcast
    test_msg = {"type": "ping", "data": "test_payload"}
    await cm.broadcast(test_msg)

    assert any("test_payload" in m for m in ws1.sent_messages)
    assert any("test_payload" in m for m in ws2.sent_messages)

    # Disconnect
    await cm.disconnect(ws1)
    assert cm.client_count == 1

    await cm.disconnect(ws2)
    assert cm.client_count == 0
