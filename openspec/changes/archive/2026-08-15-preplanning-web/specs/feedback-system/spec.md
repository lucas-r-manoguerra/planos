# Feedback System Specification

## Purpose

Surface outcomes and errors instead of failing silently: toast notifications,
area-level error boundaries, non-blocking first-run hints, and informative empty
states.

## Requirements

### Requirement: feedback-system-1: Toast notifications

The system MUST surface user-relevant outcomes and errors as toasts, announced to
assistive technology. Informational toasts MUST dismiss automatically; error
toasts MUST remain until dismissed.

#### Scenario: Success toast on export

- GIVEN an export completes successfully
- WHEN the toast appears
- THEN it announces success and dismisses automatically

#### Scenario: Error toast on failed import

- GIVEN an invalid project file is imported
- WHEN the import fails
- THEN an error toast is shown with a message and the editor state is unchanged

### Requirement: feedback-system-2: Area-level error boundaries

Render errors in an area (canvas layer, panel, or docs page) MUST be caught by an
error boundary that shows a recovery UI without breaking the rest of the app.

#### Scenario: Failing panel shows fallback

- GIVEN a panel throws while rendering
- WHEN the boundary catches the error
- THEN a fallback with a reload option is shown and the rest of the app keeps working

### Requirement: feedback-system-3: First-run onboarding hints

First-time users MUST receive non-blocking onboarding hints (e.g. how to start a
plan). Hints MUST be dismissible and MUST NOT reappear after dismissal.

#### Scenario: Hint shows once

- GIVEN a first-time user opens the editor
- WHEN the editor loads
- THEN a dismissible hint is shown
- AND after dismissal it is not shown again on later visits

### Requirement: feedback-system-4: Empty states

The system MUST render informative empty states with an action when there is no
data: no projects, no floors/rooms, no fixtures on the active floor, and no docs
search results.

#### Scenario: Fixture panel empty state

- GIVEN the active floor has no fixtures
- WHEN the fixture panel renders
- THEN an empty-state message with an add-fixture action is shown

#### Scenario: Docs search empty state

- GIVEN a search yields no results
- WHEN the results render
- THEN a message explains that nothing matched the query
