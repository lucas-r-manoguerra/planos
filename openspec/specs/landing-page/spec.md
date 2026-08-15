# Landing Page Specification

## Purpose

Provide the product front door at `/` — hero, value proposition, and primary CTA —
and move the editor to its own route at `/editor`.

## Requirements

### Requirement: landing-page-1: Landing page at `/`

The system MUST render a landing page at `/` with a hero heading, a concise value
proposition, and a primary call-to-action labeled in Spanish ("Comenzar" or
equivalent). The landing page MUST NOT mount the editor canvas at `/`.

#### Scenario: Landing renders at root

- GIVEN a user visits `/`
- WHEN the page loads
- THEN the hero, value proposition, and primary CTA are visible
- AND the editor canvas is not mounted

#### Scenario: Editor no longer at root

- GIVEN a user visits `/`
- WHEN the page loads
- THEN no editor chrome (toolbar, canvas, panels) is rendered

### Requirement: landing-page-2: Editor at `/editor`

The system MUST serve the full editor at `/editor`. The editor MUST retain all
existing behavior (canvas, panels, autosave) when accessed at this route.

#### Scenario: CTA navigates to the editor

- GIVEN a user on the landing page
- WHEN the primary CTA is activated
- THEN the user lands on `/editor` with the full editor loaded

#### Scenario: Direct deep link to editor

- GIVEN a user opens `/editor` directly
- WHEN the page loads
- THEN the editor renders without passing through the landing page

### Requirement: landing-page-3: Landing navigation links

The landing page MUST provide navigation to the editor and SHOULD provide links to
the documentation area. The in-session editor state (autosaved project) MUST be
preserved when navigating from landing to editor.

#### Scenario: Docs reachable from landing

- GIVEN a user on the landing page
- WHEN activating the docs link
- THEN the documentation index loads

#### Scenario: Session state preserved on navigation

- GIVEN a previously autosaved project
- WHEN the user lands on `/editor` via the CTA
- THEN the saved project is loaded into the editor
