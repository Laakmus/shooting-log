def test_weapon_detail_without_entries_returns_zeros(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]

    response = client.get(f"/weapons/{weapon_id}")

    assert response.status_code == 200
    assert response.json()["total_rounds"] == 0
    assert response.json()["sessions_count"] == 0
    assert response.json()["ammo_cost"] == '0'


def test_weapon_detail_two_entries_in_one_training_count_as_one_session(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    first = client.post(f"/training/{training_id}/weapons/",
                        json={"weapon_id": weapon_id, "magazines_count": 3, "ammo_cost": 90})
    second = client.post(f"/training/{training_id}/weapons/",
                         json={"weapon_id": weapon_id, "magazines_count": 1,
                               "rounds_per_magazine": 7, "ammo_cost": 14.50})
    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get(f"/weapons/{weapon_id}")

    assert response.json()["sessions_count"] == 1
    assert response.json()["total_rounds"] == 52
    assert response.json()["ammo_cost"] == '104.50'


def test_weapon_detail_counts_sessions_from_different_trainings(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-26", "cost": 87}).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 60})
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 7, "ammo_cost": 10})
    client.post(f"/training/{training_2_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 30, "ammo_cost": 40})

    response = client.get(f"/weapons/{weapon_id}")

    assert response.json()["sessions_count"] == 2
    assert response.json()["total_rounds"] == 82
    assert response.json()["ammo_cost"] == '110.00'


def test_weapon_detail_stats_count_only_this_weapon(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 43", "magazine_capacity": 15}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "Sig Sauer p226", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-21", "cost": 60}).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 50, "ammo_cost": 75})
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 3, "ammo_cost": 5})
    client.post(f"/training/{training_2_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 20, "ammo_cost": 30})

    response1 = client.get(f"/weapons/{weapon_id}").json()
    response2 = client.get(f"/weapons/{weapon_2_id}").json()

    assert response1["sessions_count"] == 1
    assert response1["ammo_cost"] == '75.00'
    assert response2["sessions_count"] == 2
    assert response2["total_rounds"] == 23
    assert response2["ammo_cost"] == '35.00'


def test_weapon_detail_ammo_cost_null_does_not_break_sum(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 34})
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 17, "ammo_cost": 25})

    response = client.get(f"/weapons/{weapon_id}")

    assert response.json()["total_rounds"] == 51
    assert response.json()["ammo_cost"] == '25.00'


def test_weapon_detail_only_null_ammo_cost_returns_zero(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 34})

    response = client.get(f"/weapons/{weapon_id}")

    assert response.json()["sessions_count"] == 1
    assert response.json()["ammo_cost"] == '0'


def test_weapons_list_returns_stats_for_each_weapon(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "CZ Shadow 2", "magazine_capacity": 15}).json()["id"]
    weapon_3_id = client.post("/weapons/", json={"name": "Walther PDP", "magazine_capacity": 18}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-21", "cost": 60}).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 60})
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 7, "ammo_cost": 10})
    client.post(f"/training/{training_2_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 30})
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 15, "ammo_cost": 22.50})

    response = client.get("/weapons/")

    assert response.status_code == 200
    weapons = {w["id"]: w for w in response.json()}
    assert len(weapons) == 3
    assert weapons[weapon_id]["name"] == "Glock 17"
    assert weapons[weapon_id]["total_rounds"] == 82
    assert weapons[weapon_id]["sessions_count"] == 2
    assert weapons[weapon_id]["ammo_cost"] == '70.00'
    assert weapons[weapon_2_id]["total_rounds"] == 15
    assert weapons[weapon_2_id]["sessions_count"] == 1
    assert weapons[weapon_2_id]["ammo_cost"] == '22.50'
    assert weapons[weapon_3_id]["total_rounds"] == 0
    assert weapons[weapon_3_id]["sessions_count"] == 0
    assert weapons[weapon_3_id]["ammo_cost"] == '0'


