from app.schemas.models import SavedModelCreateRequest


def test_calculate_endpoint(client: object, base_assumptions) -> None:
    response = client.post("/api/v1/dcf/calculate", json=base_assumptions.model_dump(mode="json"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["company_name"] == "TestCo"
    assert payload["intrinsic_value_per_share"] > 0
    assert len(payload["forecast_rows"]) == base_assumptions.forecast_years


def test_save_and_load_model_endpoints(client: object, base_assumptions) -> None:
    payload = SavedModelCreateRequest(
        name="Test Model",
        description="Integration test model",
        default_scenario="base",
        scenarios=[base_assumptions],
    )

    create_response = client.post("/api/v1/models", json=payload.model_dump(mode="json"))
    assert create_response.status_code == 201
    model_id = create_response.json()["id"]

    get_response = client.get(f"/api/v1/models/{model_id}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Test Model"

    list_response = client.get("/api/v1/models")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
