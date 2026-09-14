// add-skills.js
//
// See README.md for full usage instructions.
//
// Quick start:
//   1. Edit the SKILLS array below with the skills you want to add.
//   2. Open the job application page in your browser and get to the
//      "Skills" step of the form.
//   3. Open DevTools (F12) -> Console tab.
//   4. Paste this entire file's contents and press Enter.
//   5. The script starts automatically and logs its progress to the console.

const SKILLS = [
  "Example Skill One",
  "Example Skill Two",
  "Example Skill Three",
];

// Tune these up/down if the browser is still struggling to keep up, or slow to react.
const DELAY = {
  afterTyping: 500, // after setting the input value, before pressing Enter
  afterSearch: 2000, // after Enter, before we start reading the highlighted item
  perArrowStep: 1000, // between each ArrowDown while hunting for the match
  afterSelect: 2000, // after the final Enter that checks the item
  afterClear: 1200, // after clearing the box, before moving to the next skill
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function setNativeValue(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function dispatchKey(el, key, keyCode) {
  const opts = { key, code: key, keyCode, which: keyCode, bubbles: true };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
}

function pressEnter(el) {
  dispatchKey(el, "Enter", 13);
}

function pressArrowDown(el) {
  dispatchKey(el, "ArrowDown", 40);
}

// Fires a full, properly-ordered pointer/mouse event sequence at an element's
// center, the way a real click actually arrives in the browser (as opposed to
// el.click(), which only dispatches a bare "click" event). React-driven UIs
// like Workday's ignore synthetic .click() calls and plain .value assignment,
// so both this and setNativeValue() above are needed to look like real input.
function dispatchRealClick(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const base = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, buttons: 1 };
  el.dispatchEvent(new PointerEvent("pointerdown", base));
  el.dispatchEvent(new MouseEvent("mousedown", base));
  el.dispatchEvent(new PointerEvent("pointerup", base));
  el.dispatchEvent(new MouseEvent("mouseup", base));
  el.dispatchEvent(new MouseEvent("click", base));
}

// --- Site-specific selectors ---
// This section is written for Workday's skills picker. If you're adapting
// this script for a different ATS, this is the part you'll need to change —
// see README.md's "Adapting to another site" section.

function findSkillsInput() {
  return (
    document.getElementById("skills--skills") ||
    document.querySelector('input[data-automation-id="searchBox"]')
  );
}

function getHighlightedMenuItem() {
  return document.querySelector('[data-automation-id="menuItem"][data-automation-selected="true"]');
}

// The virtualized list only renders rows near the current scroll position, so a
// not-yet-visible match won't be in the DOM at all. Instead of querying for it
// directly, track whatever item is currently highlighted (data-automation-selected="true")
// as we arrow down — that's what actually gets checked when Enter is pressed.
function getHighlightedLabel() {
  const menuItem = getHighlightedMenuItem();
  if (!menuItem) return null;
  const opt = menuItem.querySelector('[data-automation-id="promptOption"]');
  return opt ? opt.getAttribute("data-automation-label") : null;
}

function anyMenuItemPresent() {
  return !!document.querySelector('[data-automation-id="menuItem"]');
}

function isHighlightedChecked() {
  const menuItem = getHighlightedMenuItem();
  if (!menuItem) return false;
  const leaf = menuItem.querySelector('[data-automation-id="promptLeafNode"]');
  return leaf ? leaf.getAttribute("data-automation-checked") === "Checked" : false;
}

// --- Generic driver logic ---

function waitFor(predicateFn, timeout = 6000, interval = 200) {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const result = predicateFn();
      if (result || Date.now() - start > timeout) {
        clearInterval(timer);
        resolve(result || null);
      }
    }, interval);
  });
}

async function addSkills(skills) {
  const input = findSkillsInput();
  if (!input) {
    console.error("Could not find the skills search input — inspect the page and update findSkillsInput().");
    return;
  }

  const notFound = [];
  const MAX_STEPS = 40; // headroom above the typical number of results a search returns

  for (const name of skills) {
    console.log("Searching:", name);
    input.focus();
    setNativeValue(input, name);
    await sleep(DELAY.afterTyping);
    pressEnter(input);

    // wait for the results list to render, then let it settle on its default highlight
    await waitFor(anyMenuItemPresent, 10000, 300);
    await sleep(DELAY.afterSearch);

    let found = false;
    for (let step = 0; step < MAX_STEPS; step++) {
      const label = getHighlightedLabel();
      if (label === name) {
        found = true;
        break;
      }
      pressArrowDown(input);
      await sleep(DELAY.perArrowStep);
    }

    if (!found) {
      console.warn("No exact match found for:", name);
      notFound.push(name);
      input.focus();
      setNativeValue(input, "");
      await sleep(DELAY.afterClear);
      continue;
    }

    console.log("Selecting:", name);
    const menuItem = getHighlightedMenuItem();
    const checkboxInput = menuItem ? menuItem.querySelector('input[data-automation-id="checkboxPanel"]') : null;

    if (checkboxInput) {
      dispatchRealClick(checkboxInput);
    }
    await sleep(DELAY.afterSelect);

    if (!isHighlightedChecked() && menuItem) {
      // fallback: click the row itself rather than the checkbox
      const leaf = menuItem.querySelector('[data-automation-id="promptLeafNode"]');
      if (leaf) dispatchRealClick(leaf);
      await sleep(DELAY.afterSelect);
    }

    if (isHighlightedChecked()) {
      console.log("Checked:", name);
    } else {
      console.warn("Click did not check it:", name);
      notFound.push(name);
    }

    input.focus();
    setNativeValue(input, "");
    await sleep(DELAY.afterClear);
  }

  console.log("Done. Not found:", notFound);
}

addSkills(SKILLS);
