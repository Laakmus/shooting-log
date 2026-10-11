def create_trainings_with_different_costs(client):
    # by date: first < second < third, by total cost: third (50) < first (100) < second (300)
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    first_id = client.post("/training/", json={"training_date": "2026-08-01", "cost": 100}).json()["id"]
    second_id = client.post("/training/", json={"training_date": "2026-08-10", "cost": 20}).json()["id"]
    third_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 50}).json()["id"]
    client.post(f"/training/{second_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 100, "ammo_cost": 280})
    return first_id, second_id, third_id


def test_trainings_list_without_entries_returns_empty_weapons_and_zeros(client):
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]

    response = client.get("/training/")

    assert response.status_code == 200
    training = response.json()[0]
    assert training["id"] == training_id
    assert training["weapons"] == []
    assert training["total_rounds"] == 0
    assert training["ammo_cost"] == '0'
    assert training["total_cost"] == '87.00'


def test_trainings_list_two_entries_of_same_weapon_returns_weapon_once(client):
    weapon_id = client.post("/weapons/", json={"name": "Walther PDP", "magazine_capacity": 18}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "CZ Shadow 2", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 60})
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 7, "ammo_cost": 10.50})
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 30, "ammo_cost": 40})

    response = client.get("/training/")

    training = response.json()[0]
    assert training["weapons"] == [{"id": weapon_2_id, "name": "CZ Shadow 2"},
                                   {"id": weapon_id, "name": "Walther PDP"}]
    assert training["total_rounds"] == 82
    assert training["ammo_cost"] == '110.50'
    assert training["total_cost"] == '197.50'


