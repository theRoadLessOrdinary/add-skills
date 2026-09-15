# add-skills

A browser console script that auto-fills the "Skills" picker widget on
Workday job application forms, so you don't have to search for and click
each skill by hand.

## Why this exists

Workday's skills picker isn't a plain HTML `<select>`, it's a React-driven
search box + virtualized checkbox list. Filling it in requires typing a
search term, waiting for results, and clicking the matching option, one
skill at a time, which gets tedious fast on applications with long skill
lists. This script drives that widget for you: give it a list of skill
names, and it searches for and checks each one in turn.

It's written specifically against Workday's DOM structure
(`data-automation-id` attributes), but the driver logic (typing, waiting,
matching, clicking) is generic enough to adapt to other sites, see
[Adapting to another site](#adapting-to-another-site) below.

## Usage

1. Open `add-skills.js` and edit the `SKILLS` array near the top with the
   skills you want added, in the exact wording Workday uses for them (the
   script matches the picker's suggested option text exactly, so close-but-
   not-exact wording won't match).
2. Open the job application in your browser and navigate to the page with
   the Skills question.
3. Open DevTools (F12, or Ctrl+Shift+I / Cmd+Option+I) and switch to the
   **Console** tab.
4. Paste the entire contents of `add-skills.js` into the console and press
   Enter.
5. The script runs automatically (the last line calls `addSkills(SKILLS)`
   for you) and logs its progress: `Searching:`, `Selecting:`, `Checked:`,
   or `No exact match found for:` per skill. When it finishes it prints
   `Done. Not found: [...]` listing anything it couldn't match or check,
   double-check and add those manually.

You can also call `addSkills([...])` again yourself in the console with a
different array without re-pasting the whole file, since all the functions
stay defined after the first paste.

### Tuning timing

If the page is slow (or the script is moving faster than the UI can keep
up, causing missed matches), adjust the `DELAY` values near the top of the
file, they're all in milliseconds. If it's fast and reliable for you, you
can lower them to speed things up.

## How it works

- `setNativeValue()` sets the search input's value using the native
  `HTMLInputElement` value setter and fires a real `input` event, because
  React-controlled inputs ignore a plain `el.value = ...` assignment.
- `dispatchKey()` / `pressEnter()` / `pressArrowDown()` dispatch real
  `KeyboardEvent`s, since the widget listens for actual key events rather
  than reacting to the input's value alone.
- `dispatchRealClick()` fires a full `pointerdown`/`mousedown`/`pointerup`/
  `mouseup`/`click` sequence at the element's on-screen center, because
  React ignores a bare `el.click()`.
- The results list is **virtualized**, only rows near the current scroll
  position actually exist in the DOM, so a match that hasn't scrolled into
  view yet can't be queried for directly. Instead, `getHighlightedLabel()`
  reads whichever row is currently marked
  `data-automation-selected="true"` as the script arrows down, since that's
  the row that would actually get checked if you stopped there.

## Adapting to another site

If you want to point this at a different application tracking system (ATS),
the driver logic in `addSkills()` (type → wait → arrow through results →
match → click) should carry over, but you'll need to rewrite the
**site-specific selectors** section near the top of the file for the new
site's DOM:

- `findSkillsInput()`: locate the search box.
- `getHighlightedMenuItem()`: locate the currently-highlighted result row.
- `getHighlightedLabel()`: read that row's display text.
- `anyMenuItemPresent()`: detect that results have rendered at all.
- `isHighlightedChecked()`: detect whether the highlighted row is already
  checked/selected.

Open DevTools' Elements panel on the target site's skills widget, search
for a skill, and inspect the resulting DOM to find the equivalent
attributes for that site.

## Disclaimer

This automates form-filling on a page you're already legitimately filling
out yourself. Use it for your own job applications; it doesn't bypass any
login, authentication, or access control. Test it with a small skills list
first, and always review what actually got checked before submitting the
application. Matching is exact-string, and anything the script reports
under "Not found" needs to be added by hand.
