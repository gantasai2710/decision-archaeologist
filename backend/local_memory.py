class LocalMemory:
    """
    Temporary local memory implementation.

    Used only for backend development while the Gemini quota
    is unavailable.

    This is NOT the final memory system.
    """

    def __init__(self):
        self.memories = []

    def retain(self, content: str, metadata: dict | None = None):
        memory = {
            "content": content,
            "metadata": metadata or {}
        }

        self.memories.append(memory)

        return {
            "success": True,
            "memory_status": "retained",
            "items_count": 1
        }

    def recall(self, query: str):
        """
        Very simple development-only retrieval.

        It allows us to test the backend contract without
        making Gemini/Hindsight calls.
        """

        query_words = set(query.lower().split())

        results = []

        for memory in self.memories:
            content = memory["content"].lower()

            score = sum(
                1 for word in query_words
                if len(word) > 3 and word in content
            )

            if score > 0:
                results.append({
                    "content": memory["content"],
                    "metadata": memory["metadata"],
                    "score": score
                })

        results.sort(
            key=lambda item: item["score"],
            reverse=True
        )

        return results

    def reflect(self, query: str):
        """
        Reflection is intentionally unavailable in local mode.

        Real reflection will be performed by Hindsight.
        """

        return {
            "success": False,
            "status": "unavailable",
            "message": (
                "Reflection requires the Hindsight/Gemini "
                "memory engine."
            )
        }