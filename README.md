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

```html
<script type="module">
    import spikip from './spikip.js';

    // Define components here
    
    // Start the engine
    spikip.start();
</script>
```

---

## 🚀 Quick Start

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
spikip.define('counter', () => ({
    count: 0,
    inc(){ this.count++ }
}));

spikip.start();
```

---

## 📚 Directives Reference

### Display & Binding
| Directive | Syntax Example | Description |
| :--- | :--- | :--- |
| `data-text` | `data-text="user.name"` | Updates `textContent`. |
| `data-html` | `data-html="rawHtml"` | Updates `innerHTML` (Use carefully). |
| `data-value`| `data-value="email"` | Two-way binding for form inputs (`input`, `textarea`, `select`). |

### Logic & Control Flow
| Directive | Syntax Example | Description |
| :--- | :--- | :--- |
| `data-if` | `data-if="isVisible"` | **True Conditional Rendering**. Removes element from DOM and memory if false. |
| `data-loop` | `item in items` | Loops over an array. Must be used on a `<template>` tag. |
| `data-key` | `data-key="item.id"` | Unique key for list diffing. **Mandatory** for correct reordering. |

### Attributes & Events
| Directive | Syntax Example | Description |
| :--- | :--- | :--- |
| `data-bind` | `click:submit` | Binds event listeners. Format: `event:method`. |
| `data-props`| `disabled:isOff, href:url` | Toggles attributes. If value is boolean, toggles attribute existence. |
| `data-class`| `active:isActive` | Toggles CSS class based on boolean value. |
| `data-ref` | `data-ref="myInput"` | Stores DOM reference in `state.refs`. |

### Performance Optimization
| Directive | Syntax Example | Description |
| :--- | :--- | :--- |
| `*` (Prefix)| `data-text="*title"` | **One-Time Binding**. Renders once and detaches reactivity. Saves memory. |
| `data-static`| `<div data-static>` | Skips this element and all children during compilation. |

---

## 🧠 Core Concepts

### 1. Component State
The object you return from `spikip.define` becomes reactive. Deeply nested objects are automatically proxied.

```javascript
spikip.define('app', () => {
    return { 
        user: { name: 'John', details: { age: 30 } } 
    };
});
```

### 2. Computed Properties
Computed properties are injected into the factory function. They are cached and only re-evaluate when dependencies change.
**Note:** In HTML, access computed properties via `.value`.

```javascript
spikip.define('cart', ({ computed }) => {
    const state = { price: 10, qty: 2 };

    // Define computed
    const total = computed(() => state.price * state.qty);

    return { state, total };
});
```
```html
<p>Total: <span data-text="total.value"></span></p>
```

### 3. Lists & Keys (`data-loop`)
Spikip uses a keyed diffing algorithm. Always provide a `data-key` referencing the loop alias.

```html
<template data-loop="user in users" data-key="user.id">
    <div data-text="user.name"></div>
</template>
```
*   **Correct:** `data-key="user.id"` (Refers to the alias `user`)
*   **Incorrect:** `data-key="id"`

---

## 💡 Examples

### 1. Todo List (Loops & Refs)

```html
<div data-func="todo-app">
    <input type="text" data-ref="input" placeholder="Add todo...">
    <button data-bind="click:add">Add</button>

    <ul>
        <template data-loop="task in tasks" data-key="task.id">
            <li>
                <input type="checkbox" data-bind="change:toggle" data-props="checked:task.done">
                <span data-text="task.text" data-class="done:task.done"></span>
                <button data-bind="click:remove">X</button>
            </li>
        </template>
    </ul>
</div>

<style>.done { text-decoration: line-through; color: gray; }</style>

<script type="module">
import spikip from './spikip.js';

spikip.define('todo-app', () => {
    const state = {
        tasks: [{id: 1, text: 'Buy Milk', done: false}]
    };

    // Use 'this' inside methods to access the specific item scope in loops
    function toggle() {
        this.task.done = !this.task.done;
    }

    function remove() {
        // Find index of current item
        const idx = state.tasks.indexOf(this.task);
        if (idx > -1) state.tasks.splice(idx, 1);
    }

    const add = () => {
        const val = state.refs.input.value;
        if (!val) return;
        state.tasks.push({ id: Date.now(), text: val, done: false });
        state.refs.input.value = '';
        state.refs.input.focus();
    };

    return { state, add, toggle, remove };
});
spikip.start();
</script>
```

### 2. Conditional & One-Time Binding

```html
<div data-func="modal-demo">
    <!-- Static Header (Zero reactivity overhead) -->
    <h1 data-text="*appTitle"></h1>

    <button data-bind="click:toggle">Toggle Modal</button>

    <!-- Modal: Removed from DOM when open is false -->
    <div class="modal" data-if="isOpen">
        <div class="box">
            <p>I am a heavy component!</p>
            <button data-bind="click:toggle">Close</button>
        </div>
    </div>
</div>

<script type="module">
import spikip from './spikip.js';

spikip.define('modal-demo', () => {
    const appTitle = "My Spikip App";
    const state = { isOpen: false };

    const toggle = () => state.isOpen = !state.isOpen;

    return { appTitle, state, toggle };
});
spikip.start();
</script>
```

### 3. API Fetch & Computed

```html
<div data-func="user-fetcher">
    <button data-bind="click:load">Load User</button>
    <p data-if="loading">Loading...</p>

    <div data-if="user">
        <h2 data-text="user.name"></h2>
        <p>Email: <span data-text="user.email"></span></p>
        <p>Status: <b data-text="statusLabel.value"></b></p>
    </div>
</div>

<script type="module">
import spikip from './spikip.js';

spikip.define('user-fetcher', ({ computed }) => {
    const state = {
        loading: false,
        user: null
    };

    const statusLabel = computed(() => {
        return state.user ? `Active User (ID: ${state.user.id})` : 'Guest';
    });

    const load = async () => {
        state.loading = true;
        state.user = null;
        try {
            const res = await fetch('https://jsonplaceholder.typicode.com/users/1');
            state.user = await res.json();
        } finally {
            state.loading = false;
        }
    };

    return { state, load, statusLabel };
});
spikip.start();
</script>
```

---

## 🛠️ Optimization Tips

1.  **Use `data-key` correctly:** When using `data-loop`, always provide a unique ID from your data (e.g., `data-key="item.id"`). This allows Spikip to move DOM nodes instead of destroying/recreating them.
2.  **Use `data-if` for large trees:** If a section of your UI is togglable and contains many elements, `data-if` is better than hiding it with CSS because it frees up memory.
3.  **Use `*` for constants:** If a text value never changes (like a label or title), use `data-text="*label"`. Spikip will skip tracking it.
4.  **Use `data-static`:** For large chunks of static HTML (like a footer or SVG icon), add `data-static` to the parent container to skip compiling completely.

---

## License

MIT License. Free to use for personal and commercial projects.
