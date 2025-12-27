const spikip = (() => {
    // --- 1. CORE & UTILS ---
    const registry = {},
          // Cache & Maps
          [scopeMap, metaMap, proxyMap, targetMap, pathCache] = [new WeakMap(), new WeakMap(), new WeakMap(), new WeakMap(), new Map()],
          // Constants
          loopRE = /\(?\s*(\w+)(?:,\s*(\w+))?\)?\s+in\s+(\S+)/,
          captures = new Set(['focus', 'blur', 'scroll', 'load', 'error']),
          queue = new Set();
          
    let activeEffect, isFlushing, p = Promise.resolve();

    // Helpers
    const attr = (el, n) => el.getAttribute(n);
    const getParts = path => pathCache.get(path) || pathCache.set(path, path.split('.')).get(path);
    
    // Fast-Path Access
    const getValue = (scope, path) => !path.includes('.') ? scope[path] : getParts(path).reduce((val, k) => val?.[k], scope);
    
    const nextTick = fn => !queue.has(fn) && queue.add(fn) && !isFlushing && (isFlushing = true) && 
        p.then(() => (queue.forEach(j => j()), queue.clear(), isFlushing = false));

    const createCtx = (scope, el) => new Proxy(scope, {
        get: (t, k, r) => k === 'el' ? el : Reflect.get(t, k, r),
        set: (t, k, v, r) => Reflect.set(t, k, v, r)
    });

    // --- 2. REACTIVITY ---
    const track = (t, k) => {
        if (!activeEffect) return;
        let deps = targetMap.get(t);
        if (!deps) targetMap.set(t, (deps = new Map()));
        let dep = deps.get(k);
        if (!dep) deps.set(k, (dep = new Set()));
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
    };

    const trigger = (t, k) => {
        const dep = targetMap.get(t)?.get(k);
        if (dep) [...dep].forEach(e => e.scheduler ? e.scheduler(e) : e());
    };

    const cleanup = e => (e.deps.forEach(d => d.delete(e)), e.deps.length = 0);

    const effect = (fn, opts = {}) => {
        const runner = () => {
            cleanup(runner);
            activeEffect = runner;
            try { fn(); } finally { activeEffect = null; }
        };
        runner.deps = [];
        runner.scheduler = opts.scheduler;
        runner();
        return () => cleanup(runner);
    };

    const reactive = (obj) => {
        if (!obj || typeof obj !== 'object' || obj instanceof Node) return obj;
        if (proxyMap.has(obj)) return proxyMap.get(obj);

        const proxy = new Proxy(obj, {
            get(t, k, r) {
                track(t, k);
                const res = Reflect.get(t, k, r);
                return (typeof res === 'object' && res) ? reactive(res) : res;
            },
            set(t, k, v, r) {
                const old = t[k];
                const res = Reflect.set(t, k, v, r);
                if (old !== v) {
                    trigger(t, k);
                    if (Array.isArray(t) && !isNaN(k)) trigger(t, 'length');
                }
                return res;
            }
        });
        proxyMap.set(obj, proxy);
        return proxy;
    };

    // --- 3. DOM OPS ---
    const ops = {
        text: (el, v) => el.textContent = v ?? '',
        html: (el, v) => el.innerHTML = v ?? '',
        value: (el, v) => {
            if (el.type === 'checkbox') el.checked = !!v;
            else if (el.type === 'radio') el.checked = el.name ? el.value === String(v) : !!v;
            else if (el.value !== String(v ?? '')) el.value = v ?? '';
        },
        props: (el, v, arg) => (typeof el[arg] === 'boolean') ? el[arg] = !!v : (v == null || v === false ? el.removeAttribute(arg) : el.setAttribute(arg, v)),
        class: (el, v, arg) => el.classList.toggle(arg, !!v)
    };

    // --- 4. ENGINE ---
    const mount = (root) => {
        if (root._isMounted) return; root._isMounted = true;
        const fname = attr(root, 'data-func');
        const fac = registry[fname];
        if (!fac) return;

        // Context Injection
        const context = { computed: (fn) => { const b = reactive({ value: undefined }); effect(() => b.value = fn()); return b; } };
        const raw = fac(context);
        if (!raw || typeof raw !== 'object') return;

        const state = reactive(raw), stoppers = [];
        const attachedEvents = new Set();
        raw.refs = {}; raw.root = root;

        // Event System
        const handleEvent = (e) => {
            let t = e.target;
            while (t && t !== root.parentNode) {
                const meta = metaMap.get(t);
                if (meta?.[e.type]) {
                    const scope = scopeMap.get(t);
                    if (scope) {
                        const fn = getValue(scope, meta[e.type]);
                        if (typeof fn === 'function') {
                            let stop = false;
                            const orig = e.stopPropagation.bind(e);
                            Object.defineProperty(e, 'stopPropagation', { value: () => (orig(), stop = true), configurable: true });
                            try { fn.call(createCtx(scope, t), e); } catch (err) { console.error(err); }
                            if (stop) return;
                        }
                    }
                }
                t = t.parentNode;
            }
        };

        const regFx = (fn, list) => list?.push(effect(fn, { scheduler: nextTick }));

        const walk = (el, scope, cleanups) => {
            let val, match;

            // 1. Static Skipping
            if (el.hasAttribute('data-static')) return;
            if (el !== root && el.hasAttribute('data-func')) return;

            // 2. Data-If (Conditional)
            if (val = attr(el, 'data-if')) {
                const marker = document.createTextNode('');
                el.parentNode.insertBefore(marker, el);
                el.remove();
                let node, stopIf;
                regFx(() => {
                    if (getValue(scope, val)) {
                        if (!node) {
                            node = el.cloneNode(true);
                            node.removeAttribute('data-if');
                            const stopCl = [];
                            walk(node, scope, stopCl);
                            stopIf = () => (stopCl.forEach(f => f()), node.remove(), node = null);
                            marker.parentNode.insertBefore(node, marker);
                        }
                    } else if (node) stopIf();
                }, cleanups);
                return;
            }

            // 3. Bindings & Events
            if (val = attr(el, 'data-bind')) {
                scopeMap.set(el, scope);
                const meta = metaMap.get(el) || {};
                let hasEvt = false;
                val.split(' ').filter(Boolean).forEach(b => {
                    if (b.includes(':')) {
                        const [evt, method] = b.split(':').map(s => s.trim());
                        if (!attachedEvents.has(evt)) {
                            root.addEventListener(evt, handleEvent, captures.has(evt));
                            attachedEvents.add(evt);
                        }
                        meta[evt] = method; hasEvt = true;
                    } else {
                        const fn = getValue(scope, b);
                        if (typeof fn === 'function') fn.call(createCtx(scope, el));
                    }
                });
                if (hasEvt) metaMap.set(el, meta);
            }

            // 4. Loops (Keyed + Smart Move)
            if (el.tagName === 'TEMPLATE' && (val = attr(el, 'data-loop')) && (match = val.match(loopRE))) {
                const [_, alias, idxKey, key] = match;
                const keyPath = attr(el, 'data-key');
                const marker = document.createTextNode('');
                el.parentNode.insertBefore(marker, el);
                el.remove();
                
                let pool = new Map();

                regFx(() => {
                    const arr = getValue(scope, key);
                    if (!Array.isArray(arr)) return;
                    arr.length; // Track length
                    
                    const nextPool = new Map();
                    let anchor = marker;

                    // Iterate Backwards
                    for (let i = arr.length - 1; i >= 0; i--) {
                        const item = arr[i];
                        const rowKey = keyPath ? getValue({ [alias]: item }, keyPath) : i;
                        let row = pool.get(rowKey);
                        const rowData = { [alias]: item, ...(idxKey ? {[idxKey]: i} : {}) };

                        if (row) {
                            Object.assign(row.scope, rowData);
                        } else {
                            const clone = el.content.cloneNode(true);
                            const local = reactive(rowData);
                            const itemScope = new Proxy(local, { get: (t, k, r) => k in t ? Reflect.get(t, k, r) : Reflect.get(scope, k, r) });
                            const rowCl = [], rowNodes = Array.from(clone.childNodes);
                            const scan = n => { let c = n.firstElementChild; while(c) { walk(c, itemScope, rowCl); c = c.nextElementSibling; }};
                            scan(clone);
                            row = { nodes: rowNodes, scope: itemScope, cleanups: rowCl };
                        }
                        
                        // Smart Move
                        if (row.nodes[row.nodes.length - 1].nextSibling !== anchor) {
                            row.nodes.forEach(n => marker.parentNode.insertBefore(n, anchor));
                        }
                        anchor = row.nodes[0];
                        nextPool.set(rowKey, row);
                    }
                    
                    // Cleanup
                    pool.forEach((row, k) => { if (!nextPool.has(k)) { row.nodes.forEach(n => n.remove()); row.cleanups.forEach(f => f()); } });
                    pool = nextPool;
                }, cleanups);
                return;
            }

            // 5. Refs
            if (val = attr(el, 'data-ref')) state.refs[val] = el;

            // 6. Ops (Text, Html, Value) - One Time (*) Support
            ['text', 'html', 'value'].forEach(t => {
                if (val = attr(el, `data-${t}`)) {
                    const isStatic = val.startsWith('*');
                    const p = isStatic ? val.slice(1) : val;
                    const run = () => ops[t](el, getValue(scope, p));
                    isStatic ? run() : regFx(run, cleanups);
                }
            });

            // 7. Props & Class
            ['data-props:props', 'data-class:class'].forEach(def => {
                const [a, op] = def.split(':');
                if (val = attr(el, a)) val.split(',').forEach(i => {
                    const [arg, path] = i.split(':').map(s => s.trim());
                    regFx(() => ops[op](el, getValue(scope, path), arg), cleanups);
                });
            });

            let child = el.firstElementChild;
            while (child) { walk(child, scope, cleanups); child = child.nextElementSibling; }
        };

        walk(root, state, stoppers);
        if (state.init) state.init();

        return { unmount: () => { root._isMounted = false; attachedEvents.forEach(evt => root.removeEventListener(evt, handleEvent, captures.has(evt))); stoppers.forEach(fn => fn()); } };
    };

    return { define: (n, f) => registry[n] = f, start: () => document.querySelectorAll('[data-func]').forEach(mount) };
})();

export default spikip;