def test_trainings_list_stats_count_only_this_training(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "Glock 19", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-21", "cost": 70}).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 50, "ammo_cost": 75})
    client.post(f"/training/{training_2_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 20, "ammo_cost": 30})

    response = client.get("/training/")

    trainings = {t["id"]: t for t in response.json()}
    assert trainings[training_1_id]["weapons"] == [{"id": weapon_id, "name": "Glock 17"}]
    assert trainings[training_1_id]["total_rounds"] == 50
    assert trainings[training_1_id]["total_cost"] == '135.00'
    assert trainings[training_2_id]["weapons"] == [{"id": weapon_2_id, "name": "Glock 19"}]
    assert trainings[training_2_id]["total_rounds"] == 20
    assert trainings[training_2_id]["total_cost"] == '100.00'


def test_trainings_list_ammo_cost_null_does_not_break_sum(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-21", "cost": 70}).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 34})
    client.post(f"/training/{training_2_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 34})
    client.post(f"/training/{training_2_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 17, "ammo_cost": 25})

    response = client.get("/training/")

    trainings = {t["id"]: t for t in response.json()}
    assert trainings[training_1_id]["total_rounds"] == 34
    assert trainings[training_1_id]["ammo_cost"] == '0'
    assert trainings[training_1_id]["total_cost"] == '60.00'
    assert trainings[training_2_id]["total_rounds"] == 51
    assert trainings[training_2_id]["ammo_cost"] == '25.00'
    assert trainings[training_2_id]["total_cost"] == '95.00'


def test_trainings_list_filter_by_weapon_returns_only_trainings_with_this_weapon(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "CZ Shadow 2", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-21", "cost": 60}).json()["id"]
    client.post("/training/", json={"training_date": "2026-08-22", "cost": 60})
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 50, "ammo_cost": 75})
    client.post(f"/training/{training_1_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 20, "ammo_cost": 30})
    client.post(f"/training/{training_2_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 10, "ammo_cost": 15})

    response = client.get("/training/", params={"weapon_id": weapon_id})
    response_2 = client.get("/training/", params={"weapon_id": weapon_2_id})

    assert response.status_code == 200
    assert [t["id"] for t in response.json()] == [training_1_id]
    assert [t["id"] for t in response_2.json()] == [training_2_id, training_1_id]


def test_trainings_list_filter_by_weapon_keeps_stats_of_whole_training(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "CZ Shadow 2", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 50, "ammo_cost": 75})
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 20, "ammo_cost": 30})

    response = client.get("/training/", params={"weapon_id": weapon_id})

    training = response.json()[0]
    assert training["weapons"] == [{"id": weapon_2_id, "name": "CZ Shadow 2"},
                                   {"id": weapon_id, "name": "Glock 17"}]
    assert training["total_rounds"] == 70
    assert training["ammo_cost"] == '105.00'
    assert training["total_cost"] == '165.00'


def test_trainings_list_filter_by_unused_weapon_returns_empty_list(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    client.post("/training/", json={"training_date": "2026-08-20", "cost": 60})

    response = client.get("/training/", params={"weapon_id": weapon_id})

    assert response.status_code == 200
    assert response.json() == []
    assert response.headers["X-Total-Count"] == "0"


def test_trainings_list_date_range_includes_both_borders(client):
    client.post("/training/", json={"training_date": "2026-08-09", "cost": 60})
    training_2_id = client.post("/training/", json={"training_date": "2026-08-10", "cost": 60}).json()["id"]
    training_3_id = client.post("/training/", json={"training_date": "2026-08-15", "cost": 60}).json()["id"]
    training_4_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    client.post("/training/", json={"training_date": "2026-08-21", "cost": 60})

    response = client.get("/training/", params={"date_from": "2026-08-10", "date_to": "2026-08-20"})

    assert response.status_code == 200
    assert [t["id"] for t in response.json()] == [training_4_id, training_3_id, training_2_id]


def test_trainings_list_date_from_only_returns_later_trainings(client):
    client.post("/training/", json={"training_date": "2026-08-09", "cost": 60})
    training_2_id = client.post("/training/", json={"training_date": "2026-08-10", "cost": 60}).json()["id"]
    training_3_id = client.post("/training/", json={"training_date": "2026-08-15", "cost": 60}).json()["id"]

    response = client.get("/training/", params={"date_from": "2026-08-10"})

    assert [t["id"] for t in response.json()] == [training_3_id, training_2_id]


def test_trainings_list_date_to_only_returns_earlier_trainings(client):
    training_1_id = client.post("/training/", json={"training_date": "2026-08-09", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-10", "cost": 60}).json()["id"]
    client.post("/training/", json={"training_date": "2026-08-15", "cost": 60})

    response = client.get("/training/", params={"date_to": "2026-08-10"})

    assert [t["id"] for t in response.json()] == [training_2_id, training_1_id]


def test_trainings_list_default_sort_is_date_desc(client):
    first_id, second_id, third_id = create_trainings_with_different_costs(client)

    response = client.get("/training/")

    assert [t["id"] for t in response.json()] == [third_id, second_id, first_id]


def test_trainings_list_sort_date_desc(client):
    first_id, second_id, third_id = create_trainings_with_different_costs(client)

    response = client.get("/training/", params={"sort": "date_desc"})

    assert [t["id"] for t in response.json()] == [third_id, second_id, first_id]


def test_trainings_list_sort_date_asc(client):
    first_id, second_id, third_id = create_trainings_with_different_costs(client)

    response = client.get("/training/", params={"sort": "date_asc"})

    assert [t["id"] for t in response.json()] == [first_id, second_id, third_id]


def test_trainings_list_sort_cost_desc_uses_total_cost(client):
    first_id, second_id, third_id = create_trainings_with_different_costs(client)

    response = client.get("/training/", params={"sort": "cost_desc"})

    assert [t["id"] for t in response.json()] == [second_id, first_id, third_id]
    assert [t["total_cost"] for t in response.json()] == ['300.00', '100.00', '50.00']


def test_trainings_list_sort_cost_asc_uses_total_cost(client):
    first_id, second_id, third_id = create_trainings_with_different_costs(client)

    response = client.get("/training/", params={"sort": "cost_asc"})

    assert [t["id"] for t in response.json()] == [third_id, first_id, second_id]


def test_trainings_list_with_wrong_sort_returns_422(client):
    response = client.get("/training/", params={"sort": "place_desc"})

    assert response.status_code == 422


def test_trainings_list_same_date_and_cost_sorted_by_id_desc(client):
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]
    training_3_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60}).json()["id"]

    for sort in ("date_desc", "date_asc", "cost_desc", "cost_asc"):
        response = client.get("/training/", params={"sort": sort})
        assert [t["id"] for t in response.json()] == [training_3_id, training_2_id, training_1_id]


def test_trainings_list_limit_and_offset_return_one_page(client):
    training_ids = []
    for day in range(1, 6):
        training_ids.append(client.post("/training/", json={"training_date": f"2026-08-0{day}",
                                                            "cost": 60}).json()["id"])

    first_page = client.get("/training/", params={"limit": 2})
    second_page = client.get("/training/", params={"limit": 2, "offset": 2})
    last_page = client.get("/training/", params={"limit": 2, "offset": 4})

    assert [t["id"] for t in first_page.json()] == [training_ids[4], training_ids[3]]
    assert [t["id"] for t in second_page.json()] == [training_ids[2], training_ids[1]]
    assert [t["id"] for t in last_page.json()] == [training_ids[0]]
    assert first_page.headers["X-Total-Count"] == "5"
    assert last_page.headers["X-Total-Count"] == "5"


def test_trainings_list_total_count_counts_trainings_after_filters(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    training_ids = []
    for day in range(1, 6):
        training_ids.append(client.post("/training/", json={"training_date": f"2026-08-0{day}",
                                                            "cost": 60}).json()["id"])
    for training_id in training_ids[:3]:
        client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 17})
        client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 17})

    response = client.get("/training/", params={"weapon_id": weapon_id, "limit": 2})
    response_2 = client.get("/training/", params={"date_from": "2026-08-04", "limit": 1})

    assert [t["id"] for t in response.json()] == [training_ids[2], training_ids[1]]
    assert response.headers["X-Total-Count"] == "3"
    assert [t["id"] for t in response_2.json()] == [training_ids[4]]
    assert response_2.headers["X-Total-Count"] == "2"


