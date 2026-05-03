# Q2 2026 Security Audit Baseline

**Generated:** 2026-05-03 from `pnpm audit --prod --json`
**Scope:** production dependencies only (devDependencies excluded)
**Roadmap link:** [`docs/ROADMAP_2026_Q2_DEFERRED.md`](../ROADMAP_2026_Q2_DEFERRED.md) — Sprint 7.1

**Updates:**
- 2026-05-03 — `next` 15.5.9 → 15.5.15 (PR forthcoming). Drops 2 highs (`GHSA-h25m-26qc-wcjf`, `GHSA-q4gf-8mx6-v5v3`). Post-bump audit: **24 high, 24 moderate, 4 low — 52 total**.

This document is the **starting state** of the production vulnerability backlog as of the date above. The new `.github/workflows/weekly-security-audit.yml` will keep an open issue tagged `security-audit` updated against this baseline. When `pnpm audit --prod` reports zero high/critical, the workflow goes silent and we can retire this doc.

## Severity totals

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 26 |
| Moderate | 27 |
| Low      | 4 |
| **Total** | **57** |

26 high-severity advisories span **13 unique modules**. Most are transitive — addressed only by upgrading the parent package or adding a pnpm override.

## Triage classification

### Direct dep, patch available — fix this week

| Module | Current vuln range | Patched in | Action |
|--------|--------------------|------------|--------|
| ~~`next`~~ | ~~`>=13.0.0 <15.5.15`~~ | ~~`>=15.5.15`~~ | ✅ **Done 2026-05-03** — bumped to `15.5.15`. |

### Transitive, parent owns the fix — file upstream / wait for next release

| Module | Path (one example) | Patched in | Owner package | Notes |
|--------|---------------------|------------|---------------|-------|
| `axios` | `.>square>square>@apimatic/axios-client-adapter>axios` | `>=1.13.5` | `square` SDK | Square SDK pins an older axios. File issue or wait for SDK release. Prototype-pollution DoS. |
| `valibot` | `.>@t3-oss/env-core>valibot` | `>=1.2.0` | `@t3-oss/env-core` | ReDoS in EMOJI_REGEX. Low real-world reach. |
| `effect`, `defu` | `.>@prisma/client>prisma>@prisma/config>...` | `>=3.20.0` / `>=6.1.5` | `prisma` | Prisma config internals. Bump prisma when 6.x lands a patched build. |
| `playwright` | `.>next>@playwright/test>playwright` | `>=1.55.1` | `next` | Even though we don't ship Playwright to prod, it appears in the prod graph via `next`'s peer-friendly install. Watch for next minor that bumps it. |
| `rollup`, `picomatch`, `serialize-javascript`, `minimatch` | `.>@sentry/nextjs>...` | various | `@sentry/nextjs` | Sentry's webpack-plugin pulls a vintage rollup. Sentry usually bundles its own; check if a `@sentry/nextjs` upgrade resolves all four at once before adding overrides. |
| `socket.io-parser`, `glob`, `@isaacs/brace-expansion`, `minimatch` | `.>react-email>...` | various | `react-email` | react-email pulls in socket.io for its preview server. We do not run that server in production builds, but it shows up in the prod graph. Either upgrade `react-email`, or move it to devDependencies if confirmed unused at runtime. |
| `picomatch`, `minimatch` | `.>jest-watch-typeahead>jest>...` | various | jest | This appears under `--prod` because of how the lockfile is structured; jest is a devDep. Verify with `pnpm why jest-watch-typeahead`. If only devDep, ignore. |

### Acceptance candidates (low real-world impact)

The minimatch / picomatch / brace-expansion ReDoS family is reachable only when an attacker controls a glob pattern compiled at runtime. Our code does not feed user input into these. They will close out automatically when the parents above are upgraded; no manual mitigation needed.

## Per-module advisory list (verbatim from `pnpm audit`)

### @isaacs/brace-expansion

- **[HIGH]** `<=5.0.0` → patched in `>=5.0.1`
  - @isaacs/brace-expansion has Uncontrolled Resource Consumption
  - CWE: CWE-1333
  - https://github.com/advisories/GHSA-7h2j-956f-4vf2

### axios

- **[HIGH]** `>=1.0.0 <=1.13.4` → patched in `>=1.13.5`
  - Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig
  - CWE: CWE-754
  - https://github.com/advisories/GHSA-43fc-jf86-j433

### defu

- **[HIGH]** `<=6.1.4` → patched in `>=6.1.5`
  - defu: Prototype pollution via `__proto__` key in defaults argument
  - CWE: CWE-1321
  - https://github.com/advisories/GHSA-737v-mqg7-c878

### effect

- **[HIGH]** `<3.20.0` → patched in `>=3.20.0`
  - Effect AsyncLocalStorage context lost/contaminated inside Effect fibers under concurrent load with RPC
  - CWE: CWE-362
  - https://github.com/advisories/GHSA-38f7-945m-qr2g

### glob

