import pytest

pytestmark = pytest.mark.integration


def test_postgres_is_reachable_when_not_skipped(postgres_reachable):
    assert postgres_reachable
