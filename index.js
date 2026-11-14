/**
 * Host half of the Agent pixel construction site (像素工地).
 *
 * One custom session projection `pixelSite`, folded purely from the owning
 * session log:
 * - the session's own agent is the foreman (工头). Its tool calls drive the
 *   site states: reading tools send it to the archive room (档案室), file
 *   edits raise the house, failed tool results light the smoke, and an
 *   `approval/asked` audit event raises the approval sign (举牌).
 * - every parent-owned `subagent/catalog` child becomes a worker with a tent
 *   (one-shot) or a hut (continuable/external); `subagent`/`spawn_teammate`
 *   dispatches mark that worker as building until its `tool/result` settles.
 * - `tool-workflow/*` records add workflow-member workers and settle them by
 *   outcome (completed → done flag, failed/cancelled → smoke).
 * - `todo/write` keeps the site task board (任务牌) up to date.
 *
 * State is plain JSON so projection checkpoints serialize it unchanged; the
 * fold returns the same reference for events it ignores. `wire.view` serves
 * the whole state to the Client, which never folds session events itself.
 */

/** Bump when the fold semantics or state shape change. */
export const STATE_VERSION = 2

const STATE_SET = new Set(['rest', 'plan', 'archive', 'build', 'work', 'smoke', 'sign', 'done'])

/** Tools that send the foreman to the archive room (档案室). */
const ARCHIVE_TOOLS = new Set([
  'read', 'read_image', 'glob', 'grep', 'web_search', 'web_fetch',
  'session_search', 'session_event_read', 'session_event_search',
  'session_trace', 'session_event_trace',
  'cordis_inspect_list', 'cordis_inspect_query', 'list_agents', 'list_subagent_models',
  'job_list', 'job_output', 'schedule_list', 'schedule_view',
  'terminal_list', 'terminal_read', 'team_task_list', 'team_task_get',
  'office_render',
])

/** Tools that raise the house (盖房子). */
const BUILD_TOOLS = new Set(['write', 'edit', 'apply_patch'])

/** Tools where the foreman holds up a sign while waiting. */
const SIGN_TOOLS = new Set(['ask_user_question'])

/** Tools that dispatch a catalogued subagent worker. */
const DISPATCH_TOOLS = new Set(['subagent', 'spawn_teammate'])

const MAX_WORKERS = 12
const MAX_DETAIL_CHARS = 48
const MAX_NAME_CHARS = 14
const MAX_TODOS = 8

/** Argument keys worth showing as the site activity detail, in preference order. */
const DETAIL_KEYS = [
  'path', 'file_path', 'command', 'query', 'pattern', 'url',
  'name', 'description', 'objective', 'subject',
]

function clipString(value, max = MAX_DETAIL_CHARS) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max - 1) + '…'
}

function sanitizeName(value, fallback) {
  const clipped = clipString(value, MAX_NAME_CHARS)
  return clipped ?? fallback
}

/** Pick a short human-readable detail out of a raw tool-arguments JSON string. */
function detailFromArguments(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return clipString(raw)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  for (const key of DETAIL_KEYS) {
    const value = parsed[key]
    if (typeof value === 'string' && value.trim().length > 0) return clipString(value)
  }
  for (const value of Object.values(parsed)) {
    if (typeof value === 'string' && value.trim().length > 0) return clipString(value)
  }
  return null
}

function errorLabel(error) {
  if (error !== null && typeof error === 'object') {
    return clipString(error.name) ?? clipString(error.code) ?? 'error'
  }
  return 'error'
}

function appendWorker(workers, worker) {
  const next = [...workers, worker]
  return next.length > MAX_WORKERS ? next.slice(next.length - MAX_WORKERS) : next
}

function patchWorker(workers, workerId, patch) {
  let changed = false
  const next = workers.map(worker => {
    if (worker.id !== workerId) return worker
    const merged = { ...worker, ...patch }
    if (merged.state === worker.state && merged.detail === worker.detail) return worker
    changed = true
    return merged
  })
  return changed ? next : workers
}

function todosEqual(a, b) {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].content !== b[i].content || a[i].status !== b[i].status) return false
  }
  return true
}

/**
 * Fold one committed session event into the site state.
 * @param state - the projection covering all prior events.
 * @param event - the next committed session event.
 * @returns the next state (the same reference when the event is unrelated).
 */
