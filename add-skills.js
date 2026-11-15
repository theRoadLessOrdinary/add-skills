// Last edited: 2026-09-21 13:29:11 CDT
// Paste into DevTools Console on the Workday application page, then run: addSkills(SKILLS)
// For each skill: types it into the Skills search box, presses Enter to trigger the search,
// waits for the exact-match option to appear, clicks it, clears the box, repeats.

const SKILLS = [
  "Hyper Text Markup Language (HTML)",
   "JavaScript" ,
   "Web Development",
   "Front-End Design"/*,
   "JScript",
    "jQuery",
    "JavaScript Object Notation (JSON)",
    "PHP (Programming Language)",
  "Php Smarty",
  "phpMyAdmin",
  "LAMP (Linux Apache MySQL PHP)",
  "Structured Query Language (SQL)",
  "SQLite",
  "Transact-SQL",
  "Microsoft SQL Server",
  "SQL Server Configuration Manager",
  "SQL Server Enterprise Manager",
  "Microsoft Internet Information Services (IIS)",
  "Customer Relationship Management (CRM)",
  "Ecommerce Systems",
  "Large Language Models (LLMs)",
  "API Development",
  "USPS API",
  "Open API",
  "RESTful Web Services",
  "Active Server Pages (ASP)",
  "VBScript",
  "Visual Basic for Applications (VBA) Script",
  "Code Refactoring",
  "Database Refactoring",
  "User Interfaces (UI)",
  "jQuery UI",
  "User Experience (UX)",
  "UI/UX Design",
  "GNU Image Manipulation Program (GIMP)",
  "Image Manipulation",
  "Image Optimization",
  "ImageMagick",
  "Image Management",
  "Inkscape",
  "Digital Art" */ ,
];

// Tune these up/down if the browser is still struggling to keep up, or slow to react.
const DELAY = {
  afterTyping: 500, // after setting the input value, before pressing Enter
  addedCheck: 2000, // after Enter, how long to watch for the text being re-highlighted (item already added)
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

function pressSpace(el) {
  dispatchKey(el, " ", 32);
}

// Fires a full, properly-ordered pointer/mouse event sequence at an element's
// center, the way a real click actually arrives in the browser (as opposed to
// el.click(), which only dispatches a bare "click" event).
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

function getHighlightedMenuItem() {
  return document.querySelector('[data-automation-id="menuItem"][data-automation-selected="true"]');
}

function findSkillsInput() {
  return (
    document.getElementById("skills--skills") ||
    document.querySelector('input[data-automation-id="searchBox"]')
  );
}

// The virtualized list only renders rows near the current scroll position, so a
// not-yet-visible match won't be in the DOM at all. Instead of querying for it
// directly, track whatever item is currently highlighted (data-automation-selected="true")
// as we arrow down — that's what actually gets checked when Enter is pressed.
function getHighlightedLabel() {
  const menuItem = document.querySelector(
    '[data-automation-id="menuItem"][data-automation-selected="true"]'
  );
  if (!menuItem) return null;
  const opt = menuItem.querySelector('[data-automation-id="promptOption"]');
  return opt ? opt.getAttribute("data-automation-label") : null;
}

function anyMenuItemPresent() {
  return !!document.querySelector('[data-automation-id="menuItem"]');
}

function isHighlightedChecked() {
  const menuItem = document.querySelector(
    '[data-automation-id="menuItem"][data-automation-selected="true"]'
  );
  if (!menuItem) return false;
  const leaf = menuItem.querySelector('[data-automation-id="promptLeafNode"]');
  return leaf ? leaf.getAttribute("data-automation-checked") === "Checked" : false;
}

// True when the input is focused and its whole text is highlighted.
function isSearchTextSelected(input) {
  return (
    document.activeElement === input &&
    input.value.length > 0 &&
    input.selectionStart === 0 &&
    input.selectionEnd === input.value.length
  );
}

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
    console.error("Could not find the skills search input — inspect it and update findSkillsInput().");
    return;
  }

  const notFound = [];
  const MAX_STEPS = 40; // matches aria-setsize (~30) plus headroom

  for (const name of skills) {
    console.log("Searching:", name);
    input.focus();
    setNativeValue(input, name);
    await sleep(DELAY.afterTyping);
    pressEnter(input);

    // Enter either added the item outright (single result: the page re-selects the search
    // text, and the list may stay open with that item already checked), or it produced a
    // list of choices. Wait for whichever shows up first.
    await waitFor(() => isSearchTextSelected(input) || anyMenuItemPresent(), 10000, 100);
    await sleep(DELAY.afterSearch);

    if (!anyMenuItemPresent()) {
      console.log("Added by Enter:", name);
      await sleep(DELAY.perArrowStep);
      continue;
    }

    // Arrow down to the case-insensitive match.
    const want = name.trim().toLowerCase();
    const labels = () =>
      [...document.querySelectorAll('[data-automation-id="menuItem"] [data-automation-id="promptOption"]')]
        .map((o) => o.getAttribute("data-automation-label"));
    console.log("Choices:", labels(), "| highlighted:", getHighlightedLabel());
    // Synthetic ArrowDown does not appear to move the highlight on this page, so find the
    // matching row directly in the DOM (short lists are fully rendered) and click its checkbox.
    const findRow = () =>
      [...document.querySelectorAll('[data-automation-id="menuItem"]')].find((row) => {
        const o = row.querySelector('[data-automation-id="promptOption"]');
        const l = o && o.getAttribute("data-automation-label");
        return l && l.trim().toLowerCase() === want;
      });
    const rowChecked = (row) => {
      const leaf = row.querySelector('[data-automation-id="promptLeafNode"]');
      return !!leaf && leaf.getAttribute("data-automation-checked") === "Checked";
    };

    let row = findRow();
    // Long (virtualized) list: match may not be rendered yet, so arrow down looking for it.
    for (let step = 0; !row && step < MAX_STEPS; step++) {
      pressArrowDown(input);
      await sleep(DELAY.perArrowStep);
      row = findRow();
    }

    if (!row) {
      console.warn("No exact match found for:", name, "| choices:", labels());
      notFound.push(name);
      input.focus();
      setNativeValue(input, "");
      await sleep(DELAY.afterClear);
      continue;
    }

    if (rowChecked(row)) {
      // already added (e.g. by the first Enter): clicking again would uncheck it
      console.log("Already checked, leaving alone:", name);
      await sleep(DELAY.perArrowStep);
      continue;
    }

    console.log("Selecting:", name);
    const box = row.querySelector('input[data-automation-id="checkboxPanel"]');
    dispatchRealClick(box || row.querySelector('[data-automation-id="promptLeafNode"]') || row);
    await sleep(DELAY.afterSelect);
    if (!rowChecked(row)) {
      console.warn("Click did not check it:", name);
      notFound.push(name);
    }
  }

  console.log("Done. Not found:", notFound);
}

addSkills(SKILLS);
