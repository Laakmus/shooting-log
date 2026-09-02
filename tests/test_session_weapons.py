
def test_add_weapon_to_training_success(client):
    training_id = client.post("/training/", json={"training_date":"2026-08-25", "cost": 87,}).json()["id"]
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    response = client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 68})

    assert response.status_code == 201
    assert response.json()["id"] is not None
    assert response.json()["magazines_count"] == 4
    assert response.json()["rounds_per_magazine"] == 17


def test_add_weapon_to_nonexistent_training_returns_404(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    response = client.post("/training/99999/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 68})
    assert response.status_code == 404

def test_add_nonexistent_weapon_to_training_returns_404(client):
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87, }).json()["id"]
    response = client.post(f"/training/{training_id}/weapons/", json={"weapon_id": 99999, "rounds_fired": 68})
    assert response.status_code == 404


def test_add_same_weapon_twice_to_training_success(client):
    """Niepelny magazynek zapisuje sie jako drugi wpis tej samej broni."""
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]

    first = client.post(f"/training/{training_id}/weapons/",
                        json={"weapon_id": weapon_id, "magazines_count": 3,
                              "rounds_per_magazine": 15, "rounds_fired": 45})
    second = client.post(f"/training/{training_id}/weapons/",
                         json={"weapon_id": weapon_id, "magazines_count": 1,
                               "rounds_per_magazine": 7, "rounds_fired": 7})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]


def test_add_weapon_with_only_magazines_calculates_rounds(client):
    """Same magazynki: pociski licza sie z pojemnosci zapisanej przy broni."""
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]

    response = client.post(f"/training/{training_id}/weapons/",
                           json={"weapon_id": weapon_id, "magazines_count": 3})

    assert response.status_code == 201
    assert response.json()["rounds_fired"] == 51
    assert response.json()["rounds_per_magazine"] == 17


def test_add_weapon_with_explicit_rounds_per_magazine(client):
    """Podana pojemnosc nadpisuje ta z broni - niepelne magazynki."""
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]

    response = client.post(f"/training/{training_id}/weapons/",
                           json={"weapon_id": weapon_id, "magazines_count": 3, "rounds_per_magazine": 7})

    assert response.status_code == 201
    assert response.json()["rounds_fired"] == 21
    assert response.json()["rounds_per_magazine"] == 7


def test_add_weapon_with_conflicting_amounts_returns_422(client):
    """3 magazynki po 17 to najwyzej 51 pociskow, wiec 100 to rozbieznosc."""
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]

    response = client.post(f"/training/{training_id}/weapons/",
                           json={"weapon_id": weapon_id, "magazines_count": 3, "rounds_fired": 100})

    assert response.status_code == 422


def test_add_weapon_without_any_amount_returns_422(client):
    """Bez magazynkow i bez pociskow nie ma z czego liczyc."""
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]

    response = client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id})

    assert response.status_code == 422


def test_get_training_weapons_empty_list(client):
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]

    response = client.get(f"/training/{training_id}/weapons/")

    assert response.status_code == 200
    assert response.json() == []


def test_get_training_weapons_returns_all_entries(client):
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]
    client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 45})
    client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 7})

    response = client.get(f"/training/{training_id}/weapons/")

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert sum(entry["rounds_fired"] for entry in response.json()) == 52


def test_get_training_weapons_only_from_this_training(client):
    """Endpoint zwraca wpisy wylacznie tego treningu, ktory jest w adresie."""
    first_training = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    second_training = client.post("/training/", json={"training_date": "2026-08-26", "cost": 50}).json()["id"]
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 15}).json()["id"]

    client.post(f"/training/{first_training}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 45})
    client.post(f"/training/{second_training}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 30})

    response = client.get(f"/training/{first_training}/weapons/")

    assert len(response.json()) == 1
    assert response.json()[0]["session_id"] == first_training
    assert response.json()[0]["rounds_fired"] == 45


def test_get_weapons_for_nonexistent_training_returns_404(client):
    response = client.get("/training/99999/weapons/")

    assert response.status_code == 404
