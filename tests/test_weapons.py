
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
    new_weapon_id = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17, "note":"tak to jest"}).json()["id"]
    response = client.patch(f"/weapons/{new_weapon_id}", json={"magazine_capacity": 19})

    assert response.status_code == 200
    assert response.json()["magazine_capacity"] == 19
    assert response.json()["note"] == "tak to jest"


def test_change_one_field_for_current_weapons_fail(client):
    response = client.patch("/weapons/99999", json={"magazine_capacity": 19})

    assert response.status_code == 404

def test_delete_current_weapons_and_check_data_after_deleted(client):
    new_weapon = client.post("/weapons/", json={"name": "Glock 17", "magazine_capacity": 17})
    weapon_id = new_weapon.json()["id"]

    weapon_delete = client.delete(f"/weapons/{weapon_id}")
    assert weapon_delete.status_code == 204

    check_weapon_in_db = client.get(f"/weapons/{weapon_id}")
    assert check_weapon_in_db.status_code == 404
