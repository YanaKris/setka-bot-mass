import httpx


async def test_respx_asserts_on_sent_multipart_body(respx_mock):
    route = respx_mock.post("https://example.test/messages").mock(
        return_value=httpx.Response(201, json={"message_id": "m_1"})
    )

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://example.test/messages",
            data={"recipient_id": "u_1", "text": "hello"},
            files={"file": ("resume.pdf", b"%PDF-1.4 fake", "application/pdf")},
        )

    assert response.status_code == 201
    assert response.json() == {"message_id": "m_1"}

    assert route.called
    sent_body = route.calls.last.request.content.decode("latin-1")
    assert 'name="recipient_id"' in sent_body
    assert "u_1" in sent_body
    assert 'name="file"; filename="resume.pdf"' in sent_body
    assert "application/pdf" in sent_body
