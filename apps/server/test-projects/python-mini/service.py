class Service:
    def run(self) -> str:
        return self._format("ok")

    def _format(self, s: str) -> str:
        return f"[{s}]"

