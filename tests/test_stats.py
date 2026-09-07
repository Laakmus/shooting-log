def test_stats_empty_database_returns_zeros(client):
    response = client.get("/stats/")
    assert response.status_code == 200
    assert response.json()["total"]["ammo_cost"] == '0'
    assert response.json()["total"]["equipment_cost"] == '0'
    assert response.json()["total"]["training_sessions_cost"] == '0'
    assert response.json()["total"]["total_cost"] == '0'
    assert response.json()["monthly"] == []


def test_stats_sums_single_training(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17,
                                               "purchase_price": 3500}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-04-22", "cost": 80}).json()["id"]
    entry = client.post(f"/training/{training_id}/weapons/",
                        json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 120.50})
    assert entry.status_code == 201

    response = client.get("/stats/")
    assert response.status_code == 200
    total = response.json()["total"]
    assert total["ammo_cost"] == '120.50'
    assert total["training_sessions_cost"] == '80.00'
    assert total["equipment_cost"] == '3500.00'
    assert total["total_cost"] == '3700.50'


def test_stats_groups_by_month_in_order(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17,
                                               "purchase_price": 3500}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-04-22", "cost": 80}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-05-22", "cost": 100}).json()["id"]
    first = client.post(f"/training/{training_1_id}/weapons/",
                        json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 60.00})
    second = client.post(f"/training/{training_2_id}/weapons/",
                         json={"weapon_id": weapon_id, "rounds_fired": 30, "ammo_cost": 40.00})
    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get("/stats/")
    assert response.status_code == 200
    monthly = response.json()["monthly"]
    assert len(monthly) == 2
    assert monthly[0]["month"] == "2026-04"
    assert monthly[1]["month"] == "2026-05"
    assert monthly[0]["training_sessions_cost"] == '80.00'
    assert monthly[1]["ammo_cost"] == '40.00'


def test_stats_does_not_multiply_range_fee_by_entries(client):
    weapon_id_1 = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17,
                                                 "purchase_price": 3500}).json()["id"]
    weapon_id_2 = client.post("/weapons/", json={"name": "Glock 19", "magazine_capacity": 15,
                                                 "purchase_price": 3300}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-04-22", "cost": 50}).json()["id"]
    first = client.post(f"/training/{training_id}/weapons/",
                        json={"weapon_id": weapon_id_1, "rounds_fired": 45, "ammo_cost": 100.00})
    second = client.post(f"/training/{training_id}/weapons/",
                         json={"weapon_id": weapon_id_2, "rounds_fired": 30, "ammo_cost": 70.00})
    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get("/stats/")
    assert response.status_code == 200
    monthly = response.json()["monthly"]
    assert monthly[0]["training_sessions_cost"] == '50.00'
    assert monthly[0]["ammo_cost"] == '170.00'
