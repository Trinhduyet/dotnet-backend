---
name: dotnet-debugging
description: Diagnose a .NET API error, failed test, misleading empty response or runtime configuration problem from evidence before a minimal regression-tested fix. Use for investigation requests, not speculative cleanup or ordinary new features.
---

# Systematic .NET debugging

1. Load project constraints and intended behavior. Reproduce exact input, environment
   and build; unavailable reproduction is a blocker, not proof of a hypothesis.
2. Gather minimal redacted evidence at HTTP → Service → dependency → data → response.
   Read errors and effective configuration key/target without dumping secrets.
   Compare working cases and recent relevant changes.
3. Locate the divergence. State one falsifiable hypothesis and a check that can
   disprove it. Do not modify several components to guess at a fix.
4. Distinguish valid zero-row results from a missing required source/upstream error.
   Do not return a misleading 200/empty fallback for a dependency failure; preserve
   legitimate empty collections and the consumer's approved failure contract.
5. Make the smallest root-cause correction. Reproduce the old trigger and test
   failure and valid paths. Review scope and explain cause, fix and actual evidence.

Stop before unapproved resets/live writes. Do not weaken policies, blindly suppress
exceptions or change test expectations to obtain green output.
