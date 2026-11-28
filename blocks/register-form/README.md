# register-form

"Be the first to know" registration with a **server-enforced** OTP journey,
backed by the JSW Motor Services OTP service on Adobe App Builder
(`jsw-otp` package, namespace `4124924-jswmotorservices-stage`).

Implements section 9 of `JSW_OTP_Service_AppBuilder_Build_Instructions_v1_1.md`.
This file exists because the project has no build step — comments in
`register-form.js` ship to every visitor. `.hlxignore` excludes `*.md`, so this
is never served.

## What changed, and why it mattered

The block previously simulated the OTP entirely in the browser:

```js
const sendOtp = () => { /* trigger real OTP send here */ };
const verifyOtp = (code) => /^\d{4}$/.test(code); // demo: any 4 digits pass
```

**Any four digits passed, and no lead was ever submitted.** Verification was
decorative. Every control now executes inside the App Builder action, which is
the only trusted party: code generation, comparison, attempt counting, rate
limiting, CAPTCHA validation and single-use enforcement. The browser holds no
secret.

`lead-submit` rejects any request without a valid, unused, phone-matched
token, so Salesforce is never exposed to unverified traffic.

## Flow

1. **fields** — full name, email, `+91` + mobile, consent. Client-side
   validation mirrors the server's so a certain rejection costs no request.
2. `POST otp-send` with a fresh CAPTCHA token → **otp** screen.
3. `POST otp-verify` → on success, **immediately** `POST lead-submit`.

Step 3 is a single button because this form collects all lead data on the
first screen — there is no third data screen. One consequence to know: the
service consumes the single-use token *before* calling the lead API (spec
section 8.5 step 8 — do not re-issue on upstream failure), so a
`LEAD_UPSTREAM_ERROR` cannot be retried with the same token. The block
therefore returns the visitor to the form to start again, rather than offering
a retry that would always fail.

## Verification token

Held in a closure variable only. Never `localStorage`, `sessionStorage`, a
cookie, a data attribute or the DOM; never logged or pushed to the data layer.
Cleared after submission attempt (success or failure), on change-number, and
on any token error. It is **unforgeable, not secret** — anyone may read it,
nobody may mint one.

## Configuration

Environment config is resolved in **code**, not authored content. A site key
or API host in page content would mean republishing every page carrying the
form in order to rotate it.

| Constant | Purpose |
|---|---|
| `API.stage` / `API.prod` | Runtime namespace base per environment |
| `SITE_KEYS.stage` / `.prod` | CAPTCHA site keys — **outstanding on B-08** |

`*.aem.page`, `*.aem.live` and `localhost` resolve to Stage; anything else to
Production. A production URL is never the fallback for a preview host.

Page metadata overrides both, for local development:

```html
<meta name="otp-api-base" content="http://localhost:4010">
<meta name="captcha-site-key" content="1x00000000000000000000AA">
```

### The CAPTCHA is skipped on preview hosts

A reCAPTCHA key can only be registered against a domain you control. Branch
previews live on `*.aem.page` / `*.aem.live`, which are **Adobe's**, so the
provider rejects the token there and the journey cannot be exercised at all.

`captchaRequired()` therefore returns `false` on those hosts: no provider
script is loaded, and `captchaToken` is omitted from the `otp-send` payload
rather than sent empty. Everywhere else — including `localhost` and
`dev.jswmotors.com`, where the key does work — it stays on.

The hostname is the only input. There is **no authored override** for it, on
purpose: a page-level switch for a security control is a control that can be
turned off by editing content, and content and code are reviewed separately
here. Changing which hosts skip the CAPTCHA is a code change, in this file,
next to the service's `CAPTCHA_EXEMPT_ORIGINS`.

**This must agree with the service's `CAPTCHA_EXEMPT_ORIGINS`.** The server is
still the decider: skipping here on a host the server still gates produces a
`CAPTCHA_FAILED` and a broken form — never an open endpoint. That is the safe
direction for the two to disagree in.

What it costs, on the exempt origins only: `Origin` is a request header, so
this is not a trust decision about the caller. The rate limits (3/hour and
5/day per number, 10/hour per IP) become the only thing between a script and
JSW's SMS bill. Every bypass is logged server-side as `captcha_bypassed`, and
the list is **empty in Production**.

The block's authored model (`_register-form.json`) is **unchanged**: image,
heading, intro, notice, read positionally. It was deliberately left alone —
it is committed, content may already depend on it, and switching it to
key-value rendering would break that content and trip the linter's `max-cells`
limit.

## India-only in R1

The dial-code select carries only `+91`. Spec section 1.2 puts international
support out of scope, and `phone.js` rejects anything else — offering other
codes would produce an unexplained rejection. Client validation requires
`[6-9]` + 9 digits, matching the server exactly.

## OTP length

Six digits (`OTP_LENGTH`), matching the service default. The original design
showed four; four digits is 10,000 combinations, and with three attempts per
15-minute lockout that is tolerable but weak. **Note for B-03/B-04:** the
DLT-registered SMS template may fix the code length, in which case this and
`OTP_LENGTH` in the service config must agree — a mismatch delivers a code the
form cannot accept.

