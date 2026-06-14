# WeHearYou Agent Instructions

**Author:** Manus AI  
**Purpose:** Durable project-memory instructions for Claude, Manus, and other coding agents working on WeHearYou.  
**Last updated:** June 8, 2026

## 1. Project Summary

**WeHearYou** is a reputation growth and testimonial marketing platform for local businesses, service brands, agencies, franchises, and multi-location operators. The product helps businesses collect more positive reviews, route unhappy customers into private feedback before they post publicly, capture and publish video testimonials, display social proof widgets on websites, and track review-link performance across channels such as QR codes, email signatures, invoices, websites, staff sharing, and campaign links.

The product should feel like a modern SaaS platform for **review growth, private feedback capture, testimonial publishing, trust widgets, and local-business reputation automation**. The experience should be polished, practical, reliable, and easy for non-technical business owners to understand.

## 2. Core Product Modules

Future agents should understand the product as a connected system, not as isolated screens. The major modules are listed below.

| Module | Purpose | Notes |
|---|---|---|
| **Dashboard** | Gives business owners a command-center view of reputation activity. | Should highlight next-best actions, review performance, setup progress, and urgent issues. |
| **Locations** | Manages business locations and location-specific review destinations. | Important for multi-location workflows and review routing. |
| **Review Pages / Review Links** | Provides persistent review-request destinations and shareable links. | Used in QR codes, email signatures, invoices, staff outreach, and campaigns. |
| **Funnels** | Routes happy customers toward public reviews and unhappy customers toward private feedback. | Negative-review filtering should be handled carefully and ethically. |
| **Campaign Wizard** | Creates targeted review-request campaigns. | Should be simple, guided, and preview-driven. |
| **Widgets** | Publishes social proof on customer websites. | Includes trust badges, floating widgets, testimonial widgets, and review/social proof displays. |
| **Video Testimonials** | Requests, manages, captions, thumbnails, publishes, and embeds video testimonials. | Current thumbnail/caption work should be treated as working functionality that needs UX polish, not a backend rebuild. |
| **Automation** | Runs workflows based on manual enrollment, webhook events, appointment/project completion, delays, and messaging actions. | Current state is partially functional and needs observability, retry safety, delivery logs, activation guardrails, and compliance work. |
| **Analytics** | Tracks review-link and campaign performance. | Should eventually connect impressions, clicks, conversions, reviews, widget interactions, and source attribution. |

## 3. Development Principles

Agents should prioritize **safe iteration** over broad rewrites. WeHearYou already contains working implementation pieces, so most tasks should refine, harden, or extend existing behavior.

| Principle | Instruction |
|---|---|
| **Preserve working logic** | Do not rebuild backend logic, schemas, validation, upload/capture flows, routing, or rendering behavior unless the task explicitly requires it. |
| **Work in small phases** | Implement one coherent phase at a time, then verify and commit. |
| **Prefer additive changes** | Add observability, UI, validation, and guardrails before replacing existing flows. |
| **Keep business users in mind** | The UI should explain what is happening in plain language, not expose raw engineering concepts unless necessary. |
| **Use production-safe defaults** | Avoid actions that can duplicate sends, expose private data, break customer pages, or publish unreviewed content. |
| **Surface limitations honestly** | If a feature is partial, show the limitation clearly in the UI or completion summary. |
| **Avoid unrelated changes** | Do not reformat, rename, restyle, or restructure unrelated files while working on a focused task. |

## 4. Required Verification Before Claiming Completion

Every implementation task should finish with verification. If a test script does not exist, run the available build/typecheck commands and explicitly say what could not be tested.

| Verification | Requirement |
|---|---|
| **TypeScript/typecheck** | Run the project’s typecheck command if available. |
| **Build** | Run the production build command if practical. |
| **Lint/test** | Run lint or tests if configured. If no test script exists, state that clearly. |
| **Manual smoke test** | For UI changes, load the affected page and verify the main user path. |
| **Regression check** | Confirm existing important flows still work. |
| **Commit state** | Commit verified milestones with clear messages, unless explicitly told not to. |

Agents should not say a feature is “production-ready” unless verification has passed and known limitations have been documented.

## 5. Git and Commit Rules

This project should use careful Git hygiene.

| Rule | Instruction |
|---|---|
| **Commit in phases** | Each meaningful phase should be committed after verification. |
| **Use clear messages** | Commit messages should explain the product-level change, not just the file touched. |
| **Avoid dirty handoff** | Before stopping, summarize uncommitted files, current branch, latest commit hash, and next step. |
| **Do not discard work casually** | Never run destructive Git commands unless explicitly requested. |
| **Main branch caution** | If working directly on `main`, be extra careful to verify before pushing. |
| **PR option** | Use a feature branch and PR when review is desired or the change is risky. |

