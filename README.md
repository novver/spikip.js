# ⚡ Spikip.js

A blazing fast JavaScript framework for the HTML, lightweight, **no-build** reactivity engine for the modern web inspired by alpinejs, stimulus and nomini.

**Key Features:**
*   **Zero Dependencies:** Just one ES Module file.
*   **No Build Step:** Works directly in the browser.
*   **High Performance:** Features Smart DOM Moving, Keyed Diffing, and Fast-Path Access.
*   **Memory Efficient:** True conditional rendering (`data-if`) and one-time bindings (`*`).
*   **Reactivity:** Fine-grained reactivity with dependency tracking.

---

## 📦 Installation

Simply download `spikip.js` and import it into your project.

**1. Create HTML:**

Mark your component wrapper with `data-func`.

```html
<div data-func="counter">
    <h1>Count: <span data-text="count"></span></h1>
    <button data-bind="click:inc">+1</button>
</div>
```

**2. Define Logic:**

```javascript
import spikip from './spikip.js';

spikip.define('counter', () => ({
    count: 0,
    inc(){ this.count++ }
}));

spikip.start();
```

---

## 🧩 Core Directives

| Directive | Example Usage | Description |
|---------|---------------|-------------|
| `data-func` | `<div data-func="counter">` | Defines a component entry point |
| `data-text` | `<p data-text="count">` | Reactive text content |
| `data-html` | `<div data-html="content>"` | Reactive inner HTML |
| `data-value` | `<input data-value="email">` | Reactive in input |
| `data-bind` | `<button data-bind="click:save"> or `<br>`<div data-bind="init">` | Event binding & init calls |
| `data-if` | `<div data-if="open">` | Conditional rendering |
| `data-loop` | `<template data-loop="(item,i) in items">` | Loop rendering |
| `data-key` | `<template data-key="item.id">` | Stable key for loop items |
| `data-ref` | `<div data-ref="name">` | DOM reference access |
| `data-class` | `<div data-class="active:isActive"> or `<br>`<div data-class="bg-red:isActive, border-red:isActive">` | Conditional class |
| `data-props` | `<button data-props="disabled:loading"> or `<br>`<a data-props="href:item.url, title:item.name">` | Reactive DOM attribute property |
| `data-static` | `<div data-static>` | Skip reactive processing |

---

## 🛠️ Optimization Tips

1.  **Use `data-key` correctly:** When using `data-loop`, always provide a unique ID from your data (e.g., `data-key="item.id"`). This allows Spikip to move DOM nodes instead of destroying/recreating them.
2.  **Use `data-if` for large trees:** If a section of your UI is togglable and contains many elements, `data-if` is better than hiding it with CSS because it frees up memory.
3.  **Use `*` for constants:** If a text value never changes (like a label or title), use `data-text="*label"`. Spikip will skip tracking it.
4.  **Use `data-static`:** For large chunks of static HTML (like a footer or SVG icon), add `data-static` to the parent container to skip compiling completely.

---

## License

MIT License. Free to use for personal and commercial projects.
