# EcoTrack API Documentation

> **Version:** 2.1.0 | **Author:** Rushabh Desai | **Last Updated:** 2026-06-15

---

## Table of Contents
- [calculateFootprint(inputs)](#calculatefootprintinputs)
- [fetchAiTips()](#fetchaitips)
- [saveToFirestore()](#savetofirestore)
- [fetchHistory()](#fetchhistory)
- [generateAndUploadPdf()](#generateanduploadpdf)
- [sanitizeInput(value)](#sanitizeinputvalue)
- [escapeHtml(unsafe)](#escapehtmlunsafe)
- [Error Catalog](#error-catalog)
- [Unit Constants](#unit-constants)

---

## calculateFootprint(inputs)

Calculates annual CO2 emissions based on user lifestyle inputs using industry-standard conversion factors.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| carKm | number | Daily kilometers driven by car |
| flights | number | Number of flights taken per year |
| electricity | number | Monthly electricity consumption in kWh |
| diet | string | Diet type: `'vegan'`, `'vegetarian'`, or `'meat-eater'` |

### Returns

| Field | Type | Description |
|-------|------|-------------|
| car | number | Car travel emissions in tons CO2/yr |
| flights | number | Air travel emissions in tons CO2/yr |
| electricity | number | Home energy emissions in tons CO2/yr |
| diet | number | Dietary emissions in tons CO2/yr |
| total | number | Total combined CO2 in tons/yr |

### Conversion Formulas

```
Car:         carKm × 365 × 0.192 / 1000 = tons CO2/yr
Flights:     flights × 250 / 1000 = tons CO2/yr
Electricity: kWh × 12 × 0.85 / 1000 = tons CO2/yr
Diet:        vegan = 1.5 | vegetarian = 1.7 | meat-eater = 3.3
```

### Example

**Input:** 20km/day, 2 flights, 150 kWh/month, meat-eater

```json
{
  "car": 1.4,
  "flights": 0.5,
  "electricity": 1.53,
  "diet": 3.3,
  "total": 6.73
}
```

### Complexity

| Metric | Value |
|--------|-------|
| Time | O(1) |
| Space | O(1) |

---

## fetchAiTips()

Fetches personalized AI-powered carbon reduction tips from the Gemini 2.0 Flash API. Requires a valid Gemini API key.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| *(none)* | — | Reads from `userData.emissions` and `SecureKeyManager` |

### Returns

| Field | Type | Description |
|-------|------|-------------|
| tipsArray | Array\<Object\> | Array of 3 tip objects |
| tipsArray[].title | string | Short tip headline |
| tipsArray[].description | string | Detailed actionable advice |

### Fallback Behavior

If the Gemini API call fails (network error, invalid key, API outage), the function automatically falls back to 3 curated offline tips:

1. **Energy Efficiency** — Turn off lights when not in use.
2. **Reduce Travel** — Combine errands to save gas.
3. **Plant Based Meals** — Try meatless Mondays.

### Complexity

| Metric | Value |
|--------|-------|
| Time | O(1) + network latency |
| Space | O(n) |

---

## saveToFirestore()

Persists the current calculation to Firebase Firestore with a server-generated timestamp.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| *(none)* | — | Reads from `userData.emissions` |

### Firestore Document Schema

| Field | Type | Description |
|-------|------|-------------|
| timestamp | Timestamp | Server-generated timestamp |
| totalEmissions | number | Total tons CO2/yr |
| carEmissions | number | Car emissions component |
| flightEmissions | number | Flight emissions component |
| electricityEmissions | number | Electricity emissions component |
| dietEmissions | number | Diet emissions component |
| diet | string | Diet type string |

### Complexity

| Metric | Value |
|--------|-------|
| Time | O(1) + network latency |
| Space | O(1) |

---

## fetchHistory()

Retrieves the 5 most recent calculation entries from Firestore, ordered by timestamp descending.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| *(none)* | — | Queries `calculations` collection |

### Returns

Renders up to 5 `<li>` elements into the history list UI, each containing:

| Field | Type | Description |
|-------|------|-------------|
| dateString | string | Formatted locale date string |
| totalEmissions | string | Formatted total emissions value |

### Complexity

| Metric | Value |
|--------|-------|
| Time | O(n) where n = 5 results |
| Space | O(n) |

---

## generateAndUploadPdf()

Generates a PDF report using jsPDF containing the user's carbon footprint breakdown, saves it locally, and uploads to Firebase Cloud Storage.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| *(none)* | — | Reads from `userData.emissions` |

### PDF Contents

```
EcoTrack Carbon Report
Total Score: X.X Tons CO2/yr
Breakdown:
  - Car Travel: X.X tons
  - Air Travel: X.X tons
  - Home Energy: X.X tons
  - Diet: X.X tons
Thank you for using EcoTrack!
```

### Cloud Storage Path

```
reports/report-{timestamp}.pdf
```

### Complexity

| Metric | Value |
|--------|-------|
| Time | O(1) + network latency |
| Space | O(n) PDF blob size |

---

## sanitizeInput(value)

Removes all potentially harmful characters from user input to prevent XSS and injection attacks.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| value | string \| number | Raw input to sanitize |

### Returns

| Type | Description |
|------|-------------|
| string \| number | Sanitized string (max 100 chars) or original number |

### Sanitization Rules

1. Strips `< > ' " & / \` characters
2. Removes `javascript:` protocol
3. Removes inline event handlers (`onclick=`, `onerror=`, etc.)
4. Trims whitespace
5. Truncates to 100 characters

### Complexity

| Metric | Value |
|--------|-------|
| Time | O(n) |
| Space | O(n) |

---

## escapeHtml(unsafe)

Escapes HTML special characters to prevent XSS when inserting user content into the DOM.

### Parameters

| Name | Type | Description |
|------|------|-------------|
| unsafe | string | Raw string potentially containing HTML |

### Returns

| Type | Description |
|------|-------------|
| string | HTML-safe escaped string |

### Escape Mapping

| Character | Entity |
|-----------|--------|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#039;` |

### Complexity

| Metric | Value |
|--------|-------|
| Time | O(n) |
| Space | O(n) |

---

## Error Catalog

Standardized error definitions available via `window.ERROR_CATALOG`:

| Key | Code | Message | Severity |
|-----|------|---------|----------|
| `INVALID_INPUT` | ERR_001 | Input validation failed | warning |
| `API_FAILURE` | ERR_002 | Gemini API call failed | error |
| `FIRESTORE_ERROR` | ERR_003 | Database operation failed | error |
| `RATE_LIMIT` | ERR_004 | Too many requests | warning |

---

## Unit Constants

Standard measurement units available via `UNITS`:

| Key | Value | Description |
|-----|-------|-------------|
| `EMISSIONS` | tons CO2e/year | Carbon emission measurement |
| `DISTANCE` | kilometers | Travel distance unit |
| `ENERGY` | kilowatt-hours | Electricity consumption unit |
| `CURRENCY` | USD | Monetary values |

---

## Rate Limiting

The application implements a **token bucket** rate limiter:

| Parameter | Value |
|-----------|-------|
| Max Tokens | 3 |
| Refill Rate | 1 token/second |
| Cooldown | 2000ms between calculations |

---

## Global Average

All comparisons are evaluated against a baseline of **4.7 tons CO2/year** (world average per capita).