## 6. UI and Product Design Standards

WeHearYou should look like a premium, modern SaaS product. Avoid screens that feel like raw database administration or developer utilities.

| Area | Standard |
|---|---|
| **Information hierarchy** | Use clear page headers, concise explanatory text, status cards, tabs, drawers, and grouped actions. |
| **Actions** | Primary actions should be visually clear. Destructive actions should be secondary and confirmed where appropriate. |
| **Status states** | Use consistent chips for states such as Draft, Active, Paused, Pending, Published, Failed, Needs Setup, Missing Consent, and Ready. |
| **Empty states** | Explain what is missing, why it matters, and what to do next. |
| **Previews** | Whenever content will be public, show a live preview or realistic preview before publishing. |
| **Technical details** | Hide raw embed code, IDs, payloads, and logs behind copy buttons, drawers, advanced sections, or setup tabs. |
| **Mobile usability** | Drawers, modals, forms, and tables should remain usable on smaller screens. |
| **Consistency** | Reuse existing card, badge, button, drawer, tab, and layout patterns when available. |

## 7. Video Testimonials Guidance

The video testimonial feature already includes backend-oriented work for video thumbnail upload, frame capture, fallback handling, thumbnail source selection, and display integration. Future agents should treat this as a working foundation.

### Do Not Rebuild Unless Explicitly Asked

Do not replace the database fields, thumbnail source logic, upload validation, frame capture, server actions, fallback behavior, or widget rendering unless a specific bug requires it.

### Preferred UX Direction

The feature should feel like a **testimonial publishing studio**. The main list should show polished testimonial cards with thumbnail, reviewer, location, status, caption preview, consent/publishing state, and clear actions. Caption editing and thumbnail editing should be simple, guided, and preview-driven.

| Improvement Area | Desired Behavior |
|---|---|
| **Caption editing** | Describe captions as public descriptions shown with the video. Include helper text, character guidance, save state, and clear distinction from private request prompts. |
| **Thumbnail editing** | Use an Edit Thumbnail drawer/modal with Auto, Capture, and Upload tabs. Include current thumbnail preview, save state, and public widget preview. |
| **Public preview** | Show how the video testimonial will appear in widgets or embeds before publishing. |
| **Embed code** | Hide raw iframe code behind a Copy Embed or Embed Code action unless the user opens it. |
| **Status clarity** | Show whether the testimonial is Published, Pending Review, Needs Thumbnail, Missing Consent, or Ready to Publish. |

### Known UI Risk

A previous drawer implementation rendered one fixed-position drawer per testimonial and made all drawers visible at once. Future agents should ensure thumbnail editor drawers are hidden by default, opened only for the selected testimonial, and close via close button, Escape, and backdrop click.

## 8. Automation Guidance

Automation is a critical module and should be handled cautiously. The current implementation is not just a placeholder: it includes models, builder surfaces, webhook ingestion, manual enrollment, delayed jobs, cron routes, and email/SMS send paths. However, it should still be considered **partially functional** until observability, retry safety, delivery logging, activation guardrails, compliance, and tests are complete.

### Automation Priorities

| Priority | Work Area | Reason |
|---:|---|---|
| **P0** | Persist step outcomes | Users need durable proof of what happened in each automation run. |
| **P0** | Add run history and queue visibility | Admins must see runs, jobs, failures, skipped steps, and pending work. |
| **P0** | Add retry/idempotency safety | Automation must avoid silent permanent failures and duplicate sends. |
| **P0** | Add activation guardrails | Users should not activate workflows that cannot send or have missing providers. |
| **P1** | Add delivery logs | Email/SMS/webhook attempts should be auditable. |
| **P1** | Add webhook setup diagnostics | External integrations need endpoint, signing, sample payloads, and test logs. |
| **P1** | Add SMS/email compliance checks | Opt-out, consent, quiet hours, and provider readiness must be respected. |
| **P2** | Add templates | Users should start from common workflows rather than blank automations. |

### Automation Implementation Rules

Do not build more UI on top of non-persisted automation results if the task requires reliable reporting. If step outcomes only exist in memory or in a response array, first persist them. Prefer a durable `AutomationStepExecution` model or equivalent structure linked to `AutomationRun`, `AutomationStep`, optional `AutomationJob`, optional `Campaign`, and relevant contact/location context.