export function applySiteEvent(state, event) {
  const type = event?.type
  const data = event?.data
  switch (type) {
    case 'turn/start': {
      if (state.foreman.state === 'plan') return state
      return { ...state, foreman: { state: 'plan', detail: null } }
    }

    case 'turn/end': {
      // Dispatches cannot outlive their turn: settle workers a dropped
      // dispatch left hammering so nobody builds forever.
      let workers = state.workers
      let workersChanged = false
      workers = workers.map(worker => {
        if (worker.state === 'build') {
          workersChanged = true
          return { ...worker, state: 'done' }
        }
        return worker
      })
      if (state.foreman.state === 'rest' && state.foreman.detail === null
        && state.activeDispatch === null && state.pendingAsk === null && !workersChanged) return state
      return { ...state, foreman: { state: 'rest', detail: null }, workers, activeDispatch: null, pendingAsk: null }
    }

    case 'tool/call': {
      const name = typeof data?.name === 'string' ? data.name : ''
      const detail = detailFromArguments(data?.arguments)

      if (SIGN_TOOLS.has(name)) {
        return { ...state, foreman: { state: 'sign', detail: detail ?? '?' } }
      }

      if (DISPATCH_TOOLS.has(name)) {
        // Pair the dispatch with a catalogued worker when the arguments name one.
        let target = null
        try {
          const parsed = JSON.parse(typeof data.arguments === 'string' ? data.arguments : 'null')
          if (parsed !== null && typeof parsed === 'object' && typeof parsed.name === 'string') target = parsed.name
        } catch { /* unnamed dispatch */ }
        let workers = state.workers
        let workerId = null
        if (target !== null) {
          for (let i = workers.length - 1; i >= 0; i--) {
            if (workers[i].name === target) { workerId = workers[i].id; break }
          }
          if (workerId !== null) workers = patchWorker(workers, workerId, { state: 'build' })
        }
        return {
          ...state,
          foreman: { state: 'build', detail: detail ?? 'dispatch' },
          workers,
          activeDispatch: { callId: typeof data.callId === 'string' ? data.callId : null, workerId },
        }
      }

      const next = ARCHIVE_TOOLS.has(name) ? 'archive' : BUILD_TOOLS.has(name) ? 'build' : 'work'
      if (state.foreman.state === next && state.foreman.detail === detail) return state
      return { ...state, foreman: { state: next, detail } }
    }

    case 'tool/result': {
      const message = data?.message
      const failed = data?.error != null || message?.isError === true
      const callId = typeof message?.toolCallId === 'string' ? message.toolCallId : null
      const dispatch = state.activeDispatch
      const settlesDispatch = dispatch !== null
        && typeof dispatch.callId === 'string'
        && callId !== null
        && dispatch.callId === callId

      if (settlesDispatch) {
        const workers = dispatch.workerId !== null
          ? patchWorker(state.workers, dispatch.workerId, { state: failed ? 'smoke' : 'done' })
          : state.workers
        const foreman = failed
          ? { state: 'smoke', detail: errorLabel(data.error) }
          : state.foreman.state === 'build' ? { state: 'rest', detail: null } : state.foreman
        return { ...state, foreman, workers, activeDispatch: null }
      }
      if (failed) {
        const detail = errorLabel(data?.error)
        if (state.foreman.state === 'smoke' && state.foreman.detail === detail) return state
        return { ...state, foreman: { state: 'smoke', detail } }
      }
      return state
    }

    case 'approval/asked': {
      return {
        ...state,
        foreman: { state: 'sign', detail: clipString(data?.toolName) ?? '?' },
        pendingAsk: typeof data?.id === 'string' ? data.id : null,
      }
    }

    case 'approval/decided': {
      if (state.pendingAsk === null || state.pendingAsk !== data?.id) return state
      return { ...state, foreman: { state: 'rest', detail: null }, pendingAsk: null }
    }

    case 'subagent/catalog': {
      const childId = typeof data?.childId === 'string' ? data.childId : null
      if (childId === null) return state
      const workerId = 'sub:' + childId
      if (state.workers.some(worker => worker.id === workerId)) return state
      const mode = typeof data.mode === 'string' ? data.mode : 'one-shot'
      const worker = {
        id: workerId,
        name: sanitizeName(data.name ?? data.label, 'worker-' + (state.workers.length + 1)),
        kind: 'subagent',
        mode,
        state: 'rest',
        detail: clipString(data.label),
      }
      let workers = appendWorker(state.workers, worker)
      let activeDispatch = state.activeDispatch
      // Claim a dispatch that opened before this child was catalogued.
      if (activeDispatch !== null && activeDispatch.workerId === null) {
        activeDispatch = { ...activeDispatch, workerId }
        workers = patchWorker(workers, workerId, { state: 'build' })
      }
      return { ...state, workers, activeDispatch }
    }

    case 'tool-workflow/agent-start': {
      const runId = typeof data?.runId === 'string' ? data.runId : null
      const seq = typeof data?.seq === 'number' ? data.seq : null
      if (runId === null || seq === null) return state
      const workerId = 'wf:' + runId + ':' + seq
      if (state.workers.some(worker => worker.id === workerId)) return state
      const worker = {
        id: workerId,
        name: sanitizeName(data.label, 'flow-' + seq),
        kind: 'workflow',
        mode: 'workflow',
        state: 'build',
        detail: clipString(data.phase),
      }
      return { ...state, workers: appendWorker(state.workers, worker) }
    }

    case 'tool-workflow/agent-end': {
      const runId = typeof data?.runId === 'string' ? data.runId : null
      const seq = typeof data?.seq === 'number' ? data.seq : null
      if (runId === null || seq === null) return state
      const workerId = 'wf:' + runId + ':' + seq
      const next = data?.outcome === 'completed' ? 'done' : 'smoke'
      const workers = patchWorker(state.workers, workerId, { state: next })
      return workers === state.workers ? state : { ...state, workers }
    }

    case 'tool-workflow/run-end': {
      const runId = typeof data?.runId === 'string' ? data.runId : null
      if (runId === null) return state
      let changed = false
      const workers = state.workers.map(worker => {
        if (worker.kind === 'workflow' && worker.id.startsWith('wf:' + runId + ':') && worker.state === 'build') {
          changed = true
          return { ...worker, state: 'done' }
        }
        return worker
      })
      return changed ? { ...state, workers } : state
    }

    case 'todo/write': {
      const raw = Array.isArray(data?.todos) ? data.todos : null
      if (raw === null) return state
      const todos = raw.slice(0, MAX_TODOS).map(item => ({
        content: clipString(item?.content, 64) ?? '',
        status: item?.status === 'completed' ? 'completed' : item?.status === 'in_progress' ? 'in_progress' : 'pending',
      }))
      if (todosEqual(todos, state.todos)) return state
      return { ...state, todos }
    }

    default:
      return state
  }
}

