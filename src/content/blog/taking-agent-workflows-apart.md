---
title: Taking agent workflows apart
description: "Comparing ArDD, Superpowers, and Spec Kit led me to a more useful question: what does each module do, how does it take effect, and who makes sure it runs?"
date: 2026-09-13
---

I started this exploration with a question about my own tool: if I adopt Superpowers, does ArDD still earn its keep?

That question led to a comparison, then a taxonomy, then a problem with the taxonomy. The useful part was discovering how many different things I had been putting under the word "workflow."

I've put the result into an [interactive map of ArDD, Superpowers, and Spec Kit](/tool-taxonomy/). It compares capabilities and their mechanisms, with project governance traced through to execution. The map is a working interpretation of the sources we examined, developed in conversation with an AI coding agent. It isn't a benchmark of which tool produces better software.

## A command is a bundle

ArDD keeps decisions in living project documents, then turns those decisions into plans and tasks. [Superpowers](https://github.com/obra/superpowers#the-basic-workflow) puts much of its emphasis on how the agent performs the work: design approval, testing, review, and verification. [Spec Kit](https://github.com/github/spec-kit) makes the progression from requirements to technical plan to tasks explicit.

Each reaches into the others' territory. Counting commands doesn't tell me much about where one could replace another. A single command can ask questions, edit architectural decisions, draft a plan, request approval, generate tasks, and advance several lifecycle states. Those are separate responsibilities even when one prompt contains all of them.

I found it useful to group the responsibilities into three planes:

- **Knowledge:** project principles, system models, problem discovery, specifications, and technical decisions.
- **Delivery:** decomposition, implementation, testing, debugging, review, and integration.
- **Control:** routing, state management, isolation, orchestration, validation, and connections to external systems.

These are lenses for examining a tool. They aren't three products that should be installed independently, and they aren't a sequence you finish once. Execution can reveal a problem with the design; a review can reveal a missing requirement.

## Governance crosses the boundaries

The first version put governance in the knowledge plane. That described where the constitution lived, but missed what made it useful. Governance only earns its place when it changes execution.

A constitution that nobody reads has little effect. A rule embedded in the skill an agent is currently following has a much more direct path to action. But embedding policy in a reusable procedure also couples the project's choices to the tool author's defaults.

So governance needs a finer split:

- **Define:** state the outcomes and constraints the project requires.
- **Resolve:** decide which project rules, defaults, and exceptions apply to this task.
- **Apply:** carry those rules into the plan and the implementer's and reviewer's context.
- **Assure:** collect evidence of compliance and enforce the checks that can be enforced.

For a bug fix, that might mean requiring regression coverage, deciding that this change is in scope, assigning a reproducer before the fix, and reviewing the test evidence before merge. The policy document is only the beginning of that chain.

Superpowers has an explicit customization path here: its [bootstrap instructions](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md) give direct user instructions and project instruction files precedence over skill defaults. Its [planning template](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md) also carries global constraints from the spec into the plan. That qualifies my initial impression that its governance was difficult to tailor. The remaining question is how consistently an override reaches every step and every delegated role.

## Mechanism changes the guarantee

The next question was what actually makes a module work.

ArDD's constitution is project prose that its skills tell the agent to read. It can extend the policy in an `AGENTS.md` or `CLAUDE.md`, but it doesn't acquire the same loading behavior just by existing. Skill prose supplies a procedure. An agent specification supplies a role, context, and a result contract. Scripts perform concrete operations. Hooks connect operations to events. CI and access controls can supply barriers outside the agent's judgment.

These mechanisms can implement the same apparent capability with different guarantees. A validator is deterministic once called. That says nothing about whether it gets called, or whether anyone acts on its exit code.

Consider the same validation script in four settings:

- A person remembers to run it.
- A skill tells the agent to run it.
- A harness hook or CI event invokes it.
- A required check prevents merging when it fails.

The script hasn't become more sophisticated. Its place in the workflow has changed.

Even "hook" needs qualification. Superpowers' [Claude hook configuration](https://github.com/obra/superpowers/blob/main/hooks/hooks.json) activates at session start, including specified restart and compaction events. Spec Kit's [implementation template](https://github.com/github/spec-kit/blob/main/templates/commands/implement.md) directs the agent to invoke extension hooks in parts of its flow. Both connect behavior to a point in the workflow, but the invocation owner is different.

An agent specification has a similar distinction. Giving a reviewer a role prompt can direct its attention. Giving it a separate context can reduce contamination from the implementer's reasoning. Restricting its tools, where the harness supports that, changes what it can do. Those are three mechanisms, not one guarantee conferred by the word "reviewer."

## What I want from a module

I now want a module to answer a few concrete questions before I trust it as part of a larger system:

- What responsibility does it own, and what canonical state may it change?
- What policy does it consume, and how are conflicts resolved?
- What mechanism performs the work, and who invokes it?
- What happens when it fails: a report, a question, or a blocked operation?
- What survives an interruption, and how does the next run recover?

Those questions make composition more tractable. Several inspectors can examine the same record, but competing writers need an explicit coordination rule. A status report should be derived from canonical records. An execution ledger should record progress without quietly becoming the authority on architectural intent.

They also give me a better way to evaluate ArDD. Its living project documents could complement another tool's execution procedures. The valuable connection would be making project decisions reliably reach plans, workers, reviewers, and checks. Maintaining a second competing task queue would need a much stronger justification.

The [interactive map](/tool-taxonomy/) keeps the detailed comparisons separate from this argument. The tool-specific entries will age; the questions about ownership, activation, and evidence should remain useful even as the tools change.
