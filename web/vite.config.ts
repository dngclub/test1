// === ez2ai child vite config v5 (88th iteration, 2026-05-20) ===
// 자식 SPA 가 본체 도메인의 path prefix (`/_child/{code}/`) 아래에서 서빙되는 시나리오 지원.
// 88 차 — RUN_MODE 분기 추가 (embedded/standalone). standalone 모드는 본체 8000 호출 없이
// 모든 /api/* 를 자식 backend 로 forward.
// ChildTemplatePatcher 는 marker `ez2ai child vite config v5` 로 patch 멱등.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 환경변수 (env_manager 가 b.bat/b.sh 에서 export):
//   FRONTEND_PORT       : vite dev 포트 (default 3001)
//   BACKEND_PORT        : 자식 backend 포트 (default 13002)
//   EZ2AI_BASE_URL      : 본체 ez2AI backend URL (default http://localhost:8000)
//   VITE_BASE_PATH      : 자식 SPA base path (default '/'). 본체 단일 진입 시
//                         '/_child/{project_code}/' 형식. 자산 URL · React Router
//                         basename · vite proxy 매칭 prefix 모두 본 값에 종속.
//   VITE_ALLOWED_HOSTS  : Vite `server.allowedHosts` (콤마구분, default 'all').
//                         외부 도메인으로 본체 nginx 가 자식 dev 서버를 프록시할 때
//                         외부 hostname 을 허용해야 vite 가 거부하지 않음.
//   CHILD_API_PREFIXES  : 자식 backend 로 forward 할 prefix 콤마구분 override
//                         (미설정 시 ../server/routers/*.py 디렉토리 자동 스캔)
//
// 라우팅 정책:
//   - 자식 비즈니스 API (`{base}api/customers` 등) → 자식 backend
//   - 본체 공통 API (`{base}api/auth`, `{base}api/license` 등) → 본체 ez2AI backend
//
// 자동 디스커버리 컨벤션:
//   `server/routers/{prefix}.py` 파일명이 곧 `{base}api/{prefix}` 와 일치한다고 가정.
//   파일명과 router prefix 가 다른 경우 CHILD_API_PREFIXES 환경변수로 override.

function discoverChildPrefixes(): string[] {
  const override = process.env.CHILD_API_PREFIXES
  if (override) {
    return override.split(',').map((s) => s.trim()).filter(Boolean)
  }
  const routersDir = path.resolve(__dirname, '../server/routers')
  if (!fs.existsSync(routersDir)) return []
  return fs
    .readdirSync(routersDir)
    .filter((f) => f.endsWith('.py'))
    .filter((f) => f !== '__init__.py' && !f.startsWith('_'))
    .map((f) => f.replace(/\.py$/, ''))
}

function normalizeBasePath(raw: string | undefined): string {
  // 항상 '/' 로 시작하고 '/' 로 끝나도록 정규화 (vite base 컨벤션).
  if (!raw || raw === '/' || raw === '') return '/'
  let b = raw.startsWith('/') ? raw : '/' + raw
  if (!b.endsWith('/')) b += '/'
  return b
}

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH)
// 88 차 — RUN_MODE 분기. standalone 은 본체 8000 호출 없이 자식 backend 단독.
const runMode = (process.env.VITE_RUN_MODE || 'embedded').toLowerCase()
const isStandalone = runMode === 'standalone'
const defaultBackendPort = isStandalone ? '13502' : '13002'
const backendPort = process.env.BACKEND_PORT || defaultBackendPort
const childBackend = `http://localhost:${backendPort}`
const ez2aiBase = process.env.EZ2AI_BASE_URL || 'http://localhost:8000'
const childPrefixes = discoverChildPrefixes()

// proxy key 는 base path 와 합쳐서 생성. base 가 '/' 이면 기존 동작과 동일.
// rewrite 는 base prefix 를 strip 하여 upstream(자식 backend / 본체 backend) 에는
// `/api/...` 단순 path 로 forward.
type ProxyEntry = {
  target: string
  changeOrigin: boolean
  ws?: boolean
  rewrite?: (p: string) => string
}
const proxy: Record<string, ProxyEntry> = {}
const stripBase = (p: string) =>
  basePath === '/' ? p : p.replace(new RegExp('^' + basePath.replace(/\//g, '\\/')), '/')
if (isStandalone) {
  // standalone: 모든 /api/* → 자식 backend (본체 8000 호출 없음).
  proxy[`${basePath}api`] = {
    target: childBackend,
    changeOrigin: true,
    rewrite: stripBase,
  }
} else {
  // embedded: 자식 prefix → 자식 backend, 그 외 /api/* → 본체 8000.
  for (const prefix of childPrefixes) {
    proxy[`${basePath}api/${prefix}`] = {
      target: childBackend,
      changeOrigin: true,
      rewrite: stripBase,
    }
  }
  proxy[`${basePath}api`] = {
    target: ez2aiBase,
    changeOrigin: true,
    rewrite: stripBase,
  }
}

const allowedHostsRaw = process.env.VITE_ALLOWED_HOSTS
const allowedHosts: true | string[] =
  !allowedHostsRaw || allowedHostsRaw === 'all'
    ? true
    : allowedHostsRaw.split(',').map((s) => s.trim()).filter(Boolean)

if (isStandalone) {
  console.log(
    `[vite] base=${basePath} run_mode=standalone → all ${basePath}api → ${childBackend}`,
  )
} else {
  console.log(
    `[vite] base=${basePath} run_mode=embedded child API prefixes (auto-discovered): ${
      childPrefixes.length ? childPrefixes.map((p) => `${basePath}api/${p}`).join(', ') : '(none)'
    } → ${childBackend}; fallback ${basePath}api → ${ez2aiBase}`,
  )
}

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.FRONTEND_PORT) || 3001,
    proxy,
    allowedHosts,
    // HMR — base path 안에서 WebSocket 동작. Vite 5.x 의 hmr.path 는
    // client 측에서 base 를 자동 prefix 하므로 여기서는 base 를 빼고 path 만 명시.
    // 본체 FastAPI 가 자식 dev 서버를 리버스 프록시할 때 nginx 의 Upgrade 헤더가
    // 통과되어야 정상 동작.
    hmr: {
      path: '/__vite_hmr',
    },
  },
})
