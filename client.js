/**
 * Browser half of the Agent pixel construction site (像素工地).
 *
 * Registers one entry in the `conversation.input.dock` strip: an ambient
 * pixel-art site where the session's agents appear as construction workers.
 * All durable state arrives through the framework-standard
 * `useProjection('pixelSite')` seat (host-computed; this half never folds
 * session events). The host theme provides the frame colors; the artwork
 * keeps its own fixed pixel palette.
 */

window.__ModuleLoader__.load({
  id: '@jerry117/agent-pixel-site',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'pixelSite'

    /** Simplified Chinese dictionary (the key-set source of truth). */
    const zh = {
      'site.aria': '像素工地',
      'foreman': '工头',
      'workers.unit': '名工人',
      'archive.room': '档案室',
      'board': '任务牌',
      'state.rest': '喝茶待命',
      'state.plan': '看图纸',
      'state.archive': '在档案室翻资料',
      'state.build': '砌墙盖房',
      'state.work': '敲敲打打',
      'state.smoke': '工具出错冒烟',
      'state.sign': '举牌等审批',
      'state.done': '完工收工',
    }

    /** English dictionary, keyed with the zh set. */
    const en = {
      'site.aria': 'Agent pixel site',
      'foreman': 'Foreman',
      'workers.unit': 'workers on site',
      'archive.room': 'Archive',
      'board': 'Task board',
      'state.rest': 'Idle, sipping tea',
      'state.plan': 'Reviewing the plan',
      'state.archive': 'Digging through the archive',
      'state.build': 'Building the house',
      'state.work': 'Hammering away',
      'state.smoke': 'Smoke — a tool call failed',
      'state.sign': 'Holding up a sign for approval',
      'state.done': 'Job done',
    }

    const STATE_ORDER = ['plan', 'archive', 'build', 'work', 'smoke', 'sign', 'done', 'rest']

    const DOT_COLORS = {
      rest: '#9aa2ad',
      plan: '#8f6cc9',
      archive: '#4f74a8',
      build: '#ecce4d',
      work: '#3fa08c',
      smoke: '#d05a4e',
      sign: '#e0762f',
      done: '#5f9c4f',
    }

    const BOOK_COLORS = ['#c0504d', '#5b87c5', '#e0b050', '#6aa84f', '#8f6cc9']

    const STYLE = `
.dsh-pixel-site { position: relative; max-width: 100%; margin: 2px 0 8px; }
.dsh-pixel-site-row { display: flex; align-items: flex-end; justify-content: center; gap: 6px; overflow-x: auto; padding: 4px 8px 2px; scrollbar-width: thin; }
@supports (justify-content: safe center) {
  .dsh-pixel-site-row { justify-content: safe center; }
}
.dsh-pixel-site-cell { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: none; min-width: 40px; }
.dsh-pixel-site-sprites { display: flex; align-items: flex-end; gap: 4px; border-bottom: 4px solid #a06a3c; padding: 0 2px; }
.dsh-pixel-site-label { display: flex; align-items: center; gap: 4px; max-width: 96px; font-size: 10px; line-height: 12px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; }
.dsh-pixel-site-label > span { overflow: hidden; text-overflow: ellipsis; }
.dsh-px-help { cursor: help; }
.dsh-px-panel { display: none; position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% + 8px); max-width: 340px; padding: 8px 10px; border-radius: 8px; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l1); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18); color: var(--dsw-alias-label-primary); font-size: 11px; line-height: 18px; pointer-events: none; z-index: 40; text-align: left; }
.dsh-px-panel-head { color: var(--dsw-alias-label-secondary); font-weight: 600; margin-bottom: 4px; }
.dsh-px-panel-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-px-panel-row > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-px-panel-done { color: var(--dsw-alias-label-secondary); text-decoration: line-through; }
.dsh-pixel-site:has(.dsh-px-board-cell:hover) .dsh-px-panel { display: block; }
.dsh-px-dot { flex: none; width: 6px; height: 6px; border-radius: 50%; background: #9aa2ad; }
.dsh-px-house { position: relative; flex: none; }
.dsh-px-smoke { position: absolute; pointer-events: none; }
.dsh-px-smoke i { position: absolute; width: 9px; height: 9px; border-radius: 50%; background: #b9c1cd; opacity: 0; animation: dshPxPuff 1.9s linear infinite; }
.dsh-px-smoke i:nth-child(2) { animation-delay: .63s; }
.dsh-px-smoke i:nth-child(3) { animation-delay: 1.26s; }
@keyframes dshPxPuff { 0% { transform: translate(1px, 0) scale(.5); opacity: 0; } 18% { opacity: .85; } 100% { transform: translate(7px, -24px) scale(1.25); opacity: 0; } }
.dsh-px-sign { transform-origin: 9px 5px; animation: dshPxWave 1.1s ease-in-out infinite; }
@keyframes dshPxWave { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
.dsh-px-hammer { animation: dshPxHammer .55s steps(2, end) infinite; }
@keyframes dshPxHammer { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
.dsh-px-bob { animation: dshPxBob .9s ease-in-out infinite; }
@keyframes dshPxBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.dsh-px-pulse { animation: dshPxPulse 1.2s ease-in-out infinite; }
@keyframes dshPxPulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) {
  .dsh-pixel-site .dsh-px-smoke i { animation: none; opacity: .85; transform: translate(5px, -12px) scale(1.1); }
  .dsh-pixel-site .dsh-px-sign, .dsh-pixel-site .dsh-px-hammer,
  .dsh-pixel-site .dsh-px-bob, .dsh-pixel-site .dsh-px-pulse { animation: none; }
}
`

    /** One crisp-edged pixel-art SVG. */
    function PixelSvg({ w, h: height, scale = 3, className, children }) {
      return h('svg', {
        viewBox: `0 0 ${w} ${height}`,
        width: w * scale,
        height: height * scale,
        shapeRendering: 'crispEdges',
        'aria-hidden': true,
        className,
        style: { display: 'block', overflow: 'visible', flex: 'none' },
      }, children)
    }

    function R(x, y, w, height, fill, key) {
      return h('rect', { key, x, y, width: w, height, fill })
    }

    /**
     * The worker figure: 12×19 grid, drawn from y5 down; y0-4 is headroom for
     * a held sign. `variant` picks the helmet and shirt colors, `state` adds
     * the held item.
     */
    function PixelGuy({ variant, state }) {
      const foreman = variant === 'foreman'
      const helmet = foreman ? '#f5c542' : '#e6e9ef'
      const helmetDark = foreman ? '#d9a92f' : '#b6bfcc'
      const shirt = foreman ? '#4f74a8' : '#58923e'
      const shirtDark = foreman ? '#3c5a86' : '#437332'
      const rects = [
        R(3, 5, 6, 2, helmet, 'helm'),
        R(2, 7, 8, 1, helmetDark, 'brim'),
        R(4, 8, 5, 3, '#e8b48c', 'face'),
        R(5, 9, 1, 1, '#3a2a1e', 'eyeL'),
        R(7, 9, 1, 1, '#3a2a1e', 'eyeR'),
        R(4, 11, 5, 4, shirt, 'body'),
        R(3, 11, 1, 2, shirtDark, 'armL'),
        R(9, 11, 1, 2, shirtDark, 'armR'),
        R(3, 13, 1, 1, '#e8b48c', 'handL'),
        R(9, 13, 1, 1, '#e8b48c', 'handR'),
        R(4, 15, 2, 3, '#2f3b4a', 'legL'),
        R(7, 15, 2, 3, '#2f3b4a', 'legR'),
        R(4, 18, 2, 1, '#22303f', 'bootL'),
        R(7, 18, 2, 1, '#22303f', 'bootR'),
      ]
      let overlay = null
      if (state === 'sign') {
        overlay = h('g', { className: 'dsh-px-sign' }, [
          R(8, 1, 1, 4, '#6e4a2c', 'stick'),
          R(5, 0, 6, 2, '#e0c48c', 'board'),
          R(7, 0, 1, 2, '#7a2d2d', 'mark'),
        ])
      } else if (state === 'build') {
        // Laying bricks: a growing wall row beside the worker, distinct from the hammer.
        overlay = h('g', { className: 'dsh-px-bob' }, [
          R(8, 12, 2, 1, '#b5534c', 'brickTL'),
          R(10, 12, 2, 1, '#b5534c', 'brickTR'),
          R(9, 13, 2, 1, '#a04438', 'brickB'),
        ])
      } else if (state === 'work') {
        overlay = h('g', { className: 'dsh-px-hammer' }, [
          R(9, 8, 1, 5, '#8a5a33', 'handle'),
          R(8, 7, 3, 2, '#9aa2ad', 'head'),
        ])
      } else if (state === 'archive') {
        overlay = h('g', { className: 'dsh-px-bob' }, [
          R(9, 12, 3, 2, '#a9713b', 'folder'),
          R(9, 12, 3, 1, '#8a5a33', 'flap'),
        ])
      } else if (state === 'plan') {
        overlay = h('g', { className: 'dsh-px-bob' }, [
          R(8, 11, 4, 3, '#cfe0f0', 'paper'),
          R(9, 12, 2, 1, '#4f74a8', 'line1'),
        ])
      } else if (state === 'rest') {
        overlay = h('g', null, [
          R(10, 17, 2, 2, '#f2ede4', 'cup'),
          R(9, 17, 1, 1, '#f2ede4', 'cupHandle'),
        ])
      } else if (state === 'done') {
        overlay = h('g', null, [
          R(8, 1, 1, 4, '#6e4a2c', 'pole'),
          R(9, 1, 3, 2, '#5f9c4f', 'flag'),
        ])
      }
      return h(PixelSvg, { w: 12, h: 19, scale: foreman ? 3 : 2 }, rects, overlay)
    }

    /** The foreman's house under construction; `doneRatio` raises the roof rows. */
    function PixelHouse({ doneRatio, roofed }) {
      const rects = [
        R(2, 8, 1, 7, '#b98a54', 'poleL'),
        R(15, 8, 1, 7, '#b98a54', 'poleR'),
        R(2, 8, 14, 1, '#b98a54', 'beam'),
        R(3, 10, 12, 5, '#d9b382', 'wall'),
        R(3, 12, 12, 1, '#c49a66', 'plank'),
        R(8, 12, 2, 3, '#6e4a2c', 'door'),
        R(5, 10, 2, 2, '#9fc4e8', 'winL'),
        R(11, 10, 2, 2, '#9fc4e8', 'winR'),
        R(13, 5, 2, 4, '#7a5a48', 'chimney'),
      ]
      const rows = [[9, 5, 8], [8, 6, 6], [7, 7, 4], [6, 8, 2]]
      const roofRows = roofed ? 4 : Math.max(0, Math.min(4, Math.round(doneRatio * 4)))
      rows.slice(0, roofRows).forEach(([y, x, w], i) => rects.push(R(x, y, w, 1, '#b5534c', 'roof' + i)))
      if (roofed) {
        rects.push(R(4, 4, 1, 4, '#6e4a2c', 'flagPole'))
        rects.push(R(5, 4, 3, 2, '#5f9c4f', 'flag'))
      }
      return h(PixelSvg, { w: 18, h: 16, scale: 3 }, rects)
    }

    /** A one-shot worker's tent. */
    function PixelTent() {
      return h(PixelSvg, { w: 10, h: 8, scale: 3 }, [
        R(4, 2, 2, 1, '#d9784a', 'r0'),
        R(3, 3, 4, 1, '#d9784a', 'r1'),
        R(2, 4, 6, 1, '#d9784a', 'r2'),
        R(1, 5, 8, 1, '#d9784a', 'r3'),
        R(0, 6, 10, 2, '#c96a3e', 'r4'),
        R(4, 5, 2, 3, '#5f3d20', 'mouth'),
      ])
    }

    /** A continuable/external worker's hut; workflow members get a blueprint hut. */
    function PixelHut({ tint }) {
      const wall = tint === 'workflow' ? '#8fb0d9' : '#c9a15f'
      const roof = tint === 'workflow' ? '#4f74a8' : '#7a4f2a'
      return h(PixelSvg, { w: 10, h: 8, scale: 3 }, [
        R(1, 0, 8, 1, '#8a5f38', 'ridge'),
        R(0, 1, 10, 2, roof, 'roof'),
        R(1, 3, 8, 5, wall, 'wall'),
        R(4, 5, 2, 3, '#6e4a2c', 'door'),
        R(2, 4, 1, 1, '#9fc4e8', 'winL'),
        R(7, 4, 1, 1, '#9fc4e8', 'winR'),
      ])
    }

    /** The archive room (档案室): an awning cabinet of colored file spines. */
    function PixelArchive({ active }) {
      const rects = [
        R(0, 0, 12, 2, '#b5534c', 'awning'),
        R(0, 2, 12, 12, '#7a4f2a', 'frame'),
        R(1, 3, 10, 10, '#5f3d20', 'inner'),
        R(1, 6, 10, 1, '#7a4f2a', 'shelf1'),
        R(1, 9, 10, 1, '#7a4f2a', 'shelf2'),
      ]
      const rows = [[3, 3], [7, 2], [10, 3]]
      rows.forEach(([y, height], rowIndex) => {
        for (let i = 0; i < 5; i++) {
          rects.push(R(2 + i * 2, y, 1, height, BOOK_COLORS[(rowIndex * 2 + i) % BOOK_COLORS.length], 'book' + rowIndex + '-' + i))
        }
      })
      if (active) rects.push(R(0, 2, 12, 1, '#f5c542', 'lit'))
      return h(PixelSvg, { w: 12, h: 14, scale: 3, className: active ? 'dsh-px-bob' : undefined }, rects)
    }

    /** The task board (任务牌) with up to three todo rows. */
    function PixelBoard({ todos }) {
      const rects = [
        R(0, 0, 12, 8, '#7a4f2a', 'frame'),
        R(1, 1, 10, 6, '#f2e2c4', 'paper'),
        R(2, 8, 1, 4, '#6e4a2c', 'postL'),
        R(9, 8, 1, 4, '#6e4a2c', 'postR'),
      ]
      const rows = todos.slice(0, 3)
      rows.forEach((todo, i) => {
        const y = 1 + i * 2
        const color = todo.status === 'completed' ? '#5f9c4f' : todo.status === 'in_progress' ? '#d9952f' : '#9aa2ad'
        rects.push(R(2, y, 1, 1, color, 'sq' + i))
        const width = Math.min(6, Math.max(1, Math.ceil((todo.content || ' ').length / 10)))
        rects.push(R(4, y, width, 1, todo.status === 'completed' ? '#a8b0a0' : '#6b5b45', 'bar' + i))
      })
      return h(PixelSvg, { w: 12, h: 12, scale: 3 }, rects)
    }

    /** Animated smoke puffs anchored at a sprite corner. */
    function Smoke({ at }) {
      return h('i', { className: 'dsh-px-smoke', style: at, 'aria-hidden': true },
        h('i', null), h('i', null), h('i', null),
      )
    }

    function stateLabelKey(state) {
      return STATE_ORDER.includes(state) ? 'state.' + state : 'state.rest'
    }

    /**
     * The dock entry. Props come from the slot runtime: the standard projection
     * seat plus the locale translate. This component deliberately uses ONLY
     * runtime-provided hook props (`useProjection`): react hooks required from
     * the module table are not dispatcher-paired in this deployment and throw
     * React #321, which the slot error boundary turns into silent abdication.
     * A render failure degrades to a hidden strip instead of a crashed entry.
     */
    function PixelSiteDock(props) {
      try {
        // The renderer probes/instantiates entries with undefined props during
        // assembly; destructuring that crashes and permanently abdicates the
        // entry. Tolerate it: a props-less pass renders nothing.
        const { useProjection, t } = props ?? {}
        if (typeof useProjection !== 'function' || typeof t !== 'function') return null
        let site
        try {
          site = useProjection('pixelSite')
        } catch {
          site = null
        }
        // Always-on posture: an unavailable projection (undefined/null) shows
        // the idle site, so a loaded module is always visible.
        const siteObject = site !== null && typeof site === 'object' ? site : {}
        const foreman = siteObject.foreman ?? { state: 'rest', detail: null }
      const workers = Array.isArray(siteObject.workers) ? siteObject.workers : []
      const todos = Array.isArray(siteObject.todos) ? siteObject.todos : []

      const foremanStateLabel = t(stateLabelKey(foreman.state))
      const doneCount = todos.filter(todo => todo.status === 'completed').length
      const doneRatio = todos.length > 0 ? doneCount / todos.length : 0

      // Screen readers get the whole picture: foreman, board, and each worker's state.
      const ariaParts = [t('site.aria'), `${t('foreman')}: ${foremanStateLabel}`]
      if (todos.length > 0) ariaParts.push(`${t('board')} ${doneCount}/${todos.length}`)
      if (workers.length > 0 && workers.length <= 3) {
        for (const worker of workers) {
          ariaParts.push(`${worker.name}: ${t(stateLabelKey(worker.state))}`)
        }
      } else if (workers.length > 3) {
        const smoking = workers.filter(worker => worker.state === 'smoke').length
        const building = workers.filter(worker => worker.state === 'build').length
        ariaParts.push(
          `${workers.length} ${t('workers.unit')}`
          + (building > 0 ? ` · ${building} ${t('state.build')}` : '')
          + (smoking > 0 ? ` · ${smoking} ${t('state.smoke')}` : ''),
        )
      }

      // Board cell (任务牌): hover lists every task with its status marker.
      const boardTitle = [
        `${t('board')} ${doneCount}/${todos.length}`,
        ...todos.map(todo => (todo.status === 'completed' ? '✓ ' : todo.status === 'in_progress' ? '▶ ' : '○ ') + (todo.content || '…')),
      ].join('\n')
      const boardCell = todos.length > 0
        ? h('div', { className: 'dsh-pixel-site-cell dsh-px-help dsh-px-board-cell', title: boardTitle },
          h(PixelBoard, { todos }),
          h('div', { className: 'dsh-pixel-site-label' }, h('span', null, `${t('board')} ${doneCount}/${todos.length}`)),
        )
        : null

      // Archive cell; the foreman walks here while reading.
      const foremanAtArchive = foreman.state === 'archive'
      const archiveCell = h('div', { className: 'dsh-pixel-site-cell', title: t('archive.room') },
        h('div', { className: 'dsh-pixel-site-sprites' },
          h(PixelArchive, { active: foremanAtArchive }),
          foremanAtArchive ? h(PixelGuy, { variant: 'foreman', state: foreman.state }) : null,
        ),
        h('div', { className: 'dsh-pixel-site-label' }, h('span', null, t('archive.room'))),
      )

      // Foreman cell: house + the foreman (unless he is at the archive).
      const foremanTitle = `${t('foreman')}: ${foremanStateLabel}` + (foreman.detail ? ` · ${foreman.detail}` : '')
      const foremanCell = h('div', { className: 'dsh-pixel-site-cell dsh-px-help', title: foremanTitle },
        h('div', { className: 'dsh-pixel-site-sprites' },
          h('div', { className: 'dsh-px-house' },
            h(PixelHouse, { doneRatio, roofed: doneRatio >= 1 }),
            foreman.state === 'smoke' ? h(Smoke, { at: { right: 4, top: -6 } }) : null,
          ),
          foremanAtArchive ? null : h(PixelGuy, { variant: 'foreman', state: foreman.state }),
        ),
        h('div', { className: 'dsh-pixel-site-label' },
          h('i', { className: 'dsh-px-dot' + (foreman.state === 'sign' ? ' dsh-px-pulse' : ''), style: { background: DOT_COLORS[foreman.state] ?? DOT_COLORS.rest } }),
          h('span', null, `${t('foreman')} · ${foremanStateLabel}`),
        ),
      )

      // Worker cells: one shelter + one worker each.
      const workerCells = workers.map(worker => {
        const label = t(stateLabelKey(worker.state))
        const title = `${worker.name}: ${label}` + (worker.detail ? ` · ${worker.detail}` : '')
        const shelter = worker.mode === 'one-shot'
          ? h(PixelTent, null)
          : h(PixelHut, { tint: worker.kind === 'workflow' ? 'workflow' : undefined })
        return h('div', { className: 'dsh-pixel-site-cell dsh-px-help', key: worker.id, title },
          h('div', { className: 'dsh-pixel-site-sprites', style: { position: 'relative' } },
            shelter,
            h(PixelGuy, { variant: 'worker', state: worker.state }),
            worker.state === 'smoke' ? h(Smoke, { at: { left: '50%', top: -4 } }) : null,
          ),
          h('div', { className: 'dsh-pixel-site-label' },
            h('i', { className: 'dsh-px-dot' + (worker.state === 'sign' ? ' dsh-px-pulse' : ''), style: { background: DOT_COLORS[worker.state] ?? DOT_COLORS.rest } }),
            h('span', null, worker.name),
          ),
        )
      })

      // Hover detail panel (任务牌明细): styled task list, shown on board hover via CSS :has.
      const boardPanel = todos.length > 0
        ? h('div', { className: 'dsh-px-panel', 'aria-hidden': true },
          h('div', { className: 'dsh-px-panel-head' }, `${t('board')} ${doneCount}/${todos.length}`),
          ...todos.map((todo, i) => h('div', { className: 'dsh-px-panel-row', key: String(i) },
            h('i', { className: 'dsh-px-dot', style: { background: todo.status === 'completed' ? DOT_COLORS.done : todo.status === 'in_progress' ? DOT_COLORS.build : DOT_COLORS.rest } }),
            h('span', { className: todo.status === 'completed' ? 'dsh-px-panel-done' : undefined }, todo.content || '…'),
          )),
        )
        : null

      return h('div', { className: 'dsh-pixel-site', role: 'img', 'aria-label': ariaParts.join(' · ') },
        h('style', null, STYLE),
        h('div', { className: 'dsh-pixel-site-row' },
          boardCell,
          archiveCell,
          foremanCell,
          ...workerCells,
        ),
        boardPanel,
      )
      } catch {
        // A render failure degrades to a hidden strip, never a crashed entry.
        return null
      }
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'pixel-site: dictionaries')
        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
          name: 'conversation.input.dock',
          id: 'pixel-site',
          order: 15,
          locale: NS,
        }, PixelSiteDock))
      },
    }
  },
})
