# Тесты

Команды — `make test` / `make cov`, полный список в [README проекта](../README.md#разработка). На Windows без Docker `PYTHON ?= python3` в `Makefile` может утечь в системный Python, а не в `.venv` — передавай `PYTHON=.venv\Scripts\python.exe` (или активируй venv и используй `PYTHON=python`).

## Пирамида

| Каталог | Что тестирует | Инфраструктура | Маркер |
|---|---|---|---|
| `unit/` | сервисы, клиенты, роуты — на фейках и `respx` | не нужна | — |
| `integration/` | репозитории, publisher/consumer — против настоящих postgres/rabbitmq | docker-compose локально, service containers в CI | `@pytest.mark.integration` |
| `e2e/` | сквозной сценарий: кампания → start → воркер отправил → статусы/`sent_log` | весь compose + mock «Сетки» | появится с [#15](https://github.com/YanaKris/setka-bot-mass/issues/15) |

`integration/conftest.py` сам скипает тесты, если не заданы настройки приложения (переменные окружения или файл `.env` в корне репозитория; создаётся копированием [.env.example](../.env.example)) или postgres недоступен (TCP-коннект на хост:порт из `DATABASE_URL`) — локально без compose `make test` остаётся зелёным, просто с пропусками; в CI и в поднятом compose эти же тесты реально выполняются.

## Куда класть новый тест

- Функция/класс без реальной БД, брокера или сети → `unit/`; внешние зависимости — фейки или `respx.mock` (пример: [test_respx_example.py](unit/test_respx_example.py)).
- Нужен настоящий postgres или rabbitmq → `integration/`, обязательно `pytestmark = pytest.mark.integration`; URL БД бери из фикстуры `database_url` (читает `DATABASE_URL` из `Settings`), свой в тесте не хардкодь.
- Сквозной пользовательский сценарий целиком → `e2e/` (каталог появится вместе с первым таким тестом).
- Общая фикстура для нескольких каталогов → корневой [conftest.py](conftest.py); фикстура для одного каталога — свой `conftest.py` внутри него.
