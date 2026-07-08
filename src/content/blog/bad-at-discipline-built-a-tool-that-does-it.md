---
title: I'm bad at discipline, so I built a tool that does it
description: I built my own spec-driven-development framework, mostly to protect my code from my own worst habit. A postmortem, a pivot, and a retrofit test.
date: 2026-07-07
---

I have a bad habit. I get excited about an idea, and it's half built before I stop to ask whether I'm building it right. Sometimes that works out. This is a post about a time it didn't, and the process I built afterward so it would happen a little less often.

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

## Agents build; they don't judge

Agents are eager, and they are genuinely good at getting something working. They match the patterns already in front of them, they satisfy the linter, they get the tests green. That's real, and it's most of why they feel like magic in a healthy codebase: there's a standard to imitate, and they imitate it well.

But that competence is borrowed from the surroundings. Point one at an empty repo with a spec and it'll build exactly what you asked for and nothing you didn't. It isn't going to weigh SOLID against YAGNI, or notice that two files are drifting toward the same responsibility, or check whether the library already ships the thing it's about to hand-roll. It'll happily put the whole feature in one file if that's the shortest path to "working," because "working" is what you asked for. The judgment about shape — the right seams, what deserves its own module, what shouldn't exist at all — is the part you have to bring, because in a fresh repo there's nothing for the agent to copy it from. The 927-line file wasn't the agent failing. It was the agent succeeding at a job I'd under-specified, with nothing watching the shape of the code while it did.

## The pivot

Around the same time, I started a separate project where I cared a lot about getting the fundamentals right, and wanted the documentation to be load-bearing rather than incidental. I did not want to repeat the mess. So I tried Spec Kit again, cleanly, in a fresh project. About a day in I stopped and typed, to my agent:

> i asm starting to feel speckit isn't right for this project

The rest of that same message turned out to be the founding spec of **artifact-driven-dev**: bootstrap a new system inspired by Spec Kit, generate a handful of living artifacts (infrastructure, data model, UI), and build project skills for refining each one, generating research and plans, and turning plans into tasks.

## What ArDD is

The core idea, straight from the README: **capture decisions you've already made, instead of discovering them through structured elicitation.** That's the real split from Spec Kit. Spec Kit helps you find out what you need through guided questioning. That's not how I think. I want something that would let me get the ideas in my head into the context my agent would work in, and would make sure I included the boring parts an agent won't supply on its own: data-model first, encapsulation, no 1000-line spaghetti files.

ArDD is a set of Claude Code skills, installed into a project as slash commands, built around a five-step loop: **Capture → Analyze → Plan → Execute → Converge.**

- **Artifacts** are living markdown files under `.project/artifacts/`: a constitution, plus whatever the project needs (data model, UI, infrastructure, API), each carrying a `draft` or `stable` status. You can't plan against a draft.
- **`/ardd-analyze`** is a cross-artifact consistency check, required before planning. It's the only writer of `STATUS.md`, the one file that says whether the artifacts still agree with each other.
- **`/ardd-verify`** checks artifacts against the actual codebase and logs drift to `DEFECTS.md`. The four-file tempo contradiction becomes something you catch on a schedule, not once by accident.
- **`/ardd-critique`** argues with a decision on simplicity, failure modes, and robustness before it's locked in. Its first version buried me in output, which is exactly how I found out I needed it to track findings to resolution instead of just listing them.
- **Scoped tasks:** each task declares which artifacts it depends on, so implementation loads only the context it needs.

The constitution versions itself with semver and a changelog baked into the file. ArDD eventually ended up managing its own constitution, which felt like either a good sign or a warning, and I still can't tell which.

I'm upfront in the README that this is disciplined, not lightweight. It assumes you show up with architectural and product vision clarity. The overhead pays for itself on greenfield projects and major pivots, and it's dead weight on a mature, stable codebase. I decided the trade was worth it for the way I work.

## Rebuilding the band app

The day I stopped work on the old repo, I pointed `/ardd-codify` at it and started `sync-tab-scroll`. The new constitution is, in effect, a running postmortem: every principle carries a dated rationale naming the exact bug it exists to prevent. The bootstrap-files-only principle cites the 927-line file. The anti-duplication principle cites the 300-line switch, and the hand-rolled cursor that never should have existed, once alphaTab (the rendering library the rebuild standardized on) turned out to ship its own.

