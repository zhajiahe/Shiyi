"""
批量笔记创建 API 集成测试
"""

import uuid

from fastapi import status
from fastapi.testclient import TestClient


class TestNoteBatchAPI:
    """批量笔记创建测试"""

    def test_batch_create_notes_success(self, client: TestClient, auth_headers: dict):
        """测试批量创建笔记成功"""
        deck_id, note_model_id = self._create_deck_and_model(client, auth_headers)

        payload = {
            "deck_id": deck_id,
            "note_model_id": note_model_id,
            "source_type": "import",
            "notes": [
                {"fields": {"Front": "Hello", "Back": "你好"}, "tags": ["greeting"]},
                {"fields": {"Front": "World", "Back": "世界"}, "tags": ["basic"]},
                {"fields": {"Front": "Apple", "Back": "苹果"}, "tags": ["fruit"]},
            ],
        }

        response = client.post(
            "/api/v1/notes/batch",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["success"] is True
        assert data["data"]["created_count"] == 3
        assert data["data"]["skipped_count"] == 0
        assert data["data"]["error_count"] == 0
        assert len(data["data"]["created_ids"]) == 3

    def test_batch_create_notes_deduplication(self, client: TestClient, auth_headers: dict):
        """测试批量创建时去重"""
        deck_id, note_model_id = self._create_deck_and_model(client, auth_headers)

        # 先创建一批笔记
        payload = {
            "deck_id": deck_id,
            "note_model_id": note_model_id,
            "source_type": "import",
            "notes": [
                {"fields": {"Front": "Cat", "Back": "猫"}, "tags": []},
            ],
        }
        response = client.post("/api/v1/notes/batch", json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["data"]["created_count"] == 1

        # 再次创建相同内容（应该被跳过）
        response = client.post("/api/v1/notes/batch", json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["data"]["created_count"] == 0
        assert data["data"]["skipped_count"] == 1

    def test_batch_create_notes_invalid_deck(self, client: TestClient, auth_headers: dict):
        """测试无效牌组"""
        _, note_model_id = self._create_deck_and_model(client, auth_headers)

        payload = {
            "deck_id": "non-existent-deck-id",
            "note_model_id": note_model_id,
            "source_type": "import",
            "notes": [{"fields": {"Front": "Test", "Back": "测试"}, "tags": []}],
        }

        response = client.post("/api/v1/notes/batch", json=payload, headers=auth_headers)
        # 可能返回 400 或 404
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

    def test_batch_create_notes_invalid_note_model(self, client: TestClient, auth_headers: dict):
        """测试无效笔记类型"""
        deck_id, _ = self._create_deck_and_model(client, auth_headers)

        payload = {
            "deck_id": deck_id,
            "note_model_id": "non-existent-model-id",
            "source_type": "import",
            "notes": [{"fields": {"Front": "Test", "Back": "测试"}, "tags": []}],
        }

        response = client.post("/api/v1/notes/batch", json=payload, headers=auth_headers)
        # 可能返回 400 或 404
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

    def test_batch_create_notes_empty_list(self, client: TestClient, auth_headers: dict):
        """测试空笔记列表"""
        deck_id, note_model_id = self._create_deck_and_model(client, auth_headers)

        payload = {
            "deck_id": deck_id,
            "note_model_id": note_model_id,
            "source_type": "import",
            "notes": [],
        }

        response = client.post("/api/v1/notes/batch", json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_batch_create_notes_unauthorized(self, client: TestClient):
        """测试未授权访问"""
        payload = {
            "deck_id": "some-deck-id",
            "note_model_id": "some-model-id",
            "source_type": "import",
            "notes": [{"fields": {"Front": "Test", "Back": "测试"}, "tags": []}],
        }

        response = client.post("/api/v1/notes/batch", json=payload)
        # 没有 token 或 token 无效时返回 401 或 403
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def _create_deck_and_model(self, client: TestClient, auth_headers: dict) -> tuple[str, str]:
        """辅助方法：创建牌组和笔记类型"""
        unique_id = uuid.uuid4().hex[:8]

        # 创建笔记类型
        response = client.post(
            "/api/v1/note-models",
            json={
                "name": f"BatchTestModel_{unique_id}",
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
            json={"name": f"BatchTestDeck_{unique_id}"},
            headers=auth_headers,
        )
        deck_id = response.json()["data"]["id"]

        return deck_id, note_model_id
