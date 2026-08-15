# Docs Experience Specification

## Purpose

Improve the documentation area: in-page table of contents and prev/next
navigation, search over body content, corrected and completed category
assignment, and code highlighting that adapts to the active theme.

## Requirements

### Requirement: docs-experience-1: Table of contents and prev/next navigation

Each doc page MUST render a table of contents derived from its headings and
prev/next links following category ordering. First and last docs in a category
MUST not show a dead navigation link.

#### Scenario: TOC links to sections

- GIVEN a doc with three sections
- WHEN the page loads
- THEN the TOC lists the sections and each link scrolls to its anchor

#### Scenario: Boundary docs hide missing neighbor

- GIVEN the first doc of a category
- WHEN the page renders
- THEN the previous link is hidden or disabled and next points to the following doc

### Requirement: docs-experience-2: Search over body content

Docs search MUST match document body content, not only metadata, and MUST show
matching results with context. The search clear button MUST have an accessible
name.

#### Scenario: Body term returns the doc

- GIVEN a term that appears only in a doc's body
- WHEN the user searches for it
- THEN the doc appears in the results with a contextual snippet

#### Scenario: Clear button is accessible

- GIVEN a search is active
- WHEN the clear button receives keyboard focus
- THEN it is announced with an accessible name and clears the search when activated

### Requirement: docs-experience-3: Category fix for "gestion"

Docs declared with the legacy `gestion` category MUST be assigned to the
`seguridad` category so `seguridad-obra` becomes visible in the sidebar under
"Seguridad".

#### Scenario: seguridad-obra visible in sidebar

- GIVEN `seguridad-obra.mdx` declares `category: gestion`
- WHEN the docs sidebar renders
- THEN the doc appears under the Seguridad section

### Requirement: docs-experience-4: Re-categorize uncategorized docs

The docs currently missing a category MUST be assigned the category that matches
their content, and the sidebar and docs index MUST reflect the new assignments
and ordering.

#### Scenario: Doc appears in its new category

- GIVEN a doc previously defaulting to `fundamentos`
- WHEN it is assigned a matching category
- THEN it appears in that category's section in the sidebar and index order

### Requirement: docs-experience-5: Theme-adaptive code highlighting

Code blocks in docs MUST render with a syntax highlighting theme that adapts to
the active app theme so code remains legible in both light and dark mode.

#### Scenario: Code legible in dark theme

- GIVEN the dark theme is active
- WHEN a doc with a code block renders
- THEN the code colors are legible against the dark background
