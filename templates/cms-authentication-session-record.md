# CMS Authentication and Session Record

## Scope

- Project reference:
- Candidate identity:
- Source revision:
- Toolkit revision:
- Private test origin class:
- CMS admin base path:
- Required collections:

## Authentication contract

- Credential method:
- Canonical relying-party origin:
- Immediate identity endpoint:
- Public authentication bootstrap paths:
- Bootstrap redirect policy:
- Required role or capability:
- Session cookie policy:
- Session expiry:

## Session storage

- Source of truth:
- Required consistency:
- Adapter and version:
- Driver or built-in implementation:
- Binding option name:
- Reserved adapter option review:
- Table or namespace:
- Migration:
- Rollback:

## Local proof data

- Disposable administrator source:
- Token generation:
- Token storage mode:
- Token cleanup:
- Disposable record naming:
- Record cleanup:

## Candidate results

| Check | Expected | Result | Evidence |
|---|---|---|---|
| Credential assertion | Success | | |
| Passkey options path | Final 200 without private-route redirect | | |
| Passkey verification path | Reaches the public verifier | | |
| Email anti-spam challenge | Visible and submit gated | | |
| Email challenge token | Attached to protected request | | |
| Immediate identity | Authenticated | | |
| Role or capability | Expected value | | |
| Admin shell | Loaded | | |
| First collection list | 200 and visible title | | |
| Second collection list | 200 and visible title | | |
| Existing record editor | Loaded saved title | | |
| Draft create | Created | | |
| Draft edit | Saved | | |
| Editor reload | Edited value visible | | |
| Draft cleanup | Deleted | | |

## Production confirmation

- Canonical credential used:
- Immediate identity authenticated:
- Required collections loaded:
- Existing record opened:
- Ordinary navigation preserved session:
- Production content mutation performed:
- If yes, approval and rollback:

## Decision

- Gate status:
- Blocker:
- Reviewer:
- Review date:
