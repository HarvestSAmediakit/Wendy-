# Terrence's PA Security Specification

## 1. Data Invariants
- A Lead must always belong to an `ownerId` which matches the creator's UID.
- A Lead status must be one of the pre-defined enums.
- A Call Log must reference a valid `leadId` (relational sync) and share the same `ownerId`.
- Only verified users (Google Auth) can create or modify data.

## 2. The "Dirty Dozen" Payloads (Red Team Audit)

### P1: Identity Spoofing (Lead Creation)
```json
{
  "companyName": "Hackers Inc",
  "ownerId": "victim_uid_123",
  "publication": "Harvest SA",
  "status": "New"
}
```
*Expected: PERMISSION_DENIED (ownerId mismatch)*

### P2: State Shortcutting (Illegal Outcome)
```json
{
  "outcome": "AdminOverride",
  "leadId": "lead_123",
  "ownerId": "terrence_uid",
  "timestamp": "2026-05-10T08:00:00Z"
}
```
*Expected: PERMISSION_DENIED (Invalid enum value)*

### P3: Resource Poisoning (Large Document ID)
Path: `/leads/A`.repeat(2000)
*Expected: PERMISSION_DENIED (isValidId constraint)*

### P4: Shadow Update (Ghost Field)
```json
{
  "companyName": "John Deere",
  "publication": "Harvest SA",
  "status": "New",
  "ownerId": "terrence_uid",
  "isVerifiedByAdmin": true
}
```
*Expected: PERMISSION_DENIED (Strict schema validation - affectedKeys().hasOnly)*

### P5: Email Spoofing (Unverified Email)
User: `{email: "damstert1@gmail.com", email_verified: false}`
*Expected: PERMISSION_DENIED (isVerified check)*

### P6: PII Blanket Read ('get' by non-owner)
Operation: `get(/leads/terrence_lead_id)` by `attacker_uid`
*Expected: PERMISSION_DENIED (isOwner check)*

### P7: List Scrape (Query without where clause)
Operation: `list(/leads)` without `where('ownerId', '==', uid)`
*Expected: PERMISSION_DENIED (Rule enforces resource.data.ownerId == request.auth.uid)*

### P8: Immutable Field Tampering (createdAt)
Update: `request.resource.data.createdAt = "2000-01-01"`
*Expected: PERMISSION_DENIED (affectedKeys().hasOnly constraint)*

### P9: Denial of Wallet (Large String)
```json
{
  "companyName": "A".repeat(1000000),
  "ownerId": "terrence_uid"
}
```
*Expected: PERMISSION_DENIED (String size constraint)*

### P10: Orphaned Call Log (Invalid Lead ID)
```json
{
  "leadId": "invalid!id",
  "outcome": "Interested",
  "ownerId": "terrence_uid"
}
```
*Expected: PERMISSION_DENIED (isValidId for leadId)*

### P11: Self-Assigned Role (Settings)
```json
{
  "role": "admin"
}
```
*Expected: PERMISSION_DENIED (No settings match block allows role write)*

### P12: Temporal Integrity (Future Timestamp)
```json
{
  "updatedAt": "2099-01-01T00:00:00Z"
}
```
*Expected: PERMISSION_DENIED (Strict timestamp validation)*
