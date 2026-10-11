def test_stats_counts_empty_database_returns_zeros(client):
    response = client.get("/stats/")
    assert response.status_code == 200
    assert response.json()["total"]["total_rounds"] == 0
    assert response.json()["total"]["sessions_count"] == 0
    assert response.json()["monthly"] == []


def test_stats_counts_trainings_without_entries_count_as_sessions(client):
    client.post("/training/", json={"training_date": "2026-04-22", "cost": 80})
    client.post("/training/", json={"training_date": "2026-04-25", "cost": 60})

    response = client.get("/stats/")
    assert response.status_code == 200
    assert response.json()["total"]["sessions_count"] == 2
    assert response.json()["total"]["total_rounds"] == 0
    monthly = response.json()["monthly"]
    assert len(monthly) == 1
    assert monthly[0]["month"] == "2026-04"
    assert monthly[0]["sessions_count"] == 2
    assert monthly[0]["total_rounds"] == 0


def test_stats_counts_two_entries_in_one_training_count_as_one_session(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-04-22", "cost": 80}).json()["id"]
    first = client.post(f"/training/{training_id}/weapons/",
                        json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 60.00})
    second = client.post(f"/training/{training_id}/weapons/",
                         json={"weapon_id": weapon_id, "rounds_fired": 30, "ammo_cost": 40.00})
    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get("/stats/")
    assert response.status_code == 200
    assert response.json()["total"]["sessions_count"] == 1
    assert response.json()["monthly"][0]["sessions_count"] == 1
    assert response.json()["monthly"][0]["total_rounds"] == 75


def test_stats_counts_rounds_sum_over_all_weapons(client):
    weapon_id_1 = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    weapon_id_2 = client.post("/weapons/", json={"name": "Glock 19", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-04-22", "cost": 80}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-04-25", "cost": 60}).json()["id"]
    first = client.post(f"/training/{training_1_id}/weapons/",
                        json={"weapon_id": weapon_id_1, "rounds_fired": 45, "ammo_cost": 60.00})
    second = client.post(f"/training/{training_1_id}/weapons/",
                         json={"weapon_id": weapon_id_2, "rounds_fired": 30, "ammo_cost": 40.00})
    third = client.post(f"/training/{training_2_id}/weapons/",
                        json={"weapon_id": weapon_id_2, "rounds_fired": 20, "ammo_cost": 25.00})
    assert first.status_code == 201
    assert second.status_code == 201
    assert third.status_code == 201

    response = client.get("/stats/")
    assert response.status_code == 200
    assert response.json()["total"]["total_rounds"] == 95
    assert response.json()["total"]["sessions_count"] == 2


def test_stats_counts_monthly_split_between_two_months(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-04-22", "cost": 80}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-04-25", "cost": 60}).json()["id"]
    training_3_id = client.post("/training/", json={"training_date": "2026-05-22", "cost": 100}).json()["id"]
    client.post("/training/", json={"training_date": "2026-05-28", "cost": 50})
    first = client.post(f"/training/{training_1_id}/weapons/",
                        json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 60.00})
    second = client.post(f"/training/{training_2_id}/weapons/",
                         json={"weapon_id": weapon_id, "rounds_fired": 30, "ammo_cost": 40.00})
    third = client.post(f"/training/{training_3_id}/weapons/",
                        json={"weapon_id": weapon_id, "rounds_fired": 10, "ammo_cost": 15.00})
    assert first.status_code == 201
    assert second.status_code == 201
    assert third.status_code == 201

    response = client.get("/stats/")
    assert response.status_code == 200
    monthly = response.json()["monthly"]
    assert len(monthly) == 2
    assert monthly[0]["month"] == "2026-04"
    assert monthly[0]["sessions_count"] == 2
    assert monthly[0]["total_rounds"] == 75
    assert monthly[1]["month"] == "2026-05"
    assert monthly[1]["sessions_count"] == 2
    assert monthly[1]["total_rounds"] == 10
    assert response.json()["total"]["sessions_count"] == 4
    assert response.json()["total"]["total_rounds"] == 85


def test_stats_counts_training_with_many_entries_keeps_costs_correct(client):
    weapon_id_1 = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    weapon_id_2 = client.post("/weapons/", json={"name": "Glock 19", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-04-22", "cost": 50}).json()["id"]
    first = client.post(f"/training/{training_id}/weapons/",
                        json={"weapon_id": weapon_id_1, "rounds_fired": 45, "ammo_cost": 100.00})
    second = client.post(f"/training/{training_id}/weapons/",
                         json={"weapon_id": weapon_id_2, "rounds_fired": 30, "ammo_cost": 70.00})
    third = client.post(f"/training/{training_id}/weapons/",
                        json={"weapon_id": weapon_id_1, "rounds_fired": 15, "ammo_cost": 30.00})
    assert first.status_code == 201
    assert second.status_code == 201
    assert third.status_code == 201

    response = client.get("/stats/")
    assert response.status_code == 200
    total = response.json()["total"]
    assert total["ammo_cost"] == '200.00'
    assert total["training_sessions_cost"] == '50.00'
    assert total["total_cost"] == '250.00'
    assert total["sessions_count"] == 1
    assert total["total_rounds"] == 90
    monthly = response.json()["monthly"]
    assert monthly[0]["ammo_cost"] == '200.00'
    assert monthly[0]["training_sessions_cost"] == '50.00'
    assert monthly[0]["sessions_count"] == 1
    assert monthly[0]["total_rounds"] == 90
