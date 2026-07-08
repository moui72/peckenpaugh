---
title: Scaffolding for someone who moves too fast
description: I built my own spec-driven-development framework, mostly to protect my code from my own worst habit. A postmortem, a pivot, and a retrofit test.
date: 2026-07-07
---

I build fast. I get excited about something, and it's half way complete before I stop to think about whether I'm doing it right, which is how I get somewhere good quickly and also how I get somewhere unmaintainable quickly. This is a post about the second one, and the process I built to protect myself from it.

The idea, for the record, was a multiplayer Songsterr: a guitar tab that scrolls in lockstep with a shared transport, so five people in five different rooms can follow the same beat. It was also an excuse to finally try spec-driven development, which had been showing up everywhere, including at work where folks I respect were singing the praises of GitHub's Spec Kit, so that's where I started.

Ten days and sixteen feature specs later, I had a mess.

## What went wrong

Spec Kit gives you a pipeline (`specify` → `plan` → `tasks` → `implement`) plus an `/analyze` step to catch inconsistencies before they become bugs. The pipeline worked. The problem was upstream of it, and it was me: I hadn't decided which decisions needed locking down before I started generating artifacts. So the artifacts accumulated unevenly and drifted, from each other and from the code, at roughly the speed I was adding features.

Some of the concrete damage:

- **Inconsistent rigor.** Some of the sixteen specs had a full spec → plan → tasks → contracts → data-model chain. Others were a bare `spec.md` with nothing behind it. There was no rule for which got which, so I couldn't tell from the folder structure how solid a given feature actually was.
- **Specs that disagreed with their own contracts.** One type was specified as `{measureNumber, row, x, width}`. The actual contract had nine differently-named fields. One doc capped session participants at 10; the plan built against 8.
- **A tempo-change contradiction across four files:** data model, WebSocket contract, quickstart, and the spec itself. A decision I made in a later session never propagated back to the docs I'd written earlier.
- **A missing user story.** Seek had acceptance criteria, a success metric, and contract message types, but no implementation tasks, because nothing forced a check that every story had them.
- **A "NON-NEGOTIABLE" TDD principle, violated twice.** Two implementation tasks had no preceding test task. The principle was written down and wired to nothing that could stop me.
- **Untestable success criteria.** "No observable drift." "Differs by no more than one bar," where bar length varies by time signature, so that one never resolved to an actual number.
- **A hand-rolled cursor overlay,** reconciled against a separately-computed layout map, built because I never checked whether the rendering library already shipped one. It did.
- **A 927-line entry file** and a 300-line switch over 20 message types, both needing a dedicated multi-day refactor just to become legible again. Nothing in the spec process was watching the shape of the code, only whether features were done. I caught this one by eye, late.

None of this was Spec Kit's fault. `/speckit-analyze` did its job every time I ran it. It's just that when I've seen Spec Kit succeed, it's been in a mature code base with lots of examples of how to do things right. I was starting from scratch, and I let it create its own examples of how to do things wrong.

## The pivot

Around the same time, I started a separate project where I cared a lot about getting the fundamentals right, and wanted the documentation to be load-bearing rather than incidental. I did not want to repeat the mess. So I tried Spec Kit again, cleanly, in a fresh project. About a day in I stopped and typed, to my agent:

> i asm starting to feel speckit isn't right for this project

The rest of that same message turned out to be the founding spec of **artifact-driven-dev**: bootstrap a new system inspired by Spec Kit, generate a handful of living artifacts (infrastructure, data model, UI), and build project skills for refining each one, generating research and plans, and turning plans into tasks.

## What ArDD is

The core idea, straight from the README: **capture decisions you've already made, instead of discovering them through structured elicitation.** That's the real split from Spec Kit. Spec Kit helps you find out what you need through guided questioning. That's not how I think. I want something that would let me get the ideas in my head into the context my agent would work in, and would make sure I included the boring parts that I take for granted when I write code myself: SOLID, DRY, YAGNI/KISS; data-model first; encapsulation; no 1000-line spaghetti files.

ArDD is a set of Claude Code skills, installed into a project as slash commands, built around a five-step loop: **Capture → Analyze → Plan → Execute → Converge.**

