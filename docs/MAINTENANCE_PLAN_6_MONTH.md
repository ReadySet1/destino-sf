# Destino SF — 6-Month Maintenance Plan

**Period:** April – September 2026
**Prepared:** April 6, 2026
**Prepared by:** Development Team

---

## Overview

This plan ensures the Destino SF website remains secure, fast, and reliable over the next 6 months. It's organized into monthly focus areas, with recurring tasks that happen every month.

---

## Monthly Recurring Tasks (Every Month)

These are "keep the lights on" activities that should happen consistently:

| Task | What It Means | Time Estimate |
|------|---------------|---------------|
| **Dependency updates (minor)** | Update software libraries to get bug fixes and small improvements | 2–3 hours |
| **Security patch review** | Check for and apply any security fixes | 1–2 hours |
| **Database health check** | Verify the database is running smoothly, check storage usage | 1 hour |
| **Backup verification** | Confirm automated backups are running correctly | 30 min |
| **Error log review** | Check for recurring errors or new issues | 1–2 hours |
| **Performance spot-check** | Verify page load times are within acceptable range | 1 hour |
| **Test suite run** | Run the full test suite to catch any regressions | 30 min |

**Estimated monthly recurring effort: 7–10 hours**

---

## Month 1 — April 2026: Foundation & Monitoring

*Focus: Establish monitoring baselines and close out the Q2 audit*

