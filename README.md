# setka-bot-mass

Инструмент массовой рассылки личных сообщений с PDF-вложением через API «Сетки».

Находит людей по фильтру (профессия, статус, уровень связи) и отправляет им сообщение с PDF. Умеет ограничивать количество отправок, не пишет тем, кому уже отправляли, и поддерживает тестовую отправку конкретному пользователю.

**Стек:** Python 3.12 · FastAPI (+ Scalar UI) · PostgreSQL · RabbitMQ · Docker Compose

## Документация

- **[Wiki](https://github.com/YanaKris/setka-bot-mass/wiki)** — описание проекта: архитектура, схема данных, REST API, спецификация API «Сетки».
- **[Issues](https://github.com/YanaKris/setka-bot-mass/issues)** — задачи с критериями приёмки.
- **[CLAUDE.md](CLAUDE.md)** — стандарты разработки: TDD, SOLID, DRY, пороги покрытия, работа с ветками и PR.

## Запуск

Перед первым запуском:

```bash
cp .env.example .env
```

```bash
docker compose up -d api setka-mock
```

Проверка: `curl localhost:8000/health` отвечает, Scalar UI — на [localhost:8000/docs](http://localhost:8000/docs), мок «Сетки» — на `localhost:8001`.

Остановить и удалить контейнеры (том `uploads` сохраняется):

```bash
docker compose down
```

## Разработка

```bash
make install-dev   # инструменты: pytest, pytest-cov, ruff, diff-cover
make test          # быстрый прогон тестов
make cov           # тесты + покрытие, порог 85% (html-отчёт в htmlcov/)
make lint          # ruff check + ruff format --check
make fmt           # автоисправление
make test-scripts  # тесты node-скриптов авто-ревью
make check         # всё, что гоняет CI
```

Конфигурация линтера — [ruff.toml](ruff.toml).

### CI

На каждый PR (кроме draft) запускаются два workflow:

| Workflow | Что делает |
|---|---|
| [tests.yml](.github/workflows/tests.yml) | `ruff` (линтер + формат), `pytest` с покрытием, `diff-cover` по изменённому коду, тесты node-скриптов. Публикует отчёт в job summary и одним обновляемым комментарием в PR. |
| [auto-review.yml](.github/workflows/auto-review.yml) | Ревью PR через Claude Code: подтягивает привязанный issue и проверяет, выполнены ли его критерии приёмки. |

Gate (падает джоба): упавшие тесты, покрытие ниже 85%, замечания `ruff`, изменение Python-кода без единого теста в `tests/`. Покрытие изменённого кода (`diff-cover`) публикуется информативно.

Сервисы `postgres` и `rabbitmq` поднимаются в CI как service containers — интеграционные тесты (`@pytest.mark.integration`) работают без дополнительных шагов.

### Авто-ревью

`scripts/auto-review.mjs` запускает Claude Code CLI, кладёт результат одним комментарием в PR и обновляет его на каждый новый коммит: наверху — актуальный чек-лист для разработчика, под ним — история итераций. Критерии приёмки ревью берёт из привязанного issue (правила привязки — в [CLAUDE.md](CLAUDE.md)), стандарты — из него же.

Джоба идёт на self-hosted раннере с метками `self-hosted` и `claude-review`. Авторизация Claude живёт на самой машине раннера, секретов с ключами в репозитории не нужно, `GITHUB_TOKEN` выдаётся Actions автоматически.

Что должно быть на машине раннера:

- зарегистрированный для этого репозитория раннер (Settings → Actions → Runners → New self-hosted runner) с меткой `claude-review`;
- установленные `node` и `gh`;
- авторизованный `claude` — разово `claude login` под тем пользователем, от которого запускается служба раннера (`~/.claude` читается именно из его домашнего каталога).

Если раннер недоступен, джоба будет висеть в очереди; если `claude` на нём не авторизован — упадёт с `claude exited with 1`, а в логе будет подсказка с вариантами (в том числе секреты `ANTHROPIC_API_KEY` / `CLAUDE_CODE_OAUTH_TOKEN`, если понадобится запускать ревью на `ubuntu-latest`).