Avoid relying on `updatedAt` as a completion timestamp. Add or use a real `completedAt` field for automation runs. If a run creates a campaign, store a reliable relationship so the Runs UI can show “View campaign.”

### Suggested Automation Build Order

| Phase | Scope |
|---:|---|
| **1** | Observability UI: Builder, Runs, Queue, Setup tabs; provider readiness cards. |
| **2** | Persistence foundation: step outcomes, completedAt, campaign link, idempotency key. |
| **3** | Reliability: retry fields, backoff, locking, safe retry/cancel controls. |
| **4** | Builder: edit/reorder/duplicate steps, activation checklist, test mode. |
| **5** | Trigger setup: webhook instructions, sample payloads, recent event diagnostics. |
| **6** | Delivery/compliance: delivery logs, opt-out, quiet hours, consent checks. |
| **7** | Tests: webhook, manual enrollment, pending jobs, sends, skips, retries, failures. |

## 9. Widget and Social Proof Guidance

Widgets should be treated as customer-facing marketing assets, not just technical embeds. Any widget-related page should include preview, install guidance, source selection, and clear publishing state.

| Area | Guidance |
|---|---|
| **Preview** | Show realistic desktop and mobile previews. |
| **Install guidance** | Provide platform-specific instructions where possible: Webflow, WordPress, Shopify, Squarespace, custom HTML. |
| **Copy actions** | Copy embed code and install snippets should be clearly labeled. |
| **Trust design** | Widgets should look polished, fast-loading, and trustworthy. |
| **Fallbacks** | Empty widget states should not look broken; use useful placeholders or hide unavailable content. |

## 10. Review Links, Funnels, and Campaigns Guidance

Review growth flows are central to WeHearYou. They should be clear, ethical, and easy to set up.

| Area | Guidance |
|---|---|
| **Review Links** | Treat persistent review links as first-class assets. Include QR, copy link, source tracking, and channel usage guidance. |
| **Funnels** | Make it clear what happens for happy vs. unhappy customers. Keep private feedback respectful and actionable. |
| **Campaigns** | Campaign creation should be guided, preview-driven, and channel-aware. |
| **Analytics** | Track source, clicks, conversions, and review outcomes where possible. |
| **Negative feedback** | Route unhappy customers to private resolution without using manipulative or deceptive language. |

## 11. Marketing Page Guidance

The marketing website should position WeHearYou as a modern review-growth and testimonial platform. The tone should be polished, confident, friendly, and practical.

### Core Messaging

The main outcomes are: **get more 5-star reviews**, **capture private feedback before it becomes public**, and **turn happy customers into video testimonials and website social proof**.

| Section | Recommended Content |
|---|---|
| **Hero** | Strong headline, concise value proposition, primary CTA, product mockup. |
| **Problem** | Missed reviews, public negative feedback, lack of visible trust, manual follow-up burden. |
| **Solution** | Review links, funnels, testimonials, widgets, analytics, automation. |
| **Features** | Review links, QR codes, negative feedback routing, video testimonial requests, thumbnail/caption editing, testimonial library, widgets, analytics, multi-location tools. |
| **Use cases** | Local businesses, agencies, franchises, healthcare, home services, beauty/wellness, restaurants, professional services. |
| **Social proof** | Testimonials, logos, review cards, trust badges, before/after review growth. |
| **CTA** | “Start Growing Reviews,” “Book a Demo,” or “Get Started.” |

## 12. File and Code Navigation Hints

These paths may change, but they are useful starting points based on the current project structure.

| Area | Likely Path |
|---|---|
| **Left navigation / app shell** | `src/components/app-shell.tsx` |
| **Alternative sidebar component** | `src/components/sidebar.tsx` if present |
| **Automation page** | `src/app/automation/` |
| **Automation detail page** | `src/app/automation/[id]/page.tsx` |
| **Automation client UI** | `src/app/automation/automation-client.tsx` |
| **Automation engine** | `src/lib/automation-engine.ts` |
| **Automation helpers** | `src/lib/automation.ts` |
| **Automation webhook route** | `src/app/api/webhooks/automation/route.ts` |
| **Automation cron route** | `src/app/api/cron/route.ts` |
| **Pending automation runner** | `src/app/api/automation/run-pending/route.ts` |
| **Video testimonials page** | Search under `src/app/` for `video` or `testimonial`. |
| **Widget customizer** | `src/components/widget-customizer.tsx` |
| **Campaign wizard** | `src/app/campaign-wizard/` |
| **Review links page** | `src/app/review-links/` |
| **Prisma schema** | `prisma/schema.prisma` |
| **Vercel config** | `vercel.json` |
| **Package scripts** | `package.json` |

