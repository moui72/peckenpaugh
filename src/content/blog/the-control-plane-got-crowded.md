---
title: The control plane got crowded
description: "Two months after taking agent workflows apart, I went looking at what had shipped since. Most of it runs, isolates, and watches agents. Much less of it carries a project's decisions to the agents doing the work."
date: 2026-11-12
draft: true
---

At the end of my [last post](/blog/taking-agent-workflows-apart/), I said that what I still wanted to understand was how consistently a project's own instructions reach every step of a workflow, including work delegated to another agent. I've since spent some time looking at what other people have been building in this space, partly to see whether someone had already answered that.

A lot has shipped in the two months since. I've put the tools I looked at into a [companion map of the agent tooling landscape](/agent-landscape/), sorted into the same three planes I used before: knowledge, delivery, and control. This post is about the pattern I saw when I did that, and the questions it left me with.

## What shipped

The biggest change is that several editors now treat agents, rather than files, as the main thing on screen. [Cursor 3](https://cursor.com/blog/cursor-3) was rebuilt around a workspace for running local and cloud agents side by side. Google split the agent manager out of [Antigravity](https://antigravity.google/blog/introducing-google-antigravity-2/) into its own app. [Devin Desktop](https://devin.ai/blog/windsurf-is-now-devin-desktop), formerly Windsurf, opens to a board of agent sessions. GitHub's [Agent HQ](https://github.blog/news-insights/company-news/welcome-home-agents/) puts Copilot, Claude, and Codex sessions in one Mission Control view.

There are open-source versions of the same idea. [T3 Code](https://github.com/pingdotgg/t3code) and [Orca](https://github.com/stablyai/orca), both MIT licensed, run whichever coding agents you already have installed and can give each task its own Git worktree. They are not small: as of November 12, 2026, Orca has about 122,000 GitHub stars and T3 Code about 57,000.

Underneath many of these is the [Agent Client Protocol](https://agentclientprotocol.com/), which lets one interface drive many different agents. And then there are projects that treat agents as an organization: Steve Yegge's [Gas Town](https://github.com/gastownhall/gastown), with named roles like a mayor that assigns work and a witness that checks on stuck workers, and [Paperclip](https://github.com/paperclipai/paperclip), with org charts and budgets.

## Mostly control and delivery

When I sorted these into the planes, most of what they do landed in two of them.

In the control plane, almost every tool gives each task its own worktree. They route work to agents, track whether each agent is working, waiting, or finished, and show it all on a board or a list. Orca has a command-line interface that lets one agent start, message, and wait on others. Gas Town has a watchdog role whose job is to notice stuck workers and nudge or escalate them.

In the delivery plane, the emphasis is on getting finished work back: diffs to review, pull requests opened in one click, and in Gas Town's case a [merge queue](https://github.com/gastownhall/gastown/blob/4b24a16e5195faa01ffc052db611a01530484854/docs/design/architecture.md#L206) that batches changes, tests them together, and bisects when the batch fails.

The knowledge plane isn't empty. [Kiro](https://kiro.dev/docs/specs/) builds requirements, a design, and a task list before writing code, and [Spec Kit](https://github.com/github/spec-kit), [OpenSpec](https://github.com/Fission-AI/OpenSpec), and [Backlog.md](https://github.com/MrLesk/Backlog.md) all keep specs or tasks as files in the repository. Augment's [Intent](https://www.intentapp.dev/) has a coordinator agent write a spec for each task that every agent in the workspace works from, and describes that spec as a running record of what was decided and why. [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) says its decisions "stay explicit" and its context "carries forward" across changes, which is close to what I'm after. But most of the specs these tools produce are about one change at a time: they describe what a feature should do, then get implemented and set aside. And the tools that keep specs and the tools that run many agents mostly don't know about each other. What I found much less of is a record of project-level decisions that stays current across changes and is carried into the work of each agent an orchestrator starts.

## How the rules reach the workers

That brings me back to the question from my last post. I had Claude read the source of T3 Code, Orca, and Gas Town to see how each one passes a project's instructions to the agents it starts. Using the terms from that post, the answer was different for each, and none of them carries the project's decisions themselves.

T3 Code and Orca mostly leave it to the agent's own instruction loading. Orca usually runs the agent's command-line tool in a terminal in the worktree, and when T3 Code starts Claude Code through Anthropic's SDK, it asks it to load the [project's settings and instruction files](https://github.com/pingdotgg/t3code/blob/cf906e1fcfb8a0a91262382acaec44f4e7f9f800/apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts#L5191). Either way, the agent reads the same `CLAUDE.md` or `AGENTS.md` it would read if you ran it yourself. That works, but a worker in a fresh worktree only sees the instruction files on the branch it started from. In [an earlier post](/blog/bugs-i-could-only-find-by-running-it/) I found that Claude Code's own subagent worktrees don't always start from the branch you'd expect. I don't know whether these tools branch the same way, but it's the kind of thing I'd want to check.

Orca adds a layer of agent-directed guidance. Its [orchestration guide](https://github.com/stablyai/orca/blob/04158606b5deb127b0dd5fdd2735f146f171cd19/skill-guides/orchestration.md#L97) tells a coordinating agent to make each task spec self-contained: the target, the change, the constraints, what the worker may edit, and the evidence that proves it's done. That's a reasonable instruction, but whether the constraints actually make it into each spec depends on the coordinator following it.

Gas Town goes furthest. A [session-start hook](https://github.com/gastownhall/gastown/blob/4b24a16e5195faa01ffc052db611a01530484854/docs/agent-provider-integration.md#L283) runs `gt prime`, which injects each agent's role instructions, and operators can add [role directives](https://github.com/gastownhall/gastown/blob/4b24a16e5195faa01ffc052db611a01530484854/docs/design/directives-and-overlays.md#L23) per project that are marked as overriding the workflow's instructions where they conflict. That is the harness invoking the behavior rather than the agent being asked to. But what it injects is policy about how a role behaves, such as reporting back instead of posting review comments to GitHub, not a decision about the system being built.

In my governance terms, these tools help with apply, carrying whatever instructions exist into the worker's context. Gas Town also does some resolving, but for operator policy about roles. None of them resolves which of the project's own decisions apply to the task a particular agent is about to start.

## An open question: where shared state should live

The other thing I kept running into was state. When several agents work in parallel, each one needs to know what the others have claimed and which files they're changing, so two of them don't take the same task or rewrite the same module. I haven't found an answer to where that information should live that I'm happy with.

In my [July post](/blog/bugs-i-could-only-find-by-running-it/), I moved ArDD's task state onto the branch where the work happens, so that it lands with the code at merge and a dead run leaves nothing behind. I still think that was right for task progress. But state on a branch is invisible to the agents working on other branches until it merges, so it can't tell a sibling agent what's been claimed.

The tools I looked at answer this in different ways:

- **The tool's own database.** Orca and T3 Code keep their state in your home directory, in SQLite and JSON. Every agent the tool starts can see it, but it belongs to that tool, not the project.
- **Files committed to the repository.** [Beads](https://github.com/gastownhall/beads), the issue tracker Gas Town is built on, used to keep its issues in a JSONL file committed with the code, and later had a workflow built on a separate sync branch. Current versions [keep the data](https://beads.gascity.com/reference/git-integration) in a Dolt database stored under its own Git ref, separate from the code's branches, and handle merge conflicts at the database level.
- **A coordination server.** [MCP Agent Mail](https://github.com/Dicklesworthstone/mcp_agent_mail), now being rewritten [in Rust](https://github.com/Dicklesworthstone/mcp_agent_mail_rust), gives agents advisory file reservations: leases on paths that expire, with an optional pre-commit check that refuses to commit files someone else has reserved.
- **Git itself, outside the working tree.** All of a repository's worktrees share one `.git` directory, and custom Git refs can be pushed and fetched like branches. Either could hold this kind of state without it being committed alongside the code, and Beads' database is already an example of the second. I haven't seen a tool keep simple claim or lease records in either place, and I haven't tried it.

Each of those gives a different guarantee. A lease that expires behaves differently from a lock, and both behave differently from a merge queue that only finds the conflict afterward. My taxonomy's thesis was to never let two tools independently own the same canonical state. When the orchestrator, the workflow, and Git all have a reasonable claim to "who is working on what," I'm not sure yet which of them should own it.

## How I did this

This was a long conversation with Claude Code, using Claude Opus 5.5. Claude read the source of T3 Code, Orca, and Gas Town from fresh clones, but didn't run any of them, so what I say about them is about how they're designed, not how they behave in use. I found many of these tools through comparison posts, some of them written by competitors, but the links here go to each project's own pages or repository. This area is moving quickly enough that some of it will be out of date soon. The [companion map](/agent-landscape/) lists a source for each entry.

As with the taxonomy, this is a working interpretation, not a ranking. If I've misread how one of these tools works, I'd like to know.