def test_trainings_list_without_limit_returns_all_and_total_count(client):
    first_id, second_id, third_id = create_trainings_with_different_costs(client)

    response = client.get("/training/")

    assert [t["id"] for t in response.json()] == [third_id, second_id, first_id]
    assert response.headers["X-Total-Count"] == "3"


def test_trainings_list_with_wrong_limit_or_offset_returns_422(client):
    assert client.get("/training/", params={"limit": 0}).status_code == 422
    assert client.get("/training/", params={"offset": -1}).status_code == 422


def test_training_detail_returns_weapons_and_stats(client):
    weapon_id = client.post("/weapons/", json={"name": "Walther PDP", "magazine_capacity": 18}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "CZ Shadow 2", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    other_training_id = client.post("/training/", json={"training_date": "2026-08-26", "cost": 10}).json()["id"]
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 45, "ammo_cost": 60})
    client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 7})
    client.post(f"/training/{training_id}/weapons/",
                json={"weapon_id": weapon_2_id, "rounds_fired": 30, "ammo_cost": 40})
    client.post(f"/training/{other_training_id}/weapons/",
                json={"weapon_id": weapon_id, "rounds_fired": 100, "ammo_cost": 500})

    response = client.get(f"/training/{training_id}")

    assert response.status_code == 200
    assert response.json()["weapons"] == [{"id": weapon_2_id, "name": "CZ Shadow 2"},
                                          {"id": weapon_id, "name": "Walther PDP"}]
    assert response.json()["total_rounds"] == 82
    assert response.json()["ammo_cost"] == '100.00'
    assert response.json()["total_cost"] == '187.00'


def test_training_detail_without_entries_returns_empty_weapons_and_zeros(client):
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]

    response = client.get(f"/training/{training_id}")

    assert response.json()["weapons"] == []
    assert response.json()["total_rounds"] == 0
    assert response.json()["ammo_cost"] == '0'
    assert response.json()["total_cost"] == '87.00'
