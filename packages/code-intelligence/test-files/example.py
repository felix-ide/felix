
#!/usr/bin/env python3
"""Python test module for parser integration."""

import asyncio
from typing import List, Optional
from dataclasses import dataclass

@dataclass
class User:
    """User data class."""
    id: int
    name: str
    email: str

    def get_display_name(self) -> str:
        """Get formatted display name."""
        return f"{self.name} <{self.email}>"

class UserService:
    """Service for managing users."""

    def __init__(self, db_connection):
        self.db = db_connection
        self._cache = {}

    async def get_user(self, user_id: int) -> Optional[User]:
        """Fetch user by ID."""
        if user_id in self._cache:
            return self._cache[user_id]

        result = await self.db.fetch_one(
            "SELECT * FROM users WHERE id = ?", user_id
        )
        if result:
            user = User(**result)
            self._cache[user_id] = user
            return user
        return None

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format."""
        return "@" in email

async def main():
    """Main entry point."""
    service = UserService(None)
    user = await service.get_user(1)
    if user:
        print(user.get_display_name())

if __name__ == "__main__":
    asyncio.run(main())
