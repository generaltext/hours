import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Dev-only: inject window.gt so the app runs standalone against a local
// in-browser workspace (IndexedDB + cross-tab sync over BroadcastChannel).
// In production General Text injects the runtime itself, so this never ships.
function gtRuntime(): Plugin {
  return {
    name: 'gt-runtime',
    apply: 'serve',
    transformIndexHtml: (html) =>
      html.replace(
        '</head>',
        '<script src="https://www.generaltext.org/__gt/runtime.js"></script></head>',
      ),
  }
}

export default defineConfig({
  build: {
    // Ship readable code. The published bytes are what a person forking this app,
    // or an agent asked to change it, has to work from — a minified bundle can be
    // run but not read, fixed, or continued.
    minify: false,
    // No sourcemap: a separate .js.map is never published (the install crawler only
    // fetches assets/* referenced from index.html), and inlining the sources would
    // multiply the bundle that lands in every installing workspace.
    sourcemap: false,
  },
  base: './',
  plugins: [react(), tailwindcss(), gtRuntime()],
})