When paths are uncertain, search the repository rather than guessing. Prefer targeted searches for component names, route names, model names, and visible UI text.

## 13. Security, Privacy, and Compliance Rules

Agents must protect customer data and production systems.

| Rule | Instruction |
|---|---|
| **No secrets in memory** | Do not store API keys, database URLs, tokens, webhook secrets, or private credentials in project memory. |
| **Do not expose secret values** | Provider readiness UI should show configured/not configured, never the actual secret. |
| **Protect customer data** | Avoid pasting private customer information into public files, logs, or prompts. |
| **Be careful with SMS** | SMS requires opt-out, consent, quiet hours, and accurate sender configuration before production use. |
| **Be careful with automation** | Prevent duplicate sends, runaway retries, and accidental public publishing. |
| **Confirm destructive actions** | Deleting data, resetting migrations, force-pushing, or discarding branches requires explicit confirmation. |

## 14. Preferred Handoff Summary Format

At the end of each meaningful task, provide a concise handoff summary.

```md
## Handoff Summary

**Branch:** main or feature branch name  
**Latest commit:** short hash and message  
**Files changed:** key files only  
**Verification:** typecheck/build/test/manual smoke result  
**What changed:** short product-level summary  
**Known limitations:** honest list  
**Next recommended step:** one concrete next task  
**Uncommitted changes:** yes/no  
```

This makes it easier to pause work and resume later without losing context.

## 15. Standard Prompt Prefix for Coding Agents

Use this prefix when asking a coding agent to work on WeHearYou:

> Work carefully in small phases. Preserve existing working backend behavior unless a targeted change is required. Do not rebuild functioning systems. Make the smallest safe change that achieves the task. Keep the UI polished and business-user friendly. Run typecheck/build or the closest available verification before claiming completion. Commit verified milestones with clear messages. If you discover a deeper limitation, stop and explain it before building more UI on top of incomplete data.

## 16. Definition of Done

A WeHearYou feature or refactor is not complete merely because code was written. It is complete when the user flow is understandable, the data is reliable, failure states are visible, and the change has been verified.

| Dimension | Done Means |
|---|---|
| **Functionality** | The intended user path works end to end. |
| **Reliability** | Failures, retries, skipped states, and edge cases are handled or documented. |
| **UI quality** | The interface is clear, polished, and consistent with the rest of the app. |
| **Data integrity** | Important outcomes are persisted and inspectable later. |
| **Security** | Secrets are protected and sensitive actions are guarded. |
| **Verification** | Typecheck/build/tests/manual smoke checks have passed or limitations are stated. |
| **Handoff** | The final state, commit, limitations, and next step are clearly documented. |

## 17. What Not to Do

Agents should avoid the following patterns because they create risk and slow the project down.

| Anti-pattern | Why It Is Bad |
|---|---|
| **Large rewrites without need** | They often break working flows and make debugging harder. |
| **UI over non-persisted data** | It creates dashboards that look useful but cannot prove what happened. |
| **Silent skips** | Users need to know why an automation, send, widget, or publish action did not happen. |
| **Raw technical clutter** | Business users should not be forced to read raw JSON, iframe code, or logs by default. |
| **Unverified “done” claims** | Typecheck/build/manual verification should happen before calling work complete. |
| **Secrets in docs or memory** | This creates security risk. |
| **Discarding work without confirmation** | This can permanently lose progress. |

## 18. Recommended Project Memory Files

This file should be one of several concise memory files. The project memory folder should contain summaries, not the whole repository.

| Memory File | Purpose |
|---|---|
| `wehearyou_agent_instructions.md` | Safe working rules for agents. |
| `wehearyou_product_context.md` | Product overview, target users, positioning, and modules. |
| `wehearyou_feature_status.md` | Done, partially done, not done, and needs verification checklist. |
| `wehearyou_architecture_map.md` | Key routes, components, models, APIs, and deployment notes. |
| `wehearyou_automation_plan.md` | Automation completion roadmap and implementation phases. |
| `wehearyou_ui_guidelines.md` | Dashboard, widget, drawer, card, preview, and marketing-site style guidance. |

## 19. Short Version for Future Agents

WeHearYou is a review-growth, feedback, testimonial, widget, and automation SaaS for local businesses and multi-location operators. Preserve working code, work in small verified phases, avoid broad rewrites, make UI business-friendly, persist important outcomes, expose failures clearly, protect secrets, run typecheck/build, and commit clean handoffs. Automation and video testimonials already have real foundations; improve them through observability, reliability, UX polish, and guardrails rather than rebuilding them from scratch.