def test_weapons_list_inactive_weapon_keeps_stats_with_parameter(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 43", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 60})
    client.delete(f"/weapons/{weapon_id}")

    assert client.get("/weapons/").json() == []

    response = client.get("/weapons/?include_inactive=true")
    assert response.json()[0]["id"] == weapon_id
    assert response.json()[0]["is_active"] is False
    assert response.json()[0]["total_rounds"] == 45
    assert response.json()[0]["sessions_count"] == 1
    assert response.json()[0]["ammo_cost"] == '60.00'


def test_weapon_history_without_entries_returns_empty_list(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]

    response = client.get(f"/weapons/{weapon_id}/history")

    assert response.status_code == 200
    assert response.json() == []


def test_weapon_history_nonexistent_weapon_returns_404(client):
    response = client.get("/weapons/99999/history")

    assert response.status_code == 404


def test_weapon_history_returns_trainings_from_newest(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-06-10", "cost": 60,
                                                    "place": "Strzelnica A"}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87,
                                                    "place": "Strzelnica B"}).json()["id"]
    training_3_id = client.post("/training/", json={"training_date": "2026-07-15", "cost": 50}).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 15})
    client.post(f"/training/{training_2_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 30})
    client.post(f"/training/{training_3_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 45})

    response = client.get(f"/weapons/{weapon_id}/history")

    assert response.status_code == 200
    history = response.json()
    assert [h["training_id"] for h in history] == [training_2_id, training_3_id, training_1_id]
    assert history[0]["training_date"] == "2026-08-25"
    assert history[0]["place"] == "Strzelnica B"
    assert history[0]["rounds_fired"] == 30
    assert history[1]["training_date"] == "2026-07-15"
    assert history[1]["place"] is None
    assert history[2]["rounds_fired"] == 15


def test_weapon_history_sums_entries_in_one_training(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_id, "magazines_count": 3, "ammo_cost": 90})
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_id, "magazines_count": 1, "rounds_per_magazine": 7})

    response = client.get(f"/weapons/{weapon_id}/history")

    history = response.json()
    assert len(history) == 1
    assert history[0]["training_id"] == training_id
    assert history[0]["rounds_fired"] == 52
    assert history[0]["ammo_cost"] == '90.00'
    assert history[0]["entries"] == [
        {"magazines_count": 3, "rounds_per_magazine": 15, "rounds_fired": 45},
        {"magazines_count": 1, "rounds_per_magazine": 7, "rounds_fired": 7},
    ]


def test_weapon_history_entries_belong_to_their_training(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/", json={"weapon_id": weapon_id, "magazines_count": 2})
    client.post(f"/training/{training_2_id}/weapons/", json={"weapon_id": weapon_id, "magazines_count": 4})
    client.post(f"/training/{training_2_id}/weapons/",
                json={"weapon_id": weapon_id, "magazines_count": 1, "rounds_per_magazine": 5})

    history = client.get(f"/weapons/{weapon_id}/history").json()

    assert history[0]["training_id"] == training_2_id
    assert history[0]["rounds_fired"] == 65
    assert history[0]["entries"] == [
        {"magazines_count": 4, "rounds_per_magazine": 15, "rounds_fired": 60},
        {"magazines_count": 1, "rounds_per_magazine": 5, "rounds_fired": 5},
    ]
    assert history[1]["training_id"] == training_1_id
    assert history[1]["rounds_fired"] == 30
    assert history[1]["entries"] == [{"magazines_count": 2, "rounds_per_magazine": 15, "rounds_fired": 30}]


def test_weapon_history_counts_only_this_weapon(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 43", "magazine_capacity": 15}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "Sig Sauer p226", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-21", "cost": 60}).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 50, "ammo_cost": 75})
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 3, "ammo_cost": 5})
    client.post(f"/training/{training_2_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 20, "ammo_cost": 30})

    history = client.get(f"/weapons/{weapon_id}/history").json()

    assert len(history) == 1
    assert history[0]["training_id"] == training_1_id
    assert history[0]["rounds_fired"] == 50
    assert history[0]["ammo_cost"] == '75.00'
    assert len(history[0]["entries"]) == 1
    assert history[0]["entries"][0]["rounds_fired"] == 50


def test_weapon_history_ammo_cost_null_returns_zero(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 34})

    history = client.get(f"/weapons/{weapon_id}/history").json()

    assert history[0]["rounds_fired"] == 34
    assert history[0]["ammo_cost"] == '0'


def test_weapon_history_inactive_weapon_keeps_history(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 43", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 45})
    client.delete(f"/weapons/{weapon_id}")

    response = client.get(f"/weapons/{weapon_id}/history")

    assert response.status_code == 200
    assert response.json()[0]["training_id"] == training_id
    assert response.json()[0]["rounds_fired"] == 45
