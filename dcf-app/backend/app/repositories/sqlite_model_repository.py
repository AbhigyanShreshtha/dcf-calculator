import json
from datetime import UTC, datetime
from uuid import uuid4

from app.core.config import Settings
from app.db.database import get_connection
from app.schemas.models import SavedModelCreateRequest, SavedModelUpdateRequest, SavedValuationModel


class SQLiteValuationModelRepository:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def count_models(self) -> int:
        with get_connection(self.settings) as connection:
            row = connection.execute("SELECT COUNT(*) AS count FROM valuation_models").fetchone()
            return int(row["count"])

    def list_models(self) -> list[SavedValuationModel]:
        with get_connection(self.settings) as connection:
            rows = connection.execute(
                """
                SELECT id, name, description, default_scenario, scenarios_json, created_at, updated_at
                FROM valuation_models
                ORDER BY updated_at DESC
                """
            ).fetchall()
        return [self._deserialize_row(row) for row in rows]

    def get_model(self, model_id: str) -> SavedValuationModel | None:
        with get_connection(self.settings) as connection:
            row = connection.execute(
                """
                SELECT id, name, description, default_scenario, scenarios_json, created_at, updated_at
                FROM valuation_models
                WHERE id = ?
                """,
                (model_id,),
            ).fetchone()
        return self._deserialize_row(row) if row else None

    def create_model(self, payload: SavedModelCreateRequest) -> SavedValuationModel:
        timestamp = self._timestamp()
        saved_model = SavedValuationModel(
            id=str(uuid4()),
            name=payload.name,
            description=payload.description,
            default_scenario=payload.default_scenario,
            scenarios=payload.scenarios,
            created_at=timestamp,
            updated_at=timestamp,
        )
        with get_connection(self.settings) as connection:
            connection.execute(
                """
                INSERT INTO valuation_models (id, name, description, default_scenario, scenarios_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    saved_model.id,
                    saved_model.name,
                    saved_model.description,
                    saved_model.default_scenario,
                    json.dumps([scenario.model_dump(mode="json") for scenario in saved_model.scenarios]),
                    saved_model.created_at,
                    saved_model.updated_at,
                ),
            )
        return saved_model

    def update_model(self, model_id: str, payload: SavedModelUpdateRequest) -> SavedValuationModel | None:
        existing = self.get_model(model_id)
        if existing is None:
            return None

        updated_model = existing.model_copy(
            update={
                "name": payload.name,
                "description": payload.description,
                "default_scenario": payload.default_scenario,
                "scenarios": payload.scenarios,
                "updated_at": self._timestamp(),
            }
        )

        with get_connection(self.settings) as connection:
            connection.execute(
                """
                UPDATE valuation_models
                SET name = ?, description = ?, default_scenario = ?, scenarios_json = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    updated_model.name,
                    updated_model.description,
                    updated_model.default_scenario,
                    json.dumps([scenario.model_dump(mode="json") for scenario in updated_model.scenarios]),
                    updated_model.updated_at,
                    model_id,
                ),
            )
        return updated_model

    def delete_model(self, model_id: str) -> bool:
        with get_connection(self.settings) as connection:
            cursor = connection.execute("DELETE FROM valuation_models WHERE id = ?", (model_id,))
        return cursor.rowcount > 0

    def duplicate_model(self, model_id: str) -> SavedValuationModel | None:
        existing = self.get_model(model_id)
        if existing is None:
            return None

        duplicate_payload = SavedModelCreateRequest(
            name=f"{existing.name} (Copy)",
            description=existing.description,
            default_scenario=existing.default_scenario,
            scenarios=[scenario.model_copy(deep=True) for scenario in existing.scenarios],
        )
        return self.create_model(duplicate_payload)

    @staticmethod
    def _timestamp() -> str:
        return datetime.now(UTC).isoformat()

    @staticmethod
    def _deserialize_row(row: object) -> SavedValuationModel:
        row_dict = dict(row)
        return SavedValuationModel.model_validate(
            {
                "id": row_dict["id"],
                "name": row_dict["name"],
                "description": row_dict["description"],
                "default_scenario": row_dict["default_scenario"],
                "scenarios": json.loads(row_dict["scenarios_json"]),
                "created_at": row_dict["created_at"],
                "updated_at": row_dict["updated_at"],
            }
        )