## Accessibility (axe-core is a blocking gate)

- Every control has a real `<label for>`, visually hidden via
  `.register-form-sr` so the placeholder-only design is unchanged.
  Placeholders are not labels.
- One `aria-live="polite"` status region per screen.
- Field errors set `aria-invalid` plus `aria-describedby` onto real text —
  state is never conveyed by colour alone.
- The resend countdown is announced through the status region, not by link
  state alone; a screen-reader user would otherwise never learn it expired.
- Focus moves to the first OTP box on entering the OTP screen, and to the
  mobile field on change-number.
- OTP boxes keep the original paste/backspace/auto-advance behaviour.

## Performance

- CAPTCHA provider script loads on **first focus of the mobile field**, not at
  decoration. Eager loading costs Lighthouse points on every page view for a
  form most visitors never open, and 95 is a blocking PR gate.
- Six OTP boxes at the original fixed 76px would need 496px and overflow a
  375px viewport, so they flex down on small screens and reach the design
  width from 600px up.
- `createOptimizedPicture` is imported from `scripts/dm.js`, never
  `scripts/aem.js` (per AGENTS.md). The previous version imported from
  `aem.js`, which would flatten a Dynamic Media picture to a single 750px
  source. `picture[data-dm]` is now skipped.

## Accessibility fixes made to the existing design

Two **real** WCAG AA contrast failures were found by axe-core and fixed in the
palette. Both are visual changes to an approved design, so they are worth
confirming with whoever owns the Figma:

| Token | Was | Now | Reason |
|---|---|---|---|
| `--rf-error` | `#e5484d` | `#cc2f35` | 3.91:1 on white and 3.43:1 on `--rf-error-bg` — under the 4.5:1 needed at 14px. The new value is the nearest to the original hue that passes on **both** (5.22:1 / 4.57:1) |
| `--rf-muted` | `rgb(35 35 35 / 60%)` | `rgb(35 35 35 / 64%)` | Resolved to `#7b7b7b` = 4.23:1, just under. 64% gives `#727272` = 4.81:1 |

Two further changes were made for correctness rather than to satisfy the
scanner:

- **`Resend` and `Change Number` are now `<button>`s, not `<a href="#...">`.**
  They perform an action; they do not navigate. More importantly, the previous
  disabled treatment was `pointer-events: none`, which blocks the mouse but
  **not the keyboard** — so during the countdown the link was still focusable,
  announced as available, and activatable with Enter. A real `disabled`
  attribute fixes all three.
- **The disabled button state uses an explicit `#6f6f6f` background** instead
  of `opacity: 0.4`, which put white label text at 2.52:1. WCAG exempts
  disabled controls from contrast, so this was permitted rather than required —
  but a legible disabled state is better than a permitted illegible one.

### A caveat on how this was measured

Two of the four original findings (the Submit button and the resend link) were
**artifacts of the test harness**, not real defects: the automation pane runs
with `document.hidden === true`, which throttles CSS transitions, so
`transition: opacity 0.15s` never completed and `getComputedStyle` reported the
pre-transition value on elements that were actually enabled. Any future axe run
against this block should neutralise transitions first:

```js
document.head.insertAdjacentHTML('beforeend',
  '<style>.register-form *{transition:none!important;animation:none!important}</style>');
```

With that in place the block reports **zero violations** across all six states:
fields, fields-with-all-errors, OTP, OTP-error, resend-available, success.

## Analytics

Every push goes through one `track()` call, so confirming event and property
names against the Implementation Playbook (**B-09**) is a one-function change.
Events: `leadform_view`, `leadform_otp_requested`, `leadform_otp_failed`,
`leadform_otp_verified`, `leadform_submitted`, `leadform_failed`. Never
includes phone, email or token.

## Lead payload

The service maps what this form collects. `fullName` is split server-side into
`firstName`/`lastName` on the last space, with the original string preserved —
the split is lossy for mononyms and for names where the family name comes
first, so the CRM can re-derive. `city` and `modelInterest` are **not
collected** and are omitted rather than sent empty. **If Salesforce requires
either, this form needs a field for it** — carried into B-05.

## Local development

```bash
npx -y @adobe/aem-cli up --no-open --html-folder drafts
```

Open `/drafts/register-form`, with a local stub of the three endpoints
returning the section 8.1 envelopes.

## Before go-live — remove these
 
Development affordances that exist only because the backing services are not
finished. Each one is safe where it is scoped, and **each one is wrong in
production**. They are listed here because a comment in the code it describes
is not a tracking mechanism — it vanishes the moment nobody is reading that
function.
 
| What | Where | Why it must go |
|---|---|---|
| CAPTCHA skipped on preview hosts | `captchaRequired()` | Paired with the service's `CAPTCHA_EXEMPT_ORIGINS`; the two must agree. Both go once the reCAPTCHA key covers the hosts in use. |
| `LEAD_API_MODE=stub` | `jsw-motors-app/.env` | Acknowledges the visitor with a `STUB-` reference and creates no lead. Switch to `live` when the lead contract lands (B-05). |
 
