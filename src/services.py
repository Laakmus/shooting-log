import math


def calculate_rounds(capacity: int, magazines_count: int | None = None, rounds_per_magazine: int | None = None,
                     rounds_fired: int | None = None):

    if all(x is None for x in (magazines_count, rounds_fired)):
        raise ValueError("Give a count of magazines and rounds fired")
    if rounds_per_magazine is None:
        rounds_per_magazine = capacity
    if magazines_count is None:
        magazines_count = math.ceil(rounds_fired / rounds_per_magazine)
    if rounds_fired is None:
        rounds_fired = magazines_count * rounds_per_magazine
    else:
        if math.ceil(rounds_fired/rounds_per_magazine) != magazines_count:
            raise ValueError("Count of magazines not equal number of rounds per magazine")

    return magazines_count, rounds_per_magazine, rounds_fired
