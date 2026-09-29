import os

from hindsight_client import Hindsight


class HindsightAdapter:
    """
    Adapter around the Hindsight Python client.

    This is the production memory implementation.
    """

    def __init__(
        self,
        base_url: str | None = None,
        bank_id: str | None = None,
    ):
        configured_url = base_url or os.getenv(
            "HINDSIGHT_URL", "http://localhost:8888"
        )
        configured_bank_id = bank_id or os.getenv(
            "HINDSIGHT_BANK_ID", "decision-arch"
        )
        api_key = os.getenv("HINDSIGHT_API_KEY")

        client_options = {"base_url": configured_url}
        if api_key:
            client_options["api_key"] = api_key

        self.client = Hindsight(**client_options)

        self.bank_id = configured_bank_id

    def retain(self, content: str):
        return self.client.retain(
            bank_id=self.bank_id,
            content=content,
        )

    def close(self):
        """Close the SDK's underlying HTTP client."""
        self.client.close()

    def __enter__(self):
        self.client.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return self.client.__exit__(exc_type, exc_value, traceback)

    def recall(self, query: str):
        response = self.client.recall(
            bank_id=self.bank_id,
            query=query,
        )

        # hindsight-client 0.10.1 returns RecallResponse, whose results
        # contain RecallResult objects. Keep the SDK response structure intact
        # for MemoryEngine to normalize from the documented model fields.
        return response.results

    def reflect(self, query: str):
        return self.client.reflect(
            bank_id=self.bank_id,
            query=query,
            include_facts=True,
        )
