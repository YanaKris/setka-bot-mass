# Один образ для всех python-процессов проекта: api, worker (волна 4) и setka-mock (#6).
# Команда задаётся в docker-compose.yml, по умолчанию — api.
# Без переносов строк через "\": на Windows-чекауте с CRLF они ломают парсер Dockerfile.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Сначала только зависимости из pyproject.toml — слой кешируется, пока они не меняются.
COPY pyproject.toml ./
RUN pip install --no-cache-dir $(python -c 'import tomllib; print(" ".join(tomllib.load(open("pyproject.toml", "rb"))["project"]["dependencies"]))')

# Затем код: src/ (пакет setka_sender) и mock_setka/, когда появится. Исключения — в .dockerignore.
COPY . .
RUN pip install --no-cache-dir --no-deps .

RUN mkdir -p /data/uploads

EXPOSE 8000
CMD ["uvicorn", "setka_sender.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