- **Artifacts** are living markdown files under `.project/artifacts/`: a constitution, plus whatever the project needs (data model, UI, infrastructure, API), each carrying a `draft` or `stable` status. You can't plan against a draft.
- **`/ardd-analyze`** is a cross-artifact consistency check, required before planning. It's the only writer of `STATUS.md`, the one file that says whether the artifacts still agree with each other.
- **`/ardd-verify`** checks artifacts against the actual codebase and logs drift to `DEFECTS.md`. The four-file tempo contradiction becomes something you catch on a schedule, not once by accident.
- **`/ardd-critique`** argues with a decision on simplicity, failure modes, and robustness before it's locked in. Its first version buried me in output, which is exactly how I found out I needed it to track findings to resolution instead of just listing them.
- **Scoped tasks:** each task declares which artifacts it depends on, so implementation loads only the context it needs.

The constitution versions itself with semver and a changelog baked into the file. ArDD eventually ended up managing its own constitution, which was either a good sign or a sign I'd gone too far.

I'm upfront in the README that this is disciplined, not lightweight. It assumes you show up with architectural and product vision clarity. The overhead pays for itself on greenfield projects and major pivots, and it's dead weight on a mature, stable codebase. I decided the trade was worth it for the way I work.

## Rebuilding the band app

The day I stopped work on the old repo, I pointed `/ardd-codify` at it and started `sync-tab-scroll`. The new constitution is, in effect, a running postmortem: every principle carries a dated rationale naming the exact bug it exists to prevent. The bootstrap-files-only principle cites the 927-line file. The anti-duplication principle cites the 300-line switch, and the hand-rolled cursor that never should have existed, once alphaTab (the rendering library the rebuild standardized on) turned out to ship its own.

The rebuild also caught fresh mistakes as I made them. `VITE_BACKEND_PORT=6081` prefixed only half of a `build && preview` shell command and silently broke a local proxy. No error, just a build quietly doing the wrong thing. Same day, that became a new constitutional principle (config via `.env`) and a lint check, `pnpm check:env`. In the old repo it would have been an undocumented gotcha I rediscovered in three months.

For the record, the guardrails didn't make me infallible. Setting ArDD up to ignore its own generated skill files, I reached for `.gitignore` and blanket-ignored `.claude/`, which buried real config. I narrowed it to `.claude/skills/` and buried real config again. It took a third pass, and a written decision record, to stop stepping on the same rake. I built a discipline tool and still needed the discipline tool.

## The retrofit test: assisted-review

I didn't trust ArDD yet. Building a thing and having a thing survive contact with a project you didn't design it around are different, and the second one is the only one that counts.

`assisted-review` is a CLI I'd been building for about six weeks before ArDD existed: it fetches a GitHub PR or GitLab MR, splits the diff into chunks, and pages through the review one chunk at a time with AI commentary. Ninety commits of history, none of it captured as artifacts. One `/ardd-codify` run reverse-engineered a full artifact set from the codebase, which is the retrofit path rather than the greenfield bootstrap, and where the framework actually got stress-tested:

- **The constitution/CLAUDE.md boundary.** A principle banning hosted exposure got softened to "revisit later," then reverted entirely once I noticed a principle that permits its own future violation isn't constraining anything. The concern moved to CLAUDE.md as ordinary coding guidance. A constitution holds hard, versioned decisions; CLAUDE.md holds everything softer. I only found the line because a second project made me draw it.
- **`/ardd-feedback`.** Real usage turned up a skill ArDD didn't have: capturing bugs and reconsidered decisions found by looking at the running thing, as opposed to critiquing artifacts on paper. Feedback wins over the artifacts, but the agent has to flag the discrepancy and ask.
- **Tooling distribution.** Should a consuming repo commit the generated skill files? No. Gitignore them, commit a small pointer file recording which ArDD commit is installed, push updates from the source repo.
- **Drift catches.** An `/ardd-verify` pass caught the docs calling the backend CommonJS when it's actually ESM. Logged to `DEFECTS.md`, fixed, versioned as a constitution patch.

The eighty-odd commits since are almost entirely ArDD-shaped, and real features have shipped through the loop: OS-aware keyboard hints, retry/backoff for partial GitLab submit failures, inline comment editing, a state-anchor migration for comments on diffs that shift under a reopened PR.

None of this made me slower to get excited, which was never the goal. It just means that when I'm three features deep and can't remember what I committed to at the start, there's a file that can. I move fast; ArDD writes down what I decided while I was moving, so the version of me who has to live with it can find out what I promised.
