# AdSense readiness

Status: PARTIALLY IMPLEMENTED; not approval-ready based on live evidence.

## Verified in repository

- AdSense publisher metadata and script are present in `app/layout.tsx`.
- `public/ads.txt` contains the existing publisher record.
- Consent-aware scripts and privacy messaging configuration exist.
- Privacy, Terms, About, Contact and Editorial Policy pages exist.
- Ad units are configuration-controlled.

## Blockers

- The configured production domain returned HTTP 503 with `DEPLOYMENT_PAUSED` during the audit, so ads.txt and consent behavior were not externally verified.
- Google CMP behavior for applicable regions was not browser-tested.
- Actual ad density and game-page spacing were not measured.

## Required before enabling broader advertising

1. Restore the intended production deployment.
2. Verify `/ads.txt` and publisher ownership externally.
3. Test consent choice, revocation and denied defaults on representative routes.
4. Confirm ads do not overlap controls, inputs or gameplay.
5. Check the latest Google policies before release.

No AdSense approval or revenue is guaranteed.
