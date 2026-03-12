---
name: interview-build-loop
description: Build timed interview apps feature-by-feature with short coding sprints, mandatory verification, and explicit user approval gates after each step. Use when the user describes an app to build during an interview, requests iterative feature delivery, or asks the agent to check in after each sprint.
---

# Interview Build Loop

## Purpose

Use this skill when the user is building an app in a timed interview and wants fast iteration with frequent check-ins.

## Required Behavior

- Work in short implementation sprints (2-5 minutes each).
- Build the smallest working slice first, then improve.
- If something breaks, fix it before continuing.
- Do not add unrequested features.
- Keep explanations concise unless the user asks for detail.

## Default Build Order

For each feature, implement in this order when relevant:

1. `packages/shared` types/state contract changes
2. `apps/server` handlers or API behavior
3. `apps/web` UI and client behavior

## Mandatory Approval Gates

Do not proceed past any gate until the user confirms.

For each feature:

1. **Plan gate**: share a 1-2 sentence implementation plan for the current slice and ask for approval.
2. **Sprint gate**: implement one small slice, then stop and report exactly what changed.
3. **Verification gate**: run browser-based visual verification when available and provide evidence (screenshot when possible). If browser tooling is unavailable, run available checks and request manual visual verification.
4. **Proceed gate**: ask if the user wants:
   - continue the same feature with another sprint, or
   - move to the next feature.

Never auto-advance to the next feature without explicit approval.

## Per-Sprint Response Format

After each sprint, respond in this structure:

1. `Intent`: what was targeted in this sprint (1 sentence)
2. `Changes`: key files and behaviors updated
3. `Verification`: visual/test result and any evidence
4. `Status`: done, partial, or blocked
5. `Question`: explicit approval request before proceeding

## Constraints To Respect

- Keep existing dark theme and design tokens.
- Keep top navigation layout unless user asks otherwise.
- Use Zustand for client state.
- Follow existing API client patterns for new features.
- Avoid broad refactors unless they are required to unblock the requested feature.

## Recommended Session Start

At session start:

1. Read `ARCHITECTURE.md`.
2. Restate feature #1 in one sentence.
3. Propose the first smallest slice.
4. Ask for approval before coding.
