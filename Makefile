PYTHON ?= python3
COVERAGE_MIN ?= 85
COV_ARGS = --cov=src $(if $(wildcard mock_setka),--cov=mock_setka,)

.PHONY: help install-dev lint fmt test cov test-scripts check clean

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-13s\033[0m %s\n", $$1, $$2}'

install-dev:
	$(PYTHON) -m pip install -r requirements-dev.txt
	@[ -f pyproject.toml ] && $(PYTHON) -m pip install -e . || true

lint:
	$(PYTHON) -m ruff check .
	$(PYTHON) -m ruff format --check .

fmt:
	$(PYTHON) -m ruff format .
	$(PYTHON) -m ruff check --fix .

test:
	$(PYTHON) -m pytest -q

cov:
	$(PYTHON) -m pytest -q $(COV_ARGS) \
		--cov-report=term-missing --cov-report=html --cov-fail-under=$(COVERAGE_MIN)

test-scripts:
	node --test 'scripts/**/*.test.mjs'

check: lint cov test-scripts

clean:
	find . -path ./.venv -prune -o -type d -name __pycache__ -exec rm -rf {} +
	rm -rf .pytest_cache .ruff_cache htmlcov .coverage coverage.xml
