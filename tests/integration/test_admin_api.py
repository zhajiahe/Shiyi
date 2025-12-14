"""
管理员 API 集成测试
"""

import uuid

from fastapi import status
from fastapi.testclient import TestClient


class TestAdminAPI:
    """管理员 API 测试"""

    def test_toggle_featured(self, client: TestClient, auth_headers: dict):
        """测试设置精选"""
        # 先创建一个共享牌组
        shared_deck_id = self._create_shared_deck(client, auth_headers)

        # 设置为精选
        response = client.put(
            f"/api/v1/admin/shared-decks/{shared_deck_id}/feature?featured=true",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_featured"] is True

        # 取消精选
        response = client.put(
            f"/api/v1/admin/shared-decks/{shared_deck_id}/feature?featured=false",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["is_featured"] is False

    def test_toggle_official(self, client: TestClient, auth_headers: dict):
        """测试设置官方推荐"""
        shared_deck_id = self._create_shared_deck(client, auth_headers)

        # 设置为官方推荐
        response = client.put(
            f"/api/v1/admin/shared-decks/{shared_deck_id}/official?official=true",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_official"] is True

        # 取消官方推荐
        response = client.put(
            f"/api/v1/admin/shared-decks/{shared_deck_id}/official?official=false",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["is_official"] is False

    def test_toggle_active(self, client: TestClient, auth_headers: dict):
        """测试上架/下架"""
        shared_deck_id = self._create_shared_deck(client, auth_headers)

        # 下架
        response = client.put(
            f"/api/v1/admin/shared-decks/{shared_deck_id}/active?active=false",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_active"] is False

        # 上架
        response = client.put(
            f"/api/v1/admin/shared-decks/{shared_deck_id}/active?active=true",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["is_active"] is True

    def test_get_system_stats(self, client: TestClient, auth_headers: dict):
        """测试获取系统统计"""
        response = client.get(
            "/api/v1/admin/stats",
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "user_count" in data["data"]
        assert "shared_deck_count" in data["data"]
        assert "active_shared_deck_count" in data["data"]
        assert "note_model_count" in data["data"]
        assert "total_downloads" in data["data"]
        assert data["data"]["user_count"] >= 1  # 至少有管理员

    def test_unauthorized_access(self, client: TestClient):
        """测试未授权访问"""
        response = client.get("/api/v1/admin/stats")
        # 没有 token 或 token 无效时返回 401 或 403
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_non_superuser_access(self, client: TestClient):
        """测试非管理员访问被拒绝"""
        # 创建普通用户
        unique_id = uuid.uuid4().hex[:8]
        client.post(
            "/api/v1/auth/register",
            json={
                "username": f"normaluser_{unique_id}",
                "email": f"normal_{unique_id}@example.com",
                "nickname": "Normal User",
                "password": "password123",
            },
        )

        # 登录普通用户
        response = client.post(
            "/api/v1/auth/login",
            json={"username": f"normaluser_{unique_id}", "password": "password123"},
        )
        token = response.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 尝试访问管理员接口
        response = client.get("/api/v1/admin/stats", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def _create_shared_deck(self, client: TestClient, auth_headers: dict) -> str:
        """辅助方法：创建共享牌组并返回 ID"""
        unique_id = uuid.uuid4().hex[:8]

        # 创建笔记类型
        response = client.post(
            "/api/v1/note-models",
            json={
                "name": f"TestModel_{unique_id}",
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
            json={"name": f"TestDeck_{unique_id}", "note_model_id": note_model_id},
            headers=auth_headers,
        )
        deck_id = response.json()["data"]["id"]

        # 创建笔记
        client.post(
            "/api/v1/notes",
            json={
                "deck_id": deck_id,
                "note_model_id": note_model_id,
                "fields": {"Front": "Q", "Back": "A"},
                "tags": [],
            },
            headers=auth_headers,
        )

        # 发布为共享牌组
        response = client.post(
            f"/api/v1/decks/{deck_id}/publish",
            json={
                "slug": f"test-deck-{unique_id}",
                "title": f"Test Deck {unique_id}",
            },
            headers=auth_headers,
        )
        return response.json()["data"]["id"]
