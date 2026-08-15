# Templates Specification

## Purpose

Make template application safe: require confirmation with a preview before any
destructive apply, and allow a single undo to restore the previous plan.

## Requirements

### Requirement: templates-1: Confirm and preview before apply

Applying a template MUST open a dialog showing a preview and description of the
template. The current plan MUST NOT change while the dialog is open, and the
template MUST be applied only after explicit confirmation.

#### Scenario: Preview leaves plan untouched

- GIVEN the user opens a template preview
- WHEN the dialog is shown and then cancelled
- THEN the current plan is unchanged

#### Scenario: Confirmation applies the template

- GIVEN the user confirms the template dialog
- WHEN the confirmation is accepted
- THEN the current plan is replaced by the template's content

### Requirement: templates-2: Undo after template apply

Applying a template MUST be recorded in the undo history so that a single undo
restores the pre-template plan.

#### Scenario: Single undo restores previous plan

- GIVEN a template has been applied
- WHEN the user triggers undo
- THEN the plan returns to its state before the template was applied
