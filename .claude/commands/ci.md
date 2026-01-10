---
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(npm run:*), Read, Glob, WebFetch
description: Check CI/CD status, run tests locally, or view workflow runs
---

Help the user with CI/CD tasks for this project.

Available actions based on user request or context:

## Check CI Status
1. Run `git status` to show current branch and changes
2. Check if there are any uncommitted changes that need to be pushed
3. Offer to run tests locally before pushing

## Run Tests Locally
1. Run `npm run lint` to check for linting errors
2. Run `npm test -- --watchAll=false --passWithNoTests` to run tests
3. Run `npm run build` to verify the build succeeds
4. Report any failures and offer to help fix them

## View GitHub Actions Status
If the user wants to check CI status on GitHub:
1. Get the repository URL from `git remote get-url origin`
2. Direct them to the Actions tab: `https://github.com/<owner>/<repo>/actions`

## Pre-Push Checklist
Before pushing, verify:
1. Lint passes: `npm run lint`
2. Tests pass: `npm test -- --watchAll=false --passWithNoTests`
3. Build succeeds: `npm run build`

Report results clearly and offer to fix any issues found.
