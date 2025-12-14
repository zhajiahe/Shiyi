"""
牌组发布 API 集成测试
"""

import uuid

from fastapi import status
from fastapi.testclient import TestClient


class TestDeckPublishAPI:
    """牌组发布测试"""

    def test_publish_deck_success(self, client: TestClient, auth_headers: dict):
        """测试发布牌组成功"""
        deck_id, _ = self._create_deck_with_content(client, auth_headers)
        unique_slug = f"publish-test-deck-{uuid.uuid4().hex[:8]}"

        payload = {
            "slug": unique_slug,
            "title": "Published Test Deck",
            "description": "This is a published deck",
            "language": "en",
            "tags": ["test", "published"],
        }

        response = client.post(
            f"/api/v1/decks/{deck_id}/publish",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["success"] is True
        assert data["data"]["slug"] == unique_slug
        assert data["data"]["title"] == "Published Test Deck"
        assert data["data"]["version"] == 1
        assert data["data"]["note_count"] >= 1
        assert data["data"]["card_count"] >= 1
        assert data["data"]["is_active"] is True

    def test_publish_deck_duplicate_slug(self, client: TestClient, auth_headers: dict):
        """测试重复 slug"""
        deck_id, _ = self._create_deck_with_content(client, auth_headers)
        unique_slug = f"duplicate-slug-test-{uuid.uuid4().hex[:8]}"

        payload = {"slug": unique_slug, "title": "First Deck"}

        # 第一次发布成功
        response = client.post(
            f"/api/v1/decks/{deck_id}/publish",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_201_CREATED

        # 创建另一个牌组
        deck_id2, _ = self._create_deck_with_content(client, auth_headers)

        # 第二次发布相同 slug 应失败
        response = client.post(
            f"/api/v1/decks/{deck_id2}/publish",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_publish_deck_not_found(self, client: TestClient, auth_headers: dict):
        """测试发布不存在的牌组"""
        payload = {
            "slug": f"non-existent-deck-{uuid.uuid4().hex[:8]}",
            "title": "Non-existent Deck",
        }

        response = client.post(
            "/api/v1/decks/non-existent-id/publish",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_publish_deck_unauthorized(self, client: TestClient):
        """测试未授权发布"""
        payload = {
            "slug": f"unauthorized-deck-{uuid.uuid4().hex[:8]}",
            "title": "Unauthorized Deck",
        }

        response = client.post(
            "/api/v1/decks/some-deck-id/publish",
            json=payload,
        )
        # 没有 token 或 token 无效时返回 401 或 403
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def _create_deck_with_content(self, client: TestClient, auth_headers: dict) -> tuple[str, str]:
        """辅助方法：创建带内容的牌组"""
        unique_id = uuid.uuid4().hex[:8]

        # 创建笔记类型
        response = client.post(
            "/api/v1/note-models",
            json={
                "name": f"PublishTestModel_{unique_id}",
                "fields_schema": [
                    {"name": "Front", "ord": 0},
                    {"name": "Back", "ord": 1},
                ],
                "css": "",
            },
            headers=auth_headers,
        )
        note_model_id = response.json()["data"]["id"]

        # 创建卡片模板
        client.post(
            f"/api/v1/note-models/{note_model_id}/templates",
            json={
                "name": "Card 1",
                "question_template": "{{Front}}",
                "answer_template": "{{Back}}",
            },
            headers=auth_headers,
        )

        # 创建牌组
        response = client.post(
            "/api/v1/decks",
            json={"name": f"PublishTestDeck_{unique_id}", "note_model_id": note_model_id},
            headers=auth_headers,
        )
        deck_id = response.json()["data"]["id"]

        # 创建笔记
        client.post(
            "/api/v1/notes",
            json={
                "deck_id": deck_id,
                "note_model_id": note_model_id,
                "fields": {"Front": "Question", "Back": "Answer"},
                "tags": ["test"],
            },
            headers=auth_headers,
        )

        return deck_id, note_model_id
