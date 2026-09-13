---
title: Taking agent workflows apart
description: "Comparing ArDD, Superpowers, and Spec Kit led me to a more useful question: what does each module do, how does it take effect, and who makes sure it runs?"
date: 2026-09-13
---

I have been exploring other coding agent systems and tools, as I think the state of the art has moved past the [ArDD project](https://github.com/moui72/artifact-driven-dev) I started just a couple months ago, a sign of the unprecedented times for the field that we are living in.

During that exploration, I learned about [Superpowers](https://github.com/obra/superpowers#the-basic-workflow), which seems to do a large percentage of what [ArDD](https://github.com/moui72/artifact-driven-dev) and [Spec Kit](https://github.com/github/spec-kit) do, combining many benefits from both, and packaged in a better way (global skill, rather than embedded in the project's repo).

I still felt, though, that some of what had motivated [ArDD](https://github.com/moui72/artifact-driven-dev) was left unsolved, but that combining the two together was not the solution. This meant I had to do some work: breaking these things down into composable parts, so I could describe what I felt like needed a new, [Superpowers](https://github.com/obra/superpowers#the-basic-workflow)-compatible solution.

I've put the initial result into an [interactive map of ArDD, Superpowers, and Spec Kit](/tool-taxonomy/) I built with Codex (GPT6 Astra). It compares capabilities and their mechanisms, with project governance traced through to execution. The map is a working interpretation of the sources examined, developed in conversation with an AI coding agent. It isn't a benchmark of which tool produces better software. It's a work in progress, but I am transparent by nature, and I wanted to share it sooner than later. I expect further iterations will be forthcoming.

## A command is a bundle

ArDD keeps decisions in living project documents, then turns those decisions into plans and tasks. [Superpowers](https://github.com/obra/superpowers#the-basic-workflow) puts much of its emphasis on how the agent performs the work: design approval, testing, review, and verification. [Spec Kit](https://github.com/github/spec-kit) makes the progression from requirements to technical plan to tasks explicit.

There is enough overlap, though, that comparing their lists of commands didn't seem like it would answer my question. A single command can ask questions, edit architectural decisions, draft a plan, request approval, generate tasks, and update the status of several artifacts. I wanted to look at those responsibilities separately, even when the tool packages them together in one prompt.

I found it useful to group the responsibilities into three planes:

- **Knowledge:** project principles, system models, problem discovery, specifications, and technical decisions.
- **Delivery:** decomposition, implementation, testing, debugging, review, and integration.
- **Control:** routing, state management, isolation, orchestration, validation, and connections to external systems.

I don't mean these as three things to install separately, or as stages that you finish and move on from. They are just a way of making the comparison easier to think about. Implementing something can reveal a problem with its design, and reviewing it can reveal a requirement that was missing in the first place.

## Governance crosses the boundaries

In the first version of the map, I put governance in the knowledge plane, as that seemed like the obvious place for a project's constitution. I wasn't satisfied with that, though, because it described where the rules were written down without saying much about how they would affect the work. Governance that doesn't inform execution isn't doing anything useful.

A rule in the skill the agent is already following seems more likely to affect its behavior than a rule in a document it may or may not read. That is part of what appeals to me about Superpowers. But I also want to be able to change a project's rules without having to edit the general-purpose skill that applies them. Putting both in the same place makes that harder to reason about.

That led me to split governance into a few separate responsibilities:

- **Define:** state the outcomes and constraints the project requires.
- **Resolve:** decide which project rules, defaults, and exceptions apply to this task.
- **Apply:** carry those rules into the plan and the implementer's and reviewer's context.
- **Assure:** collect evidence of compliance and enforce the checks that can be enforced.

For a bug fix, that might mean having a rule requiring regression coverage, deciding whether it applies to this change, asking for a test that reproduces the bug before fixing it, and reviewing the test evidence before merge. Writing the rule down addresses only the first part, which is why I didn't think keeping governance entirely in the knowledge plane was enough.

Superpowers does have a way to customize this: its [bootstrap instructions](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md) give direct user instructions and project instruction files precedence over skill defaults. Its [planning template](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md) also carries global constraints from the spec into the plan. So my initial impression that its governance would be difficult to tailor wasn't entirely fair. What I still want to understand is how consistently those project-specific instructions reach every step, including work delegated to another agent.

## Mechanism changes the guarantee

Once I had separated out the responsibilities, I also wanted to describe how each tool actually carries them out. Two tools can appear to offer the same capability while relying on very different things to make it happen.

ArDD's constitution, for example, is a document that its skills tell the agent to read. I think of it as an extension of the policy in an `AGENTS.md` or `CLAUDE.md`, but that doesn't mean the harness will load it the same way. Something has to make sure it gets read.

Much of the rest of the behavior in these tools is also described in prose: skills tell the agent what to do, and agent specifications describe a role, the context it needs, and what it should return. There are also scripts that perform operations directly, hooks that connect those operations to events, and checks or access controls that can prevent an action without relying on the agent to decide against it.

The distinction I kept coming back to was that a validation script can be deterministic without being reliably invoked. Even if it runs, something still has to act on the result.

Consider the same validation script in four settings:

- A person remembers to run it.
- A skill tells the agent to run it.
- A harness hook or CI event invokes it.
- A required check prevents merging when it fails.

These could all use exactly the same script, but I would have different expectations of how reliably the validation would affect the work in each case.

Even calling something a "hook" doesn't quite settle this. Superpowers' [Claude hook configuration](https://github.com/obra/superpowers/blob/main/hooks/hooks.json) activates at session start, including specified restart and compaction events. Spec Kit's [implementation template](https://github.com/github/spec-kit/blob/main/templates/commands/implement.md) tells the agent to invoke extension hooks at points in its flow. I want the map to preserve that difference: in one case the harness invokes the behavior, while in the other the agent is instructed to do so.

I think agent specifications need a similar breakdown. Asking an agent to act as a reviewer gives it a particular focus. Giving it a separate context can help keep it from simply following the implementer's reasoning. Restricting its tools, where the harness supports that, actually limits what it can do. I would want to know which of those a tool provides, rather than just whether it has something called a reviewer.

## What I want from a module

I now want a module to answer a few concrete questions before I trust it as part of a larger system:

- What responsibility does it own, and what canonical state may it change?
- What policy does it consume, and how are conflicts resolved?
- What mechanism performs the work, and who invokes it?
- What happens when it fails: a report, a question, or a blocked operation?
- What survives an interruption, and how does the next run recover?

This gets closer to explaining why I didn't think installing both tools would solve the problem. Having several agents inspect the same record seems reasonable, but having several tools update it means they need to agree on how that works. I also don't want a generated status report to become another thing I have to keep in sync, or an execution log to become the place where architectural decisions are made just because that's what the agent has in context.

I still think there is something worth preserving in ArDD's living project documents. What I want to explore next is how to make those project decisions reliably inform the plans, implementation, reviews, and checks in a Superpowers workflow. That seems more useful to me than maintaining a second task queue alongside the one already being used to do the work.

For now, the [interactive map](/tool-taxonomy/) is where I've put the more detailed comparisons. I expect some of those details to change as the tools do, and some of my interpretations may need correcting. My hope is that breaking things down this way will help me describe what I want to build next, and make it easier for other people to point out what I've missed.