| Priority | Task | Description | Effort |
|----------|------|-------------|--------|
| High | **Merge Q2 audit to production** | Deploy all security, performance, and quality improvements ([PR #139](https://github.com/ReadySet1/destino-sf/pull/139)) | 2 hours |
| High | **Set up uptime monitoring** | Configure alerts for when the website goes down or responds slowly | 3 hours |
| Medium | **Generate bundle size baseline** | Record current website size to track future changes | 2 hours |
| Medium | **Create admin notifications table** | Enable the admin dashboard alerts feature (8 pending items depend on this) | 4 hours |
| Low | **Clean up stale branches** | Remove old development branches that have been merged | 1 hour |

**Estimated effort: 12 hours + recurring**

---

## Month 2 — May 2026: Performance & Caching

*Focus: Make the website faster for customers*

| Priority | Task | Description | Effort |
|----------|------|-------------|--------|
| High | **Activate product catalog caching** | Use the existing Redis infrastructure to cache product data — pages load faster, database gets less traffic | 6 hours |
| Medium | **Add loading animations to Account page** | Customers see smooth loading instead of blank screen while their order history loads | 3 hours |
| Medium | **Optimize product detail pages** | Pre-generate popular product pages so they load instantly | 4 hours |
| Low | **Review image sizes** | Ensure product and catering images are optimized for web | 3 hours |

**Estimated effort: 16 hours + recurring**

---

## Month 3 — June 2026: Major Upgrade Cycle

*Focus: Upgrade core technologies to stay current and supported*

Several major updates are available. These should be done carefully, one at a time:

| Priority | Task | Description | Risk Level | Effort |
|----------|------|-------------|------------|--------|
| High | **Upgrade Next.js 15 → 16** | The website framework has a new major version with performance improvements and new features | Medium | 8 hours |
| High | **Upgrade Tailwind CSS 3 → 4** | The styling system has a new version with better performance | Medium | 6 hours |
| Medium | **Upgrade Zod 3 → 4** | The data validation library has breaking changes | Low | 4 hours |
| Medium | **Upgrade Sentry 9 → 10** | The error tracking tool has a new major version | Low | 3 hours |
| Low | **Upgrade remaining packages** | Update Prisma (6→7), Resend (4→6), Square SDK (42→44), lucide-react (0.x→1.x), and other major bumps | Medium | 8 hours |

**Why this matters:** Outdated software stops receiving security updates and eventually becomes incompatible with other tools. Staying current prevents a painful "big bang" upgrade later.

**Estimated effort: 29 hours + recurring**

---

## Month 4 — July 2026: Testing & Reliability

*Focus: Catch more bugs before they reach customers*

| Priority | Task | Description | Effort |
|----------|------|-------------|--------|
| High | **Re-enable skipped test suites** | Activate the ~40 test groups that are currently disabled, fixing any that need updates | 12 hours |
| High | **Add checkout & payment tests** | Ensure the most critical customer flow (buying something) is thoroughly tested | 8 hours |
| Medium | **Add admin workflow tests** | Test the admin dashboard features (product management, order management) | 6 hours |
| Medium | **Enforce test coverage minimums** | Automatically prevent deployments that reduce test coverage | 3 hours |
| Low | **Add job history tracking** | Store records of automated tasks (syncs, cleanups) for troubleshooting | 4 hours |

**Estimated effort: 33 hours + recurring**

---

## Month 5 — August 2026: Code Quality & Developer Experience

*Focus: Make future development faster and less error-prone*

| Priority | Task | Description | Effort |
|----------|------|-------------|--------|
| Medium | **Reduce remaining `any` types** | Fix ~56 places where the code bypasses type safety checks — prevents entire categories of bugs | 8 hours |
| Medium | **Convert more client components** | Move additional components to server-side rendering where possible — reduces JavaScript sent to customers | 6 hours |
| Medium | **Add API documentation** | Document all website endpoints so future developers can understand the system quickly | 6 hours |
| Low | **Address remaining TODO items** | Work through the 56 TODO comments in the codebase, prioritizing by business impact | 8 hours |
| Low | **Set up bundle size monitoring** | Automatically flag when code changes make the website significantly larger | 3 hours |

**Estimated effort: 31 hours + recurring**

---

## Month 6 — September 2026: Review & Planning

*Focus: Assess progress and plan the next cycle*

| Priority | Task | Description | Effort |
|----------|------|-------------|--------|
| High | **Full security audit** | Repeat the comprehensive security review done in March 2026 | 8 hours |
| High | **Performance audit** | Run Lighthouse tests on all key pages and compare to April 2026 baseline | 4 hours |
| Medium | **Dependency audit** | Review all third-party packages for security vulnerabilities and needed updates | 4 hours |
| Medium | **Database optimization review** | Check for slow queries, unused indexes, and storage optimization opportunities | 4 hours |
| Medium | **Create Q4 2026 roadmap** | Based on findings, plan the next 3-month improvement cycle | 4 hours |
| Low | **Documentation review** | Ensure all docs are current and accurate | 3 hours |

**Estimated effort: 27 hours + recurring**

---

## 6-Month Summary

| Month | Focus Area | Estimated Hours |
|-------|-----------|-----------------|
| April | Foundation & Monitoring | 12 + 8 recurring |
| May | Performance & Caching | 16 + 8 recurring |
| June | Major Upgrade Cycle | 29 + 8 recurring |
| July | Testing & Reliability | 33 + 8 recurring |
| August | Code Quality & DX | 31 + 8 recurring |
| September | Review & Planning | 27 + 8 recurring |
| **Total** | | **~196 hours** |

**Average: ~33 hours/month** (roughly 8 hours/week)

---

## Risk Items to Watch

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Next.js 16 migration complexity** | Could take longer than estimated if breaking changes affect many pages | Allocate buffer time; test in a separate branch first |
| **Square SDK breaking changes** | Payment processing is critical — any issues here directly affect revenue | Test thoroughly in sandbox environment before deploying |
| **Supabase free tier limits** | Database may need upgrading as traffic grows | Monitor usage monthly; plan for paid tier if needed |
| **Zod 4 migration** | Used extensively for data validation — breaking changes could cascade | Migrate incrementally, starting with non-critical paths |
| **SSL certificate renewal** | Expired certificates take the site offline | Verify auto-renewal is configured; set calendar reminders |

---

## Success Metrics

At the end of 6 months, we should see:

| Metric | Current (April 2026) | Target (September 2026) |
|--------|---------------------|------------------------|
| Automated test count | 1,911 | 2,500+ |
| Skipped test suites | ~40 | < 10 |
| Page load time (homepage) | Baseline TBD | < 2 seconds |
| Major dependency versions behind | 32 packages | 0 packages |
| Known security issues | 0 critical | 0 critical |
| Uptime | No monitoring | 99.9% tracked |
| `any` type violations | ~56 | < 15 |

---

*This plan should be reviewed and adjusted monthly based on business priorities, customer feedback, and any urgent issues that arise.*
