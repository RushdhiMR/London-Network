---
name: preserve-existing-changes
description: Mandatory skill to preserve all previously completed work and existing functionality for the London BigBen Network website. Enforces making only explicitly requested changes, inspecting before editing, making minimal targeted changes, protecting shared functionality, and verifying before finishing.
---

# Skill Name: Preserve Existing Changes & Minimal Updates

## Purpose
For every task in my London BigBen Network website project, preserve all previously completed work and existing functionality. Make only the changes I explicitly request.

## Mandatory Rules

### 1. Never Change Unrequested Features
- Only modify the feature, bug, component, or file related to my current request.
- Do not change other pages, components, layouts, styles, functions, database logic, authentication, APIs, or configurations unless absolutely necessary for the requested fix.
- Never remove, replace, redesign, or simplify a feature just because you think another implementation is better.
- Treat all previous updates and working features as requirements that must be preserved.

### 2. Inspect Before Editing
- Before making changes, inspect the relevant existing code and understand how it works.
- Identify the exact root cause of the requested issue.
- Check which existing components, functions, API routes, and database operations are involved.
- Understand the impact of each proposed change before editing.
- Reuse existing files and components whenever possible.

### 3. Make Minimal, Targeted Changes
- Modify only the necessary lines of code.
- Do not rewrite entire files when a small change is sufficient.
- Do not refactor unrelated code or rename existing functions, variables, routes, or components without a clear technical necessity.
- Do not create duplicate components, pages, API routes, configuration files, or dependencies.
- Never delete existing functionality to fix another problem.

### 4. Preserve Previous Updates
- Treat existing working features and previously implemented requirements as protected.
- Do not overwrite or reverse previous fixes while implementing a new request.
- Check existing Git changes before editing.
- Never discard, reset, revert, or overwrite my uncommitted changes.
- Do not use destructive Git commands.
- If the requested change conflicts with an existing feature or previous requirement, stop and explain the conflict before making a decision.

### 5. Protect Shared Functionality
- Before changing a shared component, utility, hook, API, authentication system, database query, or global stylesheet, check which other pages and features depend on it.
- Make sure the change does not unintentionally affect other pages, browser tabs, user roles, or existing workflows.
- Prefer a local, isolated fix over a global change when both can solve the problem correctly.
- If a shared change is necessary, preserve all existing dependent functionality.

### 6. Verify Before Finishing
- Check the final changes against my exact request.
- Review the diff and confirm that unrelated files and previous work have not been changed.
- Test the requested functionality and any directly affected existing functionality.
- Check for regressions, console errors, build errors, broken routes, and unintended UI changes where applicable.
- If a test cannot be performed, clearly tell me instead of claiming it passed.
- Do not claim the problem is fixed without sufficient verification.

### 7. Stop Scope Expansion
- Do not add extra features, enhancements, redesigns, optimizations, or improvements that I did not request.
- Do not make assumptions about what else should change.
- If additional changes are genuinely required, explain why and ask for my approval before making unrelated changes.

## Required Workflow for Every Task

1. Read my current request carefully.
2. Inspect the existing implementation and relevant Git changes.
3. Identify the root cause and the smallest safe solution.
4. List the files that need to change and why.
5. Implement only the necessary changes.
6. Review the diff to confirm that previous work is preserved.
7. Test the fix and check for regressions.
8. Report what changed, which files were modified, and what was tested.

## Final Priority Rule

MY EXPLICIT REQUEST IS THE SCOPE OF THE TASK.

Preserving existing functionality and previous updates is mandatory. A successful fix must solve the requested problem without breaking, reverting, or unnecessarily changing anything else.

If you cannot safely implement the request without affecting unrelated functionality, stop and ask me before proceeding.

Apply this skill to every future task in this project unless I explicitly authorize a broader change.