/**
 * Wire/state validator. The projection registry calls `.parse` on state and
 * wire payloads (checkpoints, restore, publish); hand-rolled structural
 * checks keep the bundle free of a zod dependency.
 */
function parseSiteState(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('pixelSite: state must be an object')
  }
  const foreman = value.foreman
  if (foreman === null || typeof foreman !== 'object' || !STATE_SET.has(foreman.state)) {
    throw new Error('pixelSite: invalid foreman state')
  }
  if (!Array.isArray(value.workers)) throw new Error('pixelSite: workers must be an array')
  for (const worker of value.workers) {
    if (worker === null || typeof worker !== 'object'
      || typeof worker.id !== 'string' || typeof worker.name !== 'string'
      || !STATE_SET.has(worker.state)) {
      throw new Error('pixelSite: invalid worker entry')
    }
  }
  if (!Array.isArray(value.todos)) throw new Error('pixelSite: todos must be an array')
  return value
}

const pixelSiteDefinition = {
  key: 'pixelSite',
  stateSchema: { parse: parseSiteState },
  init: () => ({
    foreman: { state: 'rest', detail: null },
    workers: [],
    activeDispatch: null,
    pendingAsk: null,
    todos: [],
  }),
  apply: applySiteEvent,
  wire: {
    viewSchema: { parse: parseSiteState },
    view: state => state,
  },
  stateVersion: STATE_VERSION,
}

/** Required host services for the projection registry. */
export const inject = ['sessionProjections']

/**
 * Host plugin body: register the site projection on this plugin's context;
 * the registry installs its own effect, so unloading releases the unit.
 * @param ctx - host plugin context.
 */
export async function apply(ctx) {
  await ctx.sessionProjections.register(pixelSiteDefinition)
}