- **[HIGH]** `>=11.0.0 <11.1.0` → patched in `>=11.1.0`
  - glob CLI: Command injection via -c/--cmd executes matches with shell:true
  - CWE: CWE-78
  - https://github.com/advisories/GHSA-5j98-mcp5-4vw2

### minimatch (4 advisory ranges, all ReDoS variants)

- **[HIGH]** `<3.1.3` → patched in `>=3.1.3` — repeated wildcards (CWE-1333) — https://github.com/advisories/GHSA-3ppc-4f35-3m26
- **[HIGH]** `>=8.0.0 <8.0.5` → patched in `>=8.0.5` — repeated wildcards
- **[HIGH]** `>=9.0.0 <9.0.6` → patched in `>=9.0.6` — repeated wildcards
- **[HIGH]** `>=10.0.0 <10.2.1` → patched in `>=10.2.1` — repeated wildcards
- **[HIGH]** `<3.1.3` → patched in `>=3.1.3` — matchOne combinatorial backtracking (CWE-407) — https://github.com/advisories/GHSA-7r86-cg39-jmmj
- **[HIGH]** `>=8.0.0 <8.0.6` → patched in `>=8.0.6` — matchOne combinatorial backtracking
- **[HIGH]** `>=9.0.0 <9.0.7` → patched in `>=9.0.7` — matchOne combinatorial backtracking
- **[HIGH]** `>=10.0.0 <10.2.3` → patched in `>=10.2.3` — matchOne combinatorial backtracking
- **[HIGH]** `<3.1.4` → patched in `>=3.1.4` — nested *() extglobs (CWE-1333) — https://github.com/advisories/GHSA-23c5-xmqv-rm74
- **[HIGH]** `>=8.0.0 <8.0.6` → patched in `>=8.0.6` — nested *() extglobs
- **[HIGH]** `>=9.0.0 <9.0.7` → patched in `>=9.0.7` — nested *() extglobs
- **[HIGH]** `>=10.0.0 <10.2.3` → patched in `>=10.2.3` — nested *() extglobs

### next

- **[HIGH]** `>=15.5.1-canary.0 <15.5.10` → patched in `>=15.5.10`
  - Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components
  - CWE: CWE-400, CWE-502
  - https://github.com/advisories/GHSA-h25m-26qc-wcjf
- **[HIGH]** `>=13.0.0 <15.5.15` → patched in `>=15.5.15`
  - Next.js has a Denial of Service with Server Components
  - CWE: CWE-770
  - https://github.com/advisories/GHSA-q4gf-8mx6-v5v3

### picomatch

- **[HIGH]** `<2.3.2` → patched in `>=2.3.2`
  - Picomatch has a ReDoS vulnerability via extglob quantifiers
  - CWE: CWE-1333
  - https://github.com/advisories/GHSA-c2c7-rcm5-vvqj
- **[HIGH]** `>=4.0.0 <4.0.4` → patched in `>=4.0.4` (same advisory)

### playwright

- **[HIGH]** `<1.55.1` → patched in `>=1.55.1`
  - Playwright downloads and installs browsers without verifying the authenticity of the SSL certificate
  - CWE: CWE-347
  - https://github.com/advisories/GHSA-7mvr-c777-76hp

### rollup

- **[HIGH]** `>=4.0.0 <4.59.0` → patched in `>=4.59.0`
  - Rollup 4 has Arbitrary File Write via Path Traversal
  - CWE: CWE-22
  - https://github.com/advisories/GHSA-mw96-cpmx-2vgc

### serialize-javascript

- **[HIGH]** `<=7.0.2` → patched in `>=7.0.3`
  - Serialize JavaScript is Vulnerable to RCE via RegExp.flags and Date.prototype.toISOString()
  - CWE: CWE-96
  - https://github.com/advisories/GHSA-5c6j-r48x-rmvq

### socket.io-parser

- **[HIGH]** `>=4.0.0 <4.2.6` → patched in `>=4.2.6`
  - socket.io allows an unbounded number of binary attachments
  - CWE: CWE-754
  - https://github.com/advisories/GHSA-677m-j7p3-52f9

### valibot

- **[HIGH]** `>=0.31.0 <1.2.0` → patched in `>=1.2.0`
  - Valibot has a ReDoS vulnerability in `EMOJI_REGEX`
  - CWE: CWE-1333
  - https://github.com/advisories/GHSA-vqpr-j7v3-hqw9

## Suggested next steps (in order)

1. **Bump `next` to `15.5.15+`** — direct dep, single PR, kills two GHSAs.
2. **`pnpm why react-email` and `pnpm why jest-watch-typeahead`** — confirm whether these belong in dependencies or devDependencies. Moving to dev would drop ~7 of the high advisories from `--prod` immediately.
3. **`@sentry/nextjs` upgrade** — check the changelog for one that bundles a current rollup/picomatch/serialize-javascript. Single bump, four advisories close.
4. **Set up Dependabot/Renovate** (Sprint 7.2) so the prisma / square / t3-oss upstream fixes land here automatically when published.
5. **Add `accepted-risks.md`** for any advisory that survives the above passes after we've confirmed no exploitable path in our code.