The rebuild also caught fresh mistakes as I made them. `VITE_BACKEND_PORT=6081` prefixed only half of a `build && preview` shell command and silently broke a local proxy. No error, just a build quietly doing the wrong thing. Same day, that became a new constitutional principle (config via `.env`) and a lint check, `pnpm check:env`. In the old repo it would have been an undocumented gotcha I rediscovered in three months.

The guardrails did not suddenly make me careful. Setting ArDD up to ignore its own generated skill files, I reached for `.gitignore` and blanket-ignored `.claude/`, which buried real config. I narrowed it to `.claude/skills/` and buried real config again. It took a third pass, and a written decision record, to stop stepping on the same rake. I built a discipline tool and still needed the discipline tool.

## The retrofit test: assisted-review

I didn't trust ArDD yet. I'd shaped it around two projects, and the only test that meant anything was whether it held up on one I hadn't.

`assisted-review` is a CLI I'd been building for about six weeks before ArDD existed: it fetches a GitHub PR or GitLab MR, splits the diff into chunks, and pages through the review one chunk at a time with AI commentary. Ninety commits of history, none of it captured as artifacts. One `/ardd-codify` run reverse-engineered a full artifact set from the codebase, which is the retrofit path rather than the greenfield bootstrap, and where the framework actually got stress-tested:

- **The constitution/CLAUDE.md boundary.** A principle banning hosted exposure got softened to "revisit later," then reverted entirely once I noticed a principle that permits its own future violation isn't constraining anything. The concern moved to CLAUDE.md as ordinary coding guidance. A constitution holds hard, versioned decisions; CLAUDE.md holds everything softer. I only found the line because a second project made me draw it.
- **`/ardd-feedback`.** Real usage turned up a skill ArDD didn't have: capturing bugs and reconsidered decisions found by looking at the running thing, as opposed to critiquing artifacts on paper. Feedback wins over the artifacts, but the agent has to flag the discrepancy and ask.
- **Tooling distribution.** Should a consuming repo commit the generated skill files? No. Gitignore them, commit a small pointer file recording which ArDD commit is installed, push updates from the source repo.
- **Drift catches.** An `/ardd-verify` pass caught the docs calling the backend CommonJS when it's actually ESM. Logged to `DEFECTS.md`, fixed, versioned as a constitution patch.

The eighty-odd commits since are almost entirely ArDD-shaped, and real features have shipped through the loop: OS-aware keyboard hints, retry/backoff for partial GitLab submit failures, inline comment editing, a state-anchor migration for comments on diffs that shift under a reopened PR.

None of this made me slower to get excited, which was never the goal and probably isn't possible anyway. I still move too fast. The only thing that changed is that now something writes down what I decided while I'm moving, so the version of me three features deep can go look it up instead of guessing. That's the whole trick. If you build the same way I do, maybe it's useful to you. If not, I hope watching me ignore my own tooling twice in a row was at least entertaining.

## Do you actually need all this?

Fair question. I ask it myself. ArDD is a lot of machinery — a constitution, a five-step loop, a stack of skills, status and defect files you have to keep honest — and you could reasonably look at all of it and ask whether it's just a good CLAUDE.md wearing a costume.

Maybe it is. I'm not going to pretend everyone who moves fast needs a versioned constitution with a semver changelog; for plenty of projects that's exactly the over-engineering I keep accusing myself of. Half the value here is probably nothing more exotic than deciding what matters and writing it down, and you can do that in a plain text file with no framework at all.

But "be careful" has never once stopped me. I've had CLAUDE.md files quietly say "be careful" and watched it get ignored completely. ArDD is heavier because heavier is what actually changes what I do — the overhead is the point, the friction that lands between me and the mistake I'm about to make for the second time. Is it strict? Yes. Is it more discipline than most people would want? Almost certainly. I like it, and I use it every day, because it fits the specific way I get myself into trouble. That's the whole recommendation: not that you need it, just that I do. Maybe you'll like mine. Maybe Spec Kit is more your speed — it's genuinely good, no shade. Maybe you'll build your own, and my experience is one more data point for it.