Neither fails loudly enough to stop a release on its own, which is the whole
reason they are written down here rather than left to a code comment.

## Error presentation

The block switches on `code`, never on `message`. `RESEND_TOO_SOON` should
never surface — the countdown prevents it; **treat it as a defect if seen**.
`CODE_EXPIRED` and `INVALID_CODE` stay distinct: resend versus retry.

A rejected origin arrives as a generic network failure, because the 403 carries
no CORS headers and the browser blocks the read. That is expected, and is why
`ALLOWED_ORIGINS` must include the preview origins for Stage.

## Style: Booking (`booking`)

The model now has a **Style** select (`classes`): Default (`""`, the registration form
above, unchanged) or Booking. It adds no row: existing content keeps working as authored.
The Booking code is in `register-form-booking.js` / `.css`, loaded only when the class is
present; `register-form.js` exposes two hooks to it and is otherwise unchanged for Default.

Authoring: the same fields.

| Field | Holds (dealer "Get in touch") |
| --- | --- |
| Decorative Image | required by the model, not shown in Booking (the Find Us card takes its place) |
| Image Alt Text | its description |
| Heading & Intro | `Get in touch with Meridian Motors` (H2); the intro paragraph is optional |
| Consent Text | the consent line next to the (still required) checkbox |
| Privacy Notice | the DPDP notice |
| Thank-you Page Link | optional; empty shows the in-page "Request sent" screen |

Journey: the dealer microsite's **quote request** (the deep links `#quote` and `#test-drive`,
used by the hero's and the price bar's buttons, scroll to the form), as in the dealer design:

1. **fields** ("Tell us about you"): the existing details screen, email optional and the
   pincode as in Default (required when the `registerFormRequirePincode` placeholder says so);
   the privacy notice sits above **Continue**, which sends the OTP;
2. **OTP pop-up** ("Verify your number"): the existing code boxes and resend, then
   **Change number** (back to the details; also the close button, desktop only as in the
   designs, and Esc) or **Submit**;
3. **Request sent pop-up** (unless a Thank-you Page Link is set, which still redirects):
   the **Request Sent Pop-up** field (Booking only): its heading is the title
   (`Request sent to Meridian Motors`), each paragraph starting with a bold label is a row
   (`**Dealer** Meridian Motors, Plot 14, …`), a plain paragraph is the status line
   (`Waiting for Meridian Motors to call you`) and a link is the outlined button
   (`Explore the Combat` → `#combat`). The block adds "A copy is on its way to {email}"
   (or "We will call you on {mobile}" without an email) and a **Contact** row; **Done** closes it and clears the form.

**Find Us card** (Booking only), the right side: "Our showroom" over a drawing of the
location (rings and a crosshair, the **Map Coordinates** at its top corners, **Find Us: Region**
under the pin), then "Find us", **Dealer Name**, **Dealer Address** (two lines, split after the
second comma), **Find Us: City** and **Find Us: PIN Code**, a **Get directions** button and
**Find Us: Closing Line**. Get directions opens Google Maps directions to the Map Coordinates
(e.g. `28°26' N, 77°06' E` or `28.4333, 77.1`), else to the Dealer Address; the dealer
footer's Open in maps link goes to the same point.

The pop-ups are `<dialog>`s (focus stays inside, the page behind is inert, the section snap
pauses via `html.is-modal-open`).

Look: the light dealer "Get in touch" design (`register-form-booking.css`): the form on the
left and the Find Us card on the right on desktop, sized on the prototype's 1280 × 720
frame. Below 900px it follows the dealer mobile design (its 375 frame): the heading, "Tell us
about you", the details, consent and notice, then the Find Us card (moved there by the block,
at its own height), then **Continue** at the foot of the screen; the OTP and Request sent pop-ups are the
design's 343 card centred on the screen, Request sent's two
buttons one under the other. Use it in a section with the **Light** style. If a step is
taller than the panel the form column scrolls on its own and the page snaps on once it
reaches the end.

**Consents** (as in Default): the Consent Text's first paragraph is the required privacy
consent (e.g. `I have read and understood the Terms of Use.`, a link on *Terms of Use*); a
second paragraph, typed after Enter, is the required marketing consent (e.g. `I agree to JSW
Motors storing my details … as in the Privacy Policy. Click on Know More.`). Its tick is sent
as `marketingConsent`, `personalization` and `modelEventInvites`. In Booking the consents'
links are underlined.

`lead-submit` receives the existing payload (with `pincode`, `consent` and the three
marketing flags) plus:

| Key | Value | Placeholder to override |
| --- | --- | --- |
| `source` | `Dealer Microsite` | `registerFormBookingSource` |
| `channel` | `Digital` | `registerFormBookingChannel` |
| `subsource` | empty for now | `registerFormBookingSubsource` |
| `dealerCodeSalesUnit` | the page property **Dealer Code** (page metadata `dealercode`); empty if not set | — |

No other keys are added: the lead API takes these four and nothing else beyond the
default payload. Labels are placeholders (`registerFormBooking*`) with English
fallbacks.
