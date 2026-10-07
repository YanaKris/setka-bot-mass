from email.message import EmailMessage
from email.parser import BytesParser
from email.policy import HTTP

import httpx


def _multipart_fields(request: httpx.Request) -> dict[str, EmailMessage]:
    """Разбирает multipart/form-data отправленного запроса на поля по имени.

    Надёжнее поиска подстрок в сыром теле: проверяется значение конкретного
    поля по имени, поэтому совпадение куска из соседнего поля не пройдёт.
    """
    head = f"Content-Type: {request.headers['content-type']}\r\n\r\n".encode()
    message = BytesParser(policy=HTTP).parsebytes(head + request.content)
    return {
        part.get_param("name", header="content-disposition"): part for part in message.iter_parts()
    }


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
    request = route.calls.last.request
    assert request.headers["content-type"].startswith("multipart/form-data")

    fields = _multipart_fields(request)
    assert fields["recipient_id"].get_content() == "u_1"
    assert fields["text"].get_content() == "hello"
    assert fields["file"].get_filename() == "resume.pdf"
    assert fields["file"].get_content_type() == "application/pdf"
    assert fields["file"].get_payload(decode=True) == b"%PDF-1.4 fake"
