"""Minimal in-process helper. NOT a database and NOT a fallback store.

Hindsight is the only persistent memory. This just remembers, for the lifetime of
the process, the titles of decisions recorded through this server so outcome
memories can say "DEC-006 (Introduce asynchronous processing)". Losing it on
restart costs nothing; Hindsight still has everything.
"""
from __future__ import annotations

from collections import OrderedDict
from typing import Optional


class LocalMemory:
    def __init__(self, max_items: int = 200) -> None:
        self._titles: OrderedDict[str, str] = OrderedDict()
        self._max = max_items

    def remember_title(self, decision_id: str, title: str) -> None:
        self._titles[decision_id] = title
        self._titles.move_to_end(decision_id)
        while len(self._titles) > self._max:
            self._titles.popitem(last=False)

    def title_for(self, decision_id: str) -> Optional[str]:
        return self._titles.get(decision_id)
