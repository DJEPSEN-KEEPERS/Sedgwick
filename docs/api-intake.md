# Sedgwick Case Intake API

**Base URL:** `https://black-mud-094afdb03.7.azurestaticapps.net/api`

Forsikringsselskaber kan oprette og følge sager via REST API. Autentificering sker med en **API-nøgle** tildelt af Sedgwick — ingen brugerlogin kræves.

---

## Autentificering

Inkluder API-nøglen i headeren på alle kald:

```
X-API-Key: <din-api-nøgle>
```

Nøglen er unik per forsikringsselskab. Kontakt Sedgwick på [partner@sedgwick.dk](mailto:partner@sedgwick.dk) for at få tildelt en nøgle.

---

## Endpoints

### 1. Opret sag

```
POST /api/public/cases
X-API-Key: <nøgle>
Content-Type: application/json
```

**Request body:**

| Felt | Type | Krævet | Beskrivelse |
|---|---|---|---|
| `claimId` | string | **Ja** | Sedgwicks interne sag-ID (unikt). Brug `insurerCaseId` til eget sagsnr. |
| `insurerCaseId` | string | **Ja** | Jeres eget sagsnummer i forsikringssystemet |
| `insurancePolicyNumber` | string | **Ja** | Policenummer |
| `damageType` | string | **Ja** | Skadetype, f.eks. `"Vandskade"` |
| `damageDescription` | string | **Ja** | Tekstbeskrivelse af skaden |
| `buildingType` | string | **Ja** | Bygningstype, f.eks. `"Enfamiliehus"` |
| `address` | string | **Ja** | Vejnavn og husnummer |
| `postalCode` | string | **Ja** | Postnummer |
| `city` | string | **Ja** | By |
| `region` | string | **Ja** | Region (f.eks. `"Hovedstaden"`) |
| `contactName` | string | **Ja** | Skadelidtes fulde navn |
| `contactPhone` | string | **Ja** | Skadelidtes telefonnummer |
| `contactEmail` | string | **Ja** | Skadelidtes e-mail |
| `priorityLevel` | string | Nej | `LOW` / `NORMAL` / `HIGH` / `URGENT` (default: `NORMAL`) |
| `maxApprovedPrice` | number | Nej | Maks. godkendt beløb i DKK |
| `estimatedScope` | string | Nej | Estimeret omfang |
| `slaCategory` | string | Nej | SLA-kategori |
| `gpsLat` | number | Nej | GPS breddegrad |
| `gpsLng` | number | Nej | GPS længdegrad |

**Eksempel:**

```json
{
  "claimId": "ALK-2026-123456",
  "insurerCaseId": "ALKA-98765",
  "insurancePolicyNumber": "POL-2024-001",
  "damageType": "Vandskade",
  "damageDescription": "Rørsprænging under køkken, vand i kælder",
  "buildingType": "Enfamiliehus",
  "address": "Roskildevej 45",
  "postalCode": "2000",
  "city": "Frederiksberg",
  "region": "Hovedstaden",
  "contactName": "Mette Jensen",
  "contactPhone": "+45 30 12 34 56",
  "contactEmail": "mette@email.dk",
  "priorityLevel": "HIGH",
  "maxApprovedPrice": 85000
}
```

**Svar — 201 Created:**

```json
{
  "id": "cmpwtinc500017yas...",
  "claimId": "ALK-2026-123456"
}
```

**Fejlkoder:**

| Status | Årsag |
|---|---|
| `400` | Manglende påkrævede felter |
| `401` | Ugyldig eller manglende API-nøgle |
| `409` | `claimId` er allerede i brug — returner eksisterende `id` |
| `500` | Intern serverfejl |

---

### 2. Hent sagsstatus

```
GET /api/public/cases/{claimId}
X-API-Key: <nøgle>
```

Returner den aktuelle status for en sag tilhørende jeres forsikringsselskab.

**Svar — 200 OK:**

```json
{
  "data": {
    "id": "cmpwtinc500017yas...",
    "claimId": "ALK-2026-123456",
    "insurerCaseId": "ALKA-98765",
    "currentMilestone": "BIDDING_IN_PROGRESS",
    "status": "ACTIVE",
    "progressPercent": 15,
    "address": "Roskildevej 45",
    "city": "Frederiksberg",
    "damageType": "Vandskade",
    "selectedContractor": { "companyName": "Hansen Tømrer & Byg A/S" },
    "entreprises": [
      { "type": "PLUMBER", "currentMilestone": "WORK_STARTED", "progressPercent": 40 }
    ],
    "requestedDeadline": "2026-07-01T00:00:00.000Z",
    "finalCompletionDate": null,
    "createdAt": "2026-06-02T14:00:00.000Z",
    "updatedAt": "2026-06-02T15:30:00.000Z"
  }
}
```

**Milepæle (`currentMilestone`):**

| Værdi | Betydning |
|---|---|
| `CASE_RECEIVED` | Sag modtaget |
| `BIDDING_IN_PROGRESS` | Tilbud indhentes |
| `CONTRACTOR_SELECTED` | Håndværker valgt |
| `WORK_SCHEDULED` | Arbejde planlagt |
| `WORK_STARTED` | Arbejde igangsat |
| `WORK_COMPLETED` | Arbejde afsluttet |
| `FINAL_REPORT_SUBMITTED` | Slutrapport indsendt |
| `CASE_CLOSED` | Sag lukket |

---

### 3. List sager

```
GET /api/public/cases?page=1&pageSize=20&status=ACTIVE
X-API-Key: <nøgle>
```

**Query parametre:**

| Parameter | Type | Default | Beskrivelse |
|---|---|---|---|
| `page` | number | 1 | Sidenummer |
| `pageSize` | number | 20 (maks. 100) | Antal sager per side |
| `status` | string | alle | Filter: `ACTIVE` / `CLOSED` / `ON_HOLD` |

**Svar — 200 OK:**

```json
{
  "data": [ { "claimId": "...", "currentMilestone": "...", ... } ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

## XML-integration

Hvis jeres system sender XML (f.eks. FNOL-format), kan I kontakte Sedgwick for opsætning af en tilpasset mapping. XML sendes som `Content-Type: application/xml` til samme endpoint.

---

## Idempotens

`POST /api/public/cases` er idempotent på `claimId`: hvis en sag med samme `claimId` allerede eksisterer, returneres `409` med det eksisterende `id`. I kan trygt gensende ved netværksfejl.

---

## Testmiljø

Brug samme base-URL for test. Kontakt Sedgwick for en test-API-nøgle og et dedikeret testmiljø.

---

## Support

**Teknisk integration:** [it@sedgwick.dk](mailto:it@sedgwick.dk)  
**Adgang og nøgler:** [partner@sedgwick.dk](mailto:partner@sedgwick.dk)
