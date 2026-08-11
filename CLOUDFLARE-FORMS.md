# Cloudflare Forms Default

Use this pattern for forms on informational Astro websites hosted on Cloudflare. It combines a small Worker endpoint, mandatory server-side Turnstile validation, and Cloudflare Email Service. The browser never receives an email credential or Turnstile secret.

This is the Go for Launch default for contact, support, request, and feedback forms. If a project needs file uploads, regulated records, case management, or a customer relationship management workflow, design a purpose-specific backend instead.

## Architecture

1. Astro renders a normal accessible HTML form.
2. Cloudflare Turnstile adds `cf-turnstile-response` after the visitor completes the managed challenge.
3. The form posts to a same-origin Worker route such as `/api/contact`.
4. The Worker validates the token through Cloudflare Siteverify.
5. The Worker validates and normalizes every accepted field.
6. A destination-restricted Cloudflare Email Service binding sends the message to a fixed organizational mailbox.
7. The Worker returns a short JSON result for the form status message.

Turnstile client rendering is not a security boundary. Cloudflare requires Siteverify on the server because tokens expire, can be invalid, and can be redeemed only once.

## EmDash Sites

When the application uses EmDash, prefer its published integrations over a
parallel project-owned form stack.

- Use `CommentForm` from `emdash/ui` for public comments.
- Pass the public site key through the component's `turnstileSiteKey` property.
- Supply the matching comment secret through the environment name documented
  by the installed EmDash version.
- Use `@emdash-cms/plugin-forms` for managed contact, interest, feedback, and
  request forms.
- Set each managed form's `spamProtection` to `turnstile` and keep the plugin's
  default protection set to Turnstile so new forms fail safe.
- Render the plugin's published Astro block component and import its published
  styles export. Do not copy its client controller into project code.
- Configure form definitions and plugin settings through authenticated EmDash
  Admin or supported EmDash APIs. Do not write plugin tables directly.
- Keep read-only search as a bookmarkable GET with no challenge.

Do not add a second middleware verifier in front of native EmDash routes unless
the installed EmDash release lacks server verification and no supported update
exists. Two verifiers can disagree about token action, hostname, or redemption
state, and Turnstile tokens are single-use.

Cloudflare runtime bindings and bundler environment variables are separate
contracts. Inspect the compiled private candidate and prove that the native
server verifier still reads the runtime secret. A secret lookup folded to an
empty string is a hard failure. If a configuration-level runtime binding bridge
is required, keep it in framework configuration, compile no secret value, and
do not patch the EmDash package.

The managed forms plugin can have a different secret-storage contract from the
core comment component. Follow the installed plugin documentation, restrict
administrative access, and treat any database or backup containing plugin
settings as secret-bearing. If organizational policy requires encrypted Worker
bindings for every secret and the plugin has no binding option, stop and request
an upstream extension rather than adding an undocumented database adapter.

### EmDash acceptance checks

1. Inventory final HTML and require zero project-owned public write forms.
2. Require native comment and managed-form markup on the intended routes.
3. Send a direct comment request with no token and require HTTP 403 before a
   record is created.
4. Send a direct managed-form request with no token and require HTTP 403 before
   a record, email, or other side effect is created.
5. Prove a normal GET search succeeds without Turnstile.
6. Run Chromium and Playwright WebKit on the private candidate with all
   external requests blocked. Require each protected form to declare the
   official Cloudflare client and its site key.
7. Use documented Cloudflare test keys for a bounded positive interaction
   check. Remove any created record immediately and verify the count returns to
   its starting value.
8. Re-run the complete frozen-candidate release suite after the final source or
   configuration change.

## Cloudflare Setup

### 1. Onboard the sender domain

The domain must use Cloudflare DNS.

In the Cloudflare dashboard, open **Compute**, **Email Service**, **Email Sending**, select **Onboard Domain**, and choose the website domain. Cloudflare adds the bounce MX, SPF, DKIM, and DMARC records needed for sending. Wait until the sending domain reports enabled before treating the form as production-ready.

Use a role address on that domain for the sender, for example `website@example.gov`. Do not put the visitor's address in `From`. Put the validated visitor address in `replyTo`.

### 2. Create a managed Turnstile widget

Create a managed widget restricted to the canonical production hostname. Put the public sitekey in the Astro page. Store the secret only as an encrypted Worker secret.

```bash
printf '%s' "$TURNSTILE_SECRET" | npx wrangler secret put TURNSTILE_SECRET -c wrangler.contact.jsonc
```

For local and automated tests, use Cloudflare's documented test keys. Never place the production secret in source, test fixtures, build output, logs, or client JavaScript.

### 3. Restrict the email binding

The binding should be unable to act as an open relay. Set a fixed destination in Wrangler configuration:

```jsonc
{
  "send_email": [
    {
      "name": "EMAIL",
      "destination_address": "web-requests@example.gov"
    }
  ]
}
```

Cloudflare requires the sender address to belong to a domain onboarded to Email Service. A destination restriction limits the damage if an application bug reaches the binding.

## Astro Form

Use explicit labels, autocomplete attributes, reasonable length limits, a status region, and a honeypot that is hidden from people and assistive technology.

```astro
<form aria-label="Contact the website team" data-contact-form>
  <label>
    Name
    <input name="name" autocomplete="name" maxlength="100" required />
  </label>
  <label>
    Email
    <input name="email" type="email" autocomplete="email" maxlength="254" required />
  </label>
  <label>
    Message
    <textarea name="message" minlength="20" maxlength="5000" required></textarea>
  </label>
  <label aria-hidden="true" class="form-trap">
    Website
    <input name="website" tabindex="-1" autocomplete="off" />
  </label>
  <div class="cf-turnstile" data-sitekey="PUBLIC_SITEKEY"></div>
  <button type="submit">Send</button>
  <p role="status" aria-live="polite" data-form-status></p>
</form>

<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

Submit `FormData` to the same-origin Worker endpoint. Disable the button while the request is in flight, show a useful error, reset Turnstile after each attempt, and provide a direct email or phone fallback.

## Worker Requirements

The Worker must:

- Accept only `POST` at the exact form route.
- Enforce the canonical `Origin` value.
- Reject an oversized body before parsing it.
- Validate allowed field names, lengths, formats, and enumerated values.
- Treat a filled honeypot as a no-op success.
- Call `https://challenges.cloudflare.com/turnstile/v0/siteverify` with the secret, response token, and connecting IP.
- Require `success: true` and verify the hostname when Siteverify returns one.
- Escape visitor content before inserting it into HTML email.
- Use a fixed recipient and a sender on the onboarded domain.
- Put the validated visitor email in `replyTo`.
- Avoid logging form content or personal information.
- Return generic delivery errors while logging only a non-sensitive error class.

Turnstile tokens are valid for five minutes and are single-use. Validate immediately before the protected action.

## Testing and Release Gate

Before production:

1. Unit test input validation and HTML escaping.
2. Test invalid, expired, duplicate, and missing Turnstile tokens.
3. Test the form with keyboard navigation and assistive labels.
4. Test Chromium, Playwright WebKit with an iPhone profile, and native iOS Safari.
5. Confirm the binding cannot send to a caller-controlled address.
6. Send a production smoke request and confirm receipt at the fixed mailbox.
7. Confirm application logs contain no message body, email address, token, or secret.
8. Re-run the full Go for Launch staging and PageSpeed production gate.

## Official References

- [Cloudflare Email Service, send emails](https://developers.cloudflare.com/email-service/get-started/send-emails/)
- [Cloudflare Email Service, configure send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/)
- [Cloudflare Turnstile, client-side rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Cloudflare Turnstile, server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile, testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
