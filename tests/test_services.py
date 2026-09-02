import pytest

from src.services import calculate_rounds


@pytest.mark.parametrize(
    "kwargs, expected",
    [
        (dict(capacity=15, magazines_count=3), (3, 15, 45)),
        (dict(capacity=15,magazines_count=3, rounds_per_magazine=7), (3, 7, 21)),
        (dict(capacity=15,rounds_fired=100), (7, 15, 100)),
        (dict(capacity=15,rounds_fired=7), (1, 15, 7)),
        (dict(capacity=15,magazines_count=3, rounds_fired=45), (3, 15, 45)),
        (dict(capacity=15,magazines_count=1, rounds_fired=7), (1, 15, 7))
    ],
    ids=[
        "only-magazines",
        "magazines-with-explicit-rpm",
        "only-rounds",
        "only-rounds-partial-magazine",
        "both-consistent",
        "both-consistent-partial",
    ],
)
def test_calculate_rounds_returns_expected_values(kwargs, expected):
    assert calculate_rounds(**kwargs) == expected


@pytest.mark.parametrize(
    "kwargs, expected",
    [
        (dict(capacity=15, magazines_count=3, rounds_fired=100), ValueError),
        (dict(capacity=15), ValueError),
    ]
)
def test_calculate_rounds_raises_value_error(kwargs, expected):
    with pytest.raises(expected, match="of magazines"):
        calculate_rounds(**kwargs)

