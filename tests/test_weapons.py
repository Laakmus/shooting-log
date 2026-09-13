
def test_create_weapon_success(client):
    response = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17})

    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == "Glock 17"
    assert data["magazine_capacity"] == 17


def test_create_weapon_without_capacity(client):
    response = client.post("/weapons/", json={"name": "Glock 17"})

    assert response.status_code == 422


def test_get_all_weapons_empty_list(client):
    response = client.get("/weapons/")

    assert response.status_code == 200
    assert response.json() == []

def test_get_all_weapons_returns_all_weapons(client):
    client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17})
    response = client.get("/weapons/")

    assert response.status_code == 200
    assert response.json()[0]["name"] == "Glock 17"


def test_get_current_weapons_with_id(client):
    new_weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    response = client.get(f"/weapons/{new_weapon_id}")

    assert response.status_code == 200
    assert response.json()["id"] == new_weapon_id


def test_get_unexisting_weapons_with_404_code(client):
    response = client.get("/weapons/99999")
    assert response.status_code == 404


def test_change_one_field_for_current_weapons_success(client):
    new_weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17,
                                                   "note":"tak to jest"}).json()["id"]
    response = client.patch(f"/weapons/{new_weapon_id}", json={"magazine_capacity": 19})

    assert response.status_code == 200
    assert response.json()["magazine_capacity"] == 19
    assert response.json()["note"] == "tak to jest"


def test_change_one_field_for_current_weapons_fail(client):
    response = client.patch("/weapons/99999", json={"magazine_capacity": 19})

    assert response.status_code == 404

def test_delete_marks_weapon_inactive_instead_of_removing(client):
    new_weapon = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17})
    weapon_id = new_weapon.json()["id"]

    weapon_delete = client.delete(f"/weapons/{weapon_id}")
    assert weapon_delete.status_code == 204

    response = client.get(f"/weapons/{weapon_id}")
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    lista = client.get("/weapons/").json()
    assert weapon_id not in [w["id"] for w in lista]


def test_weapon_detail_returns_sum_of_rounds(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date":"2026-08-25", "cost": 87,}).json()["id"]
    training_2_id = client.post("/training/", json={"training_date": "2026-08-26", "cost": 87, }).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 68})
    client.post(f"/training/{training_2_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 170})
    response = client.get(f"/weapons/{weapon_id}/").json()["total_rounds"]

    assert response == 238

def test_weapon_detail_returns_zero_without_entries(client):
    weapon_id = client.post("/weapons/", json={"name": "CZ P-10C", "magazine_capacity": 15}).json()["id"]
    response = client.get(f"/weapons/{weapon_id}/").json()["total_rounds"]
    assert response == 0

def test_weapon_detail_counts_only_this_weapon(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 43", "magazine_capacity": 15}).json()["id"]
    weapon_2_id = client.post("/weapons/", json={"name": "Sig Sauer p226", "magazine_capacity": 15}).json()["id"]
    training_1_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60, }).json()["id"]
    client.post(f"/training/{training_1_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 50})
    client.post(f"/training/{training_1_id}/weapons/", json={"weapon_id": weapon_2_id, "rounds_fired": 3})
    response1 = client.get(f"/weapons/{weapon_2_id}/").json()["total_rounds"]
    response2 = client.get(f"/weapons/{weapon_id}/").json()["total_rounds"]
    assert response1 == 3
    assert response2 == 50



def test_create_weapon_with_negative_price_returns_422(client):
    response = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17,
                                              "purchase_price": -5000})

    assert response.status_code == 422


def test_create_weapon_with_zero_capacity_returns_422(client):
    response = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 0})

    assert response.status_code == 422


def test_patch_weapon_with_single_field_success(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17}).json()["id"]

    response = client.patch(f"/weapons/{weapon_id}", json={"name": "Glock 17 Gen5"})

    assert response.status_code == 200
    assert response.json()["name"] == "Glock 17 Gen5"
    assert response.json()["magazine_capacity"] == 17


def test_weapons_list_includes_inactive_with_parameter(client):
    weapon_id = client.post("/weapons/", json={"name": "Glock 43", "magazine_capacity": 15}).json()["id"]
    client.delete(f"/weapons/{weapon_id}")
    response = client.get("/weapons/?include_inactive=true")

    assert weapon_id in [w["id"] for w in response.json()]


def test_inactive_weapon_keeps_shooting_history(client):
    weapon_id = client.post('/weapons/', json={"name": "Glock 43", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-20", "cost": 60, }).json()["id"]
    entry = client.post(f"/training/{training_id}/weapons/", json={"weapon_id": weapon_id, "rounds_fired": 45})

    assert entry.status_code == 201

    client.delete(f"/weapons/{weapon_id}")
    response = client.get(f"/weapons/{weapon_id}")
    assert response.json()["is_active"] is False
    assert response.json()["total_rounds"] == 45
