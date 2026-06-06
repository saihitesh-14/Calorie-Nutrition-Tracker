# Security Specification & Threat Model

This document outlines the attribute-based access control (ABAC) and security invariants for the **Calorie & Nutrition Tracker** application.

## 1. Core Data Invariants

1. **User Ownership (Identity Lock)**: A user's profile and meal logs are strictly protected. No user can read, write, or list documents belonging to another user.
2. **Onboarding Boundaries**: Metrics such as age, height, weight, and target macronutrients must be non-negative integers restricted to realistic biological ranges.
3. **Meal Integrity**: Every food log item must belong to one of four specific meals (`breakfast`, `lunch`, `dinner`, `snack`), contain non-negative numbers for energy (calories) and macro elements (fat, carbs, protein), and include a timestamp.
4. **List Guard Security**: Query restrictions are enforced directly in the rules (no blanket `isSignedIn()` list reads without matching the query to the user's authenticated ID).

---

## 2. The "Dirty Dozen" Payloads (Adversarial Tests)

Here are the 12 malicious payloads designed to spoof identity, escalate privileges, bypass client validation, or exhaust resources, all of which will be rejected by our secure rules.

### Test 1: Spoofed Profile Owner
*An authenticated user attempts to write/hijack a profile belonging to another user id.*
```json
// POST to /users/VICTIM_USER_ID
{
  "userId": "ATTACKER_USER_ID",
  "age": 28,
  "height": 178,
  "weight": 75,
  "goal": "get lean",
  "targetCalories": 2200,
  "targetProtein": 150,
  "targetCarbs": 200,
  "targetFat": 65,
  "updatedAt": "2026-06-03T17:44:26Z"
}
```
*Expected: PERMISSION_DENIED (Write blocked to other's path).*

### Test 2: Spoofed Log Creator
*An attacker attempts to write a log inside another user's sub-collection.*
```json
// POST to /users/VICTIM_USER_ID/logs/attack_log_1
{
  "id": "attack_log_1",
  "userId": "ATTACKER_USER_ID",
  "foodName": "Steak",
  "mealType": "dinner",
  "calories": 700,
  "protein": 60,
  "carbs": 0,
  "fat": 40,
  "loggedAt": "2026-06-03T17:44:26Z",
  "createdAt": "2026-06-03T17:44:26Z"
}
```
*Expected: PERMISSION_DENIED (Write blocked to other's path).*

### Test 3: Unregistered Anonymous User Access
*Unauthenticated user attempting to fetch or write to user profile paths.*
```json
// GET /users/any_user_id
```
*Expected: PERMISSION_DENIED (Non-signed-in request refused).*

### Test 4: Resource Poisoning via Massive Name
*An attacker attempts to inject a 1MB string in `foodName` to exhaust client memory or cause database inflation.*
```json
// POST to /users/MY_USER_ID/logs/poison_log
{
  "id": "poison_log",
  "userId": "MY_USER_ID",
  "foodName": "[A string of 50,000 characters...]",
  "mealType": "breakfast",
  "calories": 150,
  "protein": 5,
  "carbs": 25,
  "fat": 2,
  "loggedAt": "2026-06-03T17:44:26Z",
  "createdAt": "2026-06-03T17:44:26Z"
}
```
*Expected: PERMISSION_DENIED (Strict size restrictions: foodName.size() <= 200).*

### Test 5: Negative Nutrition Value Inject
*An attacker attempts top-up metrics via negative calorie inputs.*
```json
{
  "id": "neg_calories_log",
  "userId": "MY_USER_ID",
  "foodName": "Negative Food",
  "mealType": "lunch",
  "calories": -500,
  "protein": 10,
  "carbs": 20,
  "fat": 5,
  "loggedAt": "2026-06-03T17:44:26Z",
  "createdAt": "2026-06-03T17:44:26Z"
}
```
*Expected: PERMISSION_DENIED (Calories must be >= 0).*

### Test 6: Invalidation of Meal Type Enum
*An attacker attempts to log an invalid meal category.*
```json
{
  "id": "bad_meal_log",
  "userId": "MY_USER_ID",
  "foodName": "Protein Shake",
  "mealType": "second-breakfast-hobbit-style",
  "calories": 300,
  "protein": 30,
  "carbs": 10,
  "fat": 3,
  "loggedAt": "2026-06-03T17:44:26Z",
  "createdAt": "2026-06-03T17:44:26Z"
}
```
*Expected: PERMISSION_DENIED (mealType must match breakfast/lunch/dinner/snack enum).*

### Test 7: Shadow Update Ghost Field Inject
*An update containing a malicious "isVerifiedAdmin" boolean to attempt authorization state cheating.*
```json
{
  "userId": "MY_USER_ID",
  "age": 28,
  "height": 178,
  "weight": 75,
  "goal": "get lean",
  "targetCalories": 2200,
  "targetProtein": 150,
  "targetCarbs": 200,
  "targetFat": 65,
  "updatedAt": "2026-06-03T17:44:26Z",
  "isVerifiedAdmin": true
}
```
*Expected: PERMISSION_DENIED (Ghost fields rejected by the exact size and keys layout gate).*

### Test 8: Large Array Attack on Ingredients
*An attacker tries to send an ingredients list with 1,000 values to crash the frontends.*
```json
{
  "id": "large_list_log",
  "userId": "MY_USER_ID",
  "foodName": "Salad",
  "mealType": "lunch",
  "calories": 200,
  "protein": 5,
  "carbs": 15,
  "fat": 12,
  "ingredients": ["[1,000 mock elements...]"],
  "loggedAt": "2026-06-03T17:44:26Z",
  "createdAt": "2026-06-03T17:44:26Z"
}
```
*Expected: PERMISSION_DENIED (Ingredients array size bounded <= 50).*

### Test 9: Malformed Type in Ingredients List
*An attacker pushes numbers instead of letters in the ingredients list.*
```json
{
  "id": "invalid_types_log",
  "userId": "MY_USER_ID",
  "foodName": "Salad",
  "mealType": "lunch",
  "calories": 200,
  "protein": 5,
  "carbs": 15,
  "fat": 12,
  "ingredients": [123, 456, 789],
  "loggedAt": "2026-06-03T17:44:26Z",
  "createdAt": "2026-06-03T17:44:26Z"
}
```
*Expected: PERMISSION_DENIED (First item or checked items must be type string).*

### Test 10: Insecure Query Blanket Access
*An attacker runs queries of other users using general collections fetches.*
```javascript
// Attacker queries: db.collectionGroup("logs") -> should fail rules evaluation
```
*Expected: PERMISSION_DENIED (Rules enforce that filters must match `userId` of the requesting account).*

### Test 11: Biological Boundary Breaching (Age)
*A user updates their age to 9999 to cause overflow or validation breaks.*
```json
{
  "userId": "MY_USER_ID",
  "age": 9999,
  "height": 178,
  "weight": 75,
  "goal": "get lean",
  "targetCalories": 2200,
  "targetProtein": 150,
  "targetCarbs": 200,
  "targetFat": 65,
  "updatedAt": "2026-06-03T17:44:26Z"
}
```
*Expected: PERMISSION_DENIED (age must be <= 120).*

### Test 12: Invalidation of Document ID Format (ID Poisoning)
*Attempting to create log with a malformed 10KB special character string as a document ID.*
```json
// POST /users/MY_USER_ID/logs/[10KB malware string...]
```
*Expected: PERMISSION_DENIED (Document path ID does not follow alphanumeric patterns `isValidId`).*

---

## 3. Threat Matrix & Rules Verification

| Threat | Mitigating Rule Logic | Outcome |
|---|---|---|
| Identity Spoofing | `request.auth.uid == userId` | Locked |
| State Escalation | `incoming().diff(existing()).affectedKeys().hasOnly([...])` | Controlled |
| Resource Exhaustion | Limit String lengths (e.g., `.size() <= 200`) | Protected |
| Poisoned Array Bounds | `.size() <= 50` check on arrays | Bounded |
| PII Data Leak | Access strictly limited to Owner | Prevented |
