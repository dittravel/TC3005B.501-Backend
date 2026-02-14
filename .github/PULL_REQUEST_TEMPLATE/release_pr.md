<!-- ------------------------------------------------------------------
Release Pull Request Template

Use this template when promoting changes from `development` to `main`
for an official versioned release.

Release PRs represent:
- A stable, tested increment of the system
- Completion of one or more milestones
- A formally versioned update (e.g., v1.2.0)

Requirements:
- A Milestone must exist for this release
- CHANGELOG must be updated
- Documentation must reflect new behavior
- PR must originate from `development`
- PR must target the `main` branch

Release PRs should NOT:
- Introduce new feature work
- Contain unfinished or experimental changes
- Bypass milestone/version tracking

This ensures:
- Controlled production releases
- Clear version history
- Accurate documentation
- Strong traceability between releases and delivered work
------------------------------------------------------------------- -->

# Release PR

## Before Submitting

- [ ] Milestone exists for release.
- [ ] Includes `docs` commits for documentation updates in new release.
- [ ] Include `CHANGELOG` changes with what the new version will introduce.
- [ ] PR is from the `development` branch.
- [ ] PR is to the `main` branch.

## New Version

_What version will this next one be?_

## Description

_Outline what this new version will introduce and the changes it will make._

## Related features

_List the related User Stories, Sub-Epics, and Epics that the Release advances or deals with._
