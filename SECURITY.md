# Security Policy

## Reporting

Do not open a public issue containing credentials, private customer information, exploitable production details, or token-bearing URLs.

Report security concerns privately through GitHub's "Report a vulnerability" option on this repository's Security tab, which uses GitHub private vulnerability reporting. Maintainers should keep private vulnerability reporting enabled in the repository settings.

## Documentation Safety

Examples must not include:

- API tokens or secret values.
- Environment file contents.
- Private email-routing credentials.
- Session cookies.
- Private CMS exports.
- Customer or user data.
- Unredacted production security rules.

Use placeholders and synthetic fixtures. Account IDs, zone IDs, site IDs, and Worker names should also be replaced unless they are intentionally public and necessary to the case study.

