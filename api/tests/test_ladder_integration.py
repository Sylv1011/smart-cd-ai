def test_ladder_endpoint_returns_200(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 200


def test_ladder_response_structure(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    data = resp.json()
    assert data["strategy"] == "ladder"
    assert data["investment_amount"] == 10000
    assert data["time_horizon_years"] == 5
    assert len(data["rungs"]) == 5
    assert "blended_nominal_apy" in data
    assert "blended_after_tax_apy" in data
    assert "total_nominal_interest" in data
    assert "total_after_tax_interest" in data
    assert "next_maturity_months" in data
    assert "warnings" in data


def test_ladder_rung_fields(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    rung = resp.json()["rungs"][0]
    for field in ("term_months", "amount", "allocation_pct", "provider",
                  "product_type", "nominal_apy", "after_tax_apy",
                  "nominal_interest", "after_tax_interest", "min_deposit", "maturity_date"):
        assert field in rung, f"Missing field: {field}"


def test_ladder_amounts_sum_to_investment(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    rungs = resp.json()["rungs"]
    total = sum(r["amount"] for r in rungs)
    assert abs(total - ladder_payload["investment_amount"]) < 1.0


def test_ladder_short_horizon_warning(client, ladder_payload):
    ladder_payload["time_horizon_years"] = 1
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 200
    warnings = resp.json()["warnings"]
    assert any("short" in w.lower() for w in warnings)


def test_ladder_rejects_below_minimum_investment(client, ladder_payload):
    ladder_payload["investment_amount"] = 500  # below $1,000 minimum
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 422


def test_ladder_rejects_invalid_liquidity(client, ladder_payload):
    ladder_payload["liquidity_preference"] = "extreme"
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code == 422


def test_ladder_next_maturity_is_shortest_rung(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    data = resp.json()
    shortest_term = min(r["term_months"] for r in data["rungs"])
    assert data["next_maturity_months"] == shortest_term


def test_ladder_no_auth_required(client, ladder_payload):
    resp = client.post("/api/v1/strategy/ladder", json=ladder_payload)
    assert resp.status_code != 401
    assert resp.status_code != 403
