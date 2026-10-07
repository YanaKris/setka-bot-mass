# Один образ для всех python-процессов проекта: api, worker (волна 4) и setka-mock (#6).
# Команда задаётся в docker-compose.yml, по умолчанию — api.
# Без переносов строк через "\": на Windows-чекауте с CRLF они ломают парсер Dockerfile.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Код: src/ (пакет setka_sender) и mock_setka/, когда появится. Исключения — в .dockerignore.
# Зависимости ставятся вместе с пакетом из pyproject.toml — один источник правды, без requirements.txt.
COPY . .
RUN pip install --no-cache-dir .

# Процессы идут не от root: сервис принимает PDF от пользователя и пишет их в /data/uploads.
RUN useradd --system --uid 1000 app && mkdir -p /data/uploads && chown app /data/uploads
USER app

EXPOSE 8000
CMD ["uvicorn", "setka_sender.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
