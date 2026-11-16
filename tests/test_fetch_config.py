from gpu_terminal.fetch import LIVE_SKUS, SKUS


def test_live_skus_are_published_and_unique():
    assert set(LIVE_SKUS) <= set(SKUS)
    assert len(LIVE_SKUS) == len(set(LIVE_SKUS))
