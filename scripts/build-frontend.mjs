import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pluginDir = path.resolve(__dirname, '..')
const distWordPressDir = path.join(pluginDir, 'dist-wordpress')

const sources = [
  {
    from: path.join(pluginDir, 'src', 'editor', 'main.js'),
    to: path.join(pluginDir, 'assets', 'js', 'editor-app.js'),
    banner: '// Built from src/editor/main.js. Run `npm run build` after editing source files.\n',
  },
  {
    from: path.join(pluginDir, 'src', 'editor', 'styles.css'),
    to: path.join(pluginDir, 'assets', 'css', 'editor-app.css'),
    banner: '/* Built from src/editor/styles.css. Run `npm run build` after editing source files. */\n',
  },
]

for (const item of sources) {
  await mkdir(path.dirname(item.to), { recursive: true })
  const content = await readFile(item.from, 'utf8')
  await writeFile(item.to, `${item.banner}${content}`, 'utf8')
}

const wordpressBundleFiles = [
  {
    from: path.join(distWordPressDir, 'vue.global.js'),
    to: path.join(pluginDir, 'assets', 'js', 'vue.global.js'),
  },
  {
    from: path.join(distWordPressDir, 'mockup100-pod-customizer.umd.js'),
    to: path.join(pluginDir, 'assets', 'js', 'mockup100-editor.umd.js'),
  },
  {
    from: path.join(distWordPressDir, 'mockup100-pod-customizer.iife.js'),
    to: path.join(pluginDir, 'assets', 'js', 'mockup100-editor.iife.js'),
  },
  {
    from: path.join(distWordPressDir, 'mockup100-pod-customizer.css'),
    to: path.join(pluginDir, 'assets', 'css', 'mockup100-editor.css'),
  },
]

try {
  await run('npm', ['run', 'build:wordpress'], pluginDir)
  await cp(
    path.join(pluginDir, 'node_modules', 'vue', 'dist', 'vue.global.prod.js'),
    path.join(distWordPressDir, 'vue.global.js'),
  )
  for (const item of wordpressBundleFiles) {
    await mkdir(path.dirname(item.to), { recursive: true })
    await cp(item.from, item.to)
  }
} catch (error) {
  console.warn('[mockup100-preview-plugin] WordPress local bundle sync skipped:', error instanceof Error ? error.message : String(error))
}

await mkdir(path.join(pluginDir, 'dist'), { recursive: true })

console.log('Built frontend assets:')
for (const item of sources) {
  console.log(`- ${path.relative(pluginDir, item.to)}`)
}
for (const item of wordpressBundleFiles) {
  try {
    await readFile(item.to)
    console.log(`- ${path.relative(pluginDir, item.to)}`)
  } catch {}
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`))
    })
    child.on('error', reject)
  })
}
