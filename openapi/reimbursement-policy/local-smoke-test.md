# Reimbursement Policy Local Smoke Test

This flow assumes:

- MariaDB and MongoDB are running
- the backend `.env` is configured
- seeded dummy data exists
- the backend is started locally over HTTPS

## 1. Start the backend

```sh
cd /Users/isabelavalls/Tec/dittravel/TC3005B.501-Backend
pnpm install
pnpm dev
```

The server should start on `https://localhost:3000`.

## 2. Run automated service tests

Run all backend tests:

```sh
pnpm test
```

Run only the reimbursement policy tests:

```sh
pnpm test:policy
```

## 3. Verify health endpoints

```sh
curl -sk https://localhost:3000/api/system/health
curl -sk https://localhost:3000/api/system/version
```

## 4. Log in with the seeded admin user

```sh
curl -sk -X POST https://localhost:3000/api/user/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

Copy the `token` from the response.

## 5. Create a temporary reimbursement policy

Create a payload file:

```sh
cat > /tmp/reimbursement-policy-smoke.json <<'JSON'
{
  "policy_code": "DITTA_SMOKE_20260327",
  "policy_name": "Smoke test reimbursement policy",
  "description": "Temporary policy for local smoke testing",
  "effective_from": "2026-01-01",
  "effective_to": null,
  "assignments": [
    { "department_id": null }
  ],
  "rules": [
    {
      "receipt_type_id": 1,
      "trip_scope": "TODOS",
      "max_amount_mxn": 2500,
      "submission_deadline_days": 15,
      "requires_xml": false,
      "allow_foreign_without_xml": true,
      "refundable": true
    },
    {
      "receipt_type_id": 2,
      "trip_scope": "TODOS",
      "max_amount_mxn": 1200,
      "submission_deadline_days": 15,
      "requires_xml": false,
      "allow_foreign_without_xml": true,
      "refundable": true
    },
    {
      "receipt_type_id": 3,
      "trip_scope": "TODOS",
      "max_amount_mxn": 1500,
      "submission_deadline_days": 15,
      "requires_xml": false,
      "allow_foreign_without_xml": true,
      "refundable": true
    },
    {
      "receipt_type_id": 4,
      "trip_scope": "TODOS",
      "max_amount_mxn": 1000,
      "submission_deadline_days": 15,
      "requires_xml": false,
      "allow_foreign_without_xml": true,
      "refundable": true
    },
    {
      "receipt_type_id": 5,
      "trip_scope": "TODOS",
      "max_amount_mxn": 1000,
      "submission_deadline_days": 15,
      "requires_xml": false,
      "allow_foreign_without_xml": true,
      "refundable": true
    },
    {
      "receipt_type_id": 6,
      "trip_scope": "TODOS",
      "max_amount_mxn": 8000,
      "submission_deadline_days": 15,
      "requires_xml": false,
      "allow_foreign_without_xml": true,
      "refundable": true
    },
    {
      "receipt_type_id": 7,
      "trip_scope": "TODOS",
      "max_amount_mxn": 1000,
      "submission_deadline_days": 15,
      "requires_xml": false,
      "allow_foreign_without_xml": true,
      "refundable": true
    }
  ]
}
JSON
```

Create the policy:

```sh
TOKEN='paste-your-jwt-here'

curl -sk -X POST https://localhost:3000/api/reimbursement-policy/create-policy \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d @/tmp/reimbursement-policy-smoke.json
```

Save the returned `policy_id`.

## 6. List reimbursement policies

```sh
curl -sk https://localhost:3000/api/reimbursement-policy/get-policy-list \
  -H "Authorization: Bearer $TOKEN"
```

## 7. Evaluate an existing seeded request

Request `7` currently works well as a local smoke target:

```sh
curl -sk https://localhost:3000/api/reimbursement-policy/evaluate-request/7 \
  -H "Authorization: Bearer $TOKEN"
```

Expected current behavior with the legacy seed data:

- the endpoint returns `200`
- request `7` evaluates as `INTERNACIONAL`
- seeded receipts are currently rejected with `MISSING_CURRENCY`

That is a known seed-data limitation, not a route failure.

## 8. Deactivate the temporary smoke-test policy

```sh
POLICY_ID='paste-created-policy-id-here'

curl -sk -X PUT https://localhost:3000/api/reimbursement-policy/deactivate-policy/$POLICY_ID \
  -H "Authorization: Bearer $TOKEN"
```

## 9. Common failure points

- `401 Unauthorized`: token missing or expired
- `403 Forbidden`: wrong role for the endpoint
- `404 No active reimbursement policy found`: create a global or department-matching policy first
- `MISSING_CURRENCY`: the receipt exists but the legacy record has no `currency`
- HTTPS certificate warning: expected for local self-signed certs, which is why the examples use `curl -k`
