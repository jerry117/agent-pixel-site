/**
 * Recursive render verification for agent-pixel-site client components.
 * Simulates React's element processing: walks the tree produced by the
 * module's createElement stub, invoking every function-typed component with
 * its props (children folded into props.children like real createElement).
 * Any component that throws fails the test — this is the layer the slot
 * error boundary would catch in the browser (and abdicate the entry for).
 */
import nodeRequire from 'node:module'
const require = nodeRequire.createRequire(import.meta.url)

// createElement stub mirroring React's children folding.
const createElement = (type, props, ...kids) => ({
  __el: true,
  type,
  props: {
    ...(props ?? {}),
    ...(kids.length > 0
      ? { children: kids.length === 1 ? kids[0] : kids }
      : {}),
  },
})

const fakeReact = { createElement }
globalThis.window = { __ModuleLoader__: { load(mod) { globalThis.__mod = mod } } }
await import('./client.js')
const face = globalThis.__mod.factory(name => (name === 'react' ? fakeReact : require(name)))
face.apply({ effect: fn => fn(), locale: { register: () => {} }, slots: { inject: () => {}, register: () => ({}) } })

let renders = 0
let failures = 0

function renderNode(node, trail) {
  if (node === null || node === undefined) return
  if (['string', 'number', 'boolean'].includes(typeof node)) return
  if (Array.isArray(node)) {
    node.forEach((child, i) => renderNode(child, `${trail}[${i}]`))
    return
  }
  if (node.__el !== true) throw new Error(`${trail}: unexpected node ${String(node)}`)
  const { type, props } = node
  if (typeof type === 'function') {
    renders++
    const out = type(props)
    renderNode(out, `${trail}<${type.name || 'anon'}>`)
  } else {
    renderNode(props.children, `${trail}<${String(type)}>`)
  }
}

const sampleSite = {
  foreman: { state: 'build', detail: 'wall.js' },
  workers: [
    { id: 'sub:k1', name: 'helper', kind: 'subagent', mode: 'one-shot', state: 'smoke', detail: 'test' },
    { id: 'wf:r:0', name: 'flow-0', kind: 'workflow', mode: 'workflow', state: 'build', detail: 'scan' },
  ],
  activeDispatch: null,
  pendingAsk: null,
  todos: [
    { content: '写插件', status: 'completed' },
    { content: '验收', status: 'in_progress' },
  ],
}

const t = key => `t:${key}`
const useProjection = key => (key === 'pixelSite' ? sampleSite : undefined)
const dockProps = { useProjection, t }

try {
  renderNode(createElement(face.__component ?? (() => null), {}), 'noop')
} catch { /* placeholder; real run below */ }

// Pull PixelSiteDock out of a fresh registration capture.
let DockComponent = null
const captureCtx = {
  effect: fn => fn(),
  locale: { register: () => {} },
  slots: {
    inject: (key, cb) => cb(),
    register: (decl, comp) => { if (decl.id === 'pixel-site') DockComponent = comp; return () => {} },
  },
}
face.apply(captureCtx)
if (typeof DockComponent !== 'function') {
  console.error('FAIL: dock component not captured')
  process.exit(1)
}

// 1. Full recursive render of the dock entry with live-shaped props.
try {
  renderNode(createElement(DockComponent, dockProps), 'dock')
  console.log('ok: dock full recursive render')
} catch (error) {
  failures++
  console.error(`FAIL: dock render threw: ${error.message}`)
}

// 2. Props-less probe (renderer assembly calls) must not throw.
try {
  const out = DockComponent(undefined)
  if (out !== null) { failures++; console.error('FAIL: props-less probe should return null') }
  else console.log('ok: props-less probe returns null')
} catch (error) {
  failures++
  console.error(`FAIL: props-less probe threw: ${error.message}`)
}

// 3. Every foreman/worker state variant across all sprite components.
const states = ['rest', 'plan', 'archive', 'build', 'work', 'smoke', 'sign', 'done']
const variants = ['foreman', 'worker']
let combos = 0
try {
  for (const state of states) {
    for (const variant of variants) {
      const site = {
        ...sampleSite,
        foreman: { state, detail: null },
        workers: [
          { id: 'a', name: 'w1', kind: 'subagent', mode: 'one-shot', state, detail: null },
          { id: 'b', name: 'w2', kind: 'subagent', mode: 'continuable', state, detail: null },
          { id: 'c', name: 'w3', kind: 'workflow', mode: 'workflow', state, detail: null },
        ],
        todos: [],
      }
      renderNode(createElement(DockComponent, { useProjection: () => site, t }), `state.${state}.${variant}`)
      combos++
    }
  }
  console.log(`ok: ${combos} state/variant/mode combos rendered recursively`)
} catch (error) {
  failures++
  console.error(`FAIL: state matrix threw: ${error.message}`)
}

// 4. Empty projection (undefined/null) and missing locale seat.
try {
  renderNode(createElement(DockComponent, { useProjection: () => undefined, t }), 'empty-undef')
  renderNode(createElement(DockComponent, { useProjection: () => null, t }), 'empty-null')
  renderNode(createElement(DockComponent, {}), 'no-hooks')
  console.log('ok: empty/absent projection renders')
} catch (error) {
  failures++
  console.error(`FAIL: empty projection threw: ${error.message}`)
}

console.log(`component invocations: ${renders}`)
if (failures > 0) {
  console.error(`${failures} FAILURE(S)`)
  process.exit(1)
}
console.log('ALL RECURSIVE RENDER CHECKS PASSED')
