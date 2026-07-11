import { App, setIcon } from "obsidian";
import { getAllDeckNames } from "./utils";

/**
 * Builds and attaches a deck-picker dropdown to `anchor`.
 *
 * @param app           - The Obsidian App instance
 * @param anchor        - The element the dropdown will be appended to
 * @param initialDecks  - The decks already selected for this note
 * @param onDecksChanged - Called with the new deck list whenever it changes
 *
 * Returns the dropdown element and the outside-click handler
 * (so the caller can remove the handler if it closes the dropdown manually).
 */
export function createDeckDropdown(
  app: App,
  anchor: HTMLElement,
  initialDecks: string[],
  onDecksChanged: (updatedDecks: string[]) => Promise<void> | void,
): { dropdown: HTMLElement; outsideHandler: (e: MouseEvent) => void } {
  const allDecks = getAllDeckNames(app);
  const currentDecks = [...initialDecks]; // work on a copy

  const dropdown = anchor.createDiv({ cls: "spaced-deck-dropdown" });

  const searchInput = dropdown.createEl("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search decks…";
  searchInput.addClass("spaced-deck-search");

  const listEl = dropdown.createDiv({ cls: "spaced-deck-list" });

  const addDeck = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || currentDecks.includes(trimmed)) return;
    currentDecks.push(trimmed);
    if (!allDecks.includes(trimmed)) {
      allDecks.push(trimmed);
      allDecks.sort();
    }
    await onDecksChanged(currentDecks);
    searchInput.value = "";
    renderList("");
  };

  const renderList = (filter: string) => {
    listEl.empty();
    const filtered = allDecks.filter((d) => d.toLowerCase().includes(filter.toLowerCase()));

    for (const deck of filtered) {
      const item = listEl.createDiv({ cls: "spaced-deck-item" });
      const cb = item.createEl("input");
      cb.type = "checkbox";
      cb.checked = currentDecks.includes(deck);
      item.createSpan({ text: deck });
      item.addEventListener("click", async (e) => {
        e.stopPropagation();
        const idx = currentDecks.indexOf(deck);
        if (idx >= 0) {
          currentDecks.splice(idx, 1);
          cb.checked = false;
        } else {
          currentDecks.push(deck);
          cb.checked = true;
        }
        await onDecksChanged(currentDecks);
      });
    }

    if (filter.trim()) {
      const addItem = listEl.createDiv({ cls: "spaced-deck-item spaced-deck-add" });
      const iconEl = addItem.createDiv({ cls: "spaced-deck-add-icon" });
      setIcon(iconEl, "circle-plus");
      addItem.createSpan({ text: `Add "${filter.trim()}"` });
      addItem.addEventListener("mousedown", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await addDeck(filter.trim());
      });
    }
  };

  renderList("");
  searchInput.addEventListener("input", () => renderList(searchInput.value));

  searchInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const filter = searchInput.value.trim();
    if (!filter) return;
    const filtered = allDecks.filter((d) => d.toLowerCase().includes(filter.toLowerCase()));
    if (filtered.length === 1) {
      const deck = filtered[0];
      const idx = currentDecks.indexOf(deck);
      if (idx >= 0) currentDecks.splice(idx, 1);
      else currentDecks.push(deck);
      await onDecksChanged(currentDecks);
      renderList(filter);
    } else if (filtered.length === 0) {
      await addDeck(filter);
    }
    e.preventDefault();
  });

  const outsideHandler = (e: MouseEvent) => {
    if (!document.contains(dropdown) || !dropdown.contains(e.target as Node)) {
      dropdown.remove();
      document.removeEventListener("mousedown", outsideHandler);
    }
  };
  setTimeout(() => document.addEventListener("mousedown", outsideHandler), 0);
  searchInput.focus();
  return { dropdown, outsideHandler };
}
