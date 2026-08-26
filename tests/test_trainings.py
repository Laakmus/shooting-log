from datetime import date, timedelta


def test_create_training_session_success(client):
    response = client.post("/training/", json={"training_date":"2026-08-25",
                                                "place":"Waldorfa 23",
                                                "cost": 87,
                                                "note": "Teoria UoBiA"})
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["cost"] == '87.00'
    assert data["note"] == "Teoria UoBiA"


def test_create_training_session_without_cost_returns_422(client):
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    response = client.post("/training/", json={"training_date":tomorrow,})
    assert response.status_code == 422


def test_create_training_session_with_future_date_returns_422(client):
    response = client.post("/training/", json={"training_date": "2040-08-25",
                                               "place": "Waldorfa 23",
                                               "cost": 87,
                                               "note": "Teoria UoBiA"})
    assert response.status_code == 422


def test_create_training_session_with_today_date_success(client):
    response = client.post("/training/", json={"training_date": date.today().isoformat(), "cost": 87})

    assert response.status_code == 201
    assert response.json()["id"] is not None


def test_get_all_training_sessions_empty_list(client):
    response = client.get("/training/")
    assert response.status_code == 200
    assert response.json() == []


def test_get_all_training_sessions_returns_all(client):
    for training in range(3):
        client.post("/training/", json={"training_date": f"2026-08-{20+training}", "cost": 87})

    response = client.get("/training/")
    assert response.status_code == 200
    assert len(response.json()) > 2

def test_get_training_session_by_id(client):
    training = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87})
    response = client.get(f"/training/{training.json()['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == training.json()["id"]


def test_get_nonexistent_training_session_returns_404(client):
    response = client.get("/training/99999999")
    assert response.status_code == 404

def test_patch_changes_only_given_field(client):
    training = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87})

    response = client.patch(f"/training/{training.json()['id']}", json={"note": "test changed"})
    assert response.status_code == 200
    assert response.json()["note"] == "test changed"
    assert response.json()["training_date"] == training.json()["training_date"]
    assert response.json()["cost"] == training.json()["cost"]
    assert response.json()["place"] == training.json()["place"]


def test_patch_with_future_date_returns_422(client):
    training = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87})
    response = client.patch(f"/training/{training.json()['id']}/", json={"training_date": "2222-08-23"})
    assert response.status_code == 422

def test_patch_nonexistent_training_session_returns_404(client):
    response = client.patch("/training/99999999", json={"training_date": "2026-08-25", "cost": 87})
    assert response.status_code == 404

def test_delete_training_session_and_check_data_after_deleted(client):
    training = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87})
    training_id = training.json()["id"]
    assert training.status_code == 201
    response = client.delete(f"/training/{training_id}")
    assert response.status_code == 204
    check_database = client.get(f"/training/{training.json()['id']}")
    assert check_database.status_code == 404
