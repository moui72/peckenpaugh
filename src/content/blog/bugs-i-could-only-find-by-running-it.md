---
title: The bugs I could only find by running the thing
description: A follow-up to the discipline-tool post. I ran ArDD on real work and it broke in ways I couldn't have reasoned about — worktree state committed in the wrong place, a git config flipped out from under me, and the redesign that made a dead agent a no-op instead of a mess.
date: 2026-07-14
---

Last week I wrote about [being bad at discipline and building a tool to compensate](https://peckenpaugh.us/blog/bad-at-discipline-built-a-tool-that-does-it/) — ArDD, a set of Claude Code skills that push a project through artifacts, plans, and tasks instead of letting an agent freewheel from a one-line prompt straight to code. I ended that post wondering whether it was just a good CLAUDE.md wearing a costume.

I'm the only person who runs ArDD (as of this writing), so what follows is really a decision record with the private parts filed off. But the thing it taught me generalized past my one tool, and the way it generalized is the reason I'm writing it down: it was invisible until I ran the thing and looked at what actually happened, and it was never findable by reading the code longer.

## State that lived in the wrong place

ArDD's core loop is plan → tasks → implement, and implement can hand work to a subagent running in its own git worktree, so you're not babysitting a single-threaded agent. The original design tried to be careful about the handoff: before delegating, it committed a bit of coarse state — the plan, the task list — to the main branch, on the theory that the delegated worktree needed a stable, already-landed point to branch from.

That theory was wrong, and I only found out because I ran a live smoke test instead of trusting the design: I committed a throwaway plan and task file, delegated the work to a subagent in a fresh worktree, and then actually looked at what the worktree contained.

It didn't match. The worktree had branched from `origin/main` and contained neither of the two commits I'd just made locally. The harness creates worktrees from the _remote_ tracking branch, not local HEAD, and that's not behavior I can steer from the skill's own prose.

The part that turned this from a fixable wrong default into a "never trust it" problem is that the base isn't even deterministic. [One report on the issue tracker](https://github.com/anthropics/claude-code/issues/62630) documents seven subagents spawned in a single call, each running `git rev-parse HEAD` as its first act: six came up on `origin/HEAD`, and one on the actual working commit — same repo, same harness version, same batch. So you can't correct for it with a fixed assumption in either direction, because the same setup that branches correctly one run can branch from the wrong base the next. The fix can't be "assume synced" or "assume fresh." It has to be: verify the worktree's base before trusting it, every time.

The same run surfaced something I still can't explain. Creating the worktree had flipped my _primary_ checkout's git config to `core.bare = true`, which breaks ordinary git in that checkout until you notice and revert it by hand. `git worktree add` has no business touching the config of the checkout you ran it from, and I never found the mechanism. So I didn't pretend to fix it: the coordinator now checks for the flip after every delegated run and shouts if it happened again. A tripwire on an unexplained harness bug is not a fix, and I'm not going to call it one — but a loud known-unknown beats a silent one.

The fix for the divergence is a small script, `worktree-align.sh`, that a delegated subagent runs as its mandatory first act: fast-forward the local default branch into the fresh worktree branch, and refuse to proceed if that isn't a clean fast-forward. No attempt to reconcile a messy divergence — just a deterministic check that either passes or stops the run.

But the change that outlived both fixes was a redesign they forced. The old flow committed coordinating state _before_ the work that justified it existed, which left two copies that could disagree. Now state rides the branch it's produced on and lands with the code at merge, the one moment they're guaranteed to arrive together. A tasks file's checkboxes, its `ready → in-progress → completed` status, the feature register's `tasked → implemented` flip, all live on the work branch, not on main in anticipation.

The payoff is that a dead run is now a no-op. If a delegated worktree dies halfway through, main never saw its half-finished state, so there's nothing to reconcile. The main branch still says what it said before, which is still true. It either merged or it didn't. That property is the whole point, and it's the one thing here I'd tell anyone building parallel-agent tooling to copy: don't materialize coordinating state ahead of the work; design it so an abandoned agent leaves no mess to clean up.

## The posture underneath

The framework critique from the first post still stands: ArDD doesn't make architectural judgment for you, and it never will. What changed is narrower. The parts that touch shared, mutable state, like git branches and worktree lifecycles, are now built the way I'd want a junior engineer to build them: refuse on anything ambiguous, never guess, and where you can't fix the root cause, at least put a tripwire on it so the failure is loud instead of silent.

That posture is the actual takeaway, and it's specific to agent tooling, where the dominant failure mode is a confident wrong guess made silently. None of it was reachable by staring at the code. It needed me to run the thing and look at what it did instead of what I told it to do — which, it turns out, is the only part of this a framework can't do for me either.
