import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pluginDir = path.resolve(__dirname, '..')
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4174)

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

function resolveRequestPath(url) {
  const requestUrl = new URL(url, `http://${host}:${port}`)
  let pathname = decodeURIComponent(requestUrl.pathname)
  if (pathname === '/') {
    pathname = '/dev-harness/index.html'
  }

  const resolved = path.resolve(pluginDir, `.${pathname}`)
  if (!resolved.startsWith(pluginDir)) {
    return null
  }

  return resolved
}

const server = http.createServer(async (request, response) => {
  const filePath = resolveRequestPath(request.url || '/')
  if (!filePath) {
    sendJson(response, 403, { message: 'Forbidden' })
    return
  }

  try {
    await access(filePath)
    const fileStat = await stat(filePath)
    const finalPath = fileStat.isDirectory() ? path.join(filePath, 'index.html') : filePath
    const extension = path.extname(finalPath).toLowerCase()
    response.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' })
    createReadStream(finalPath).pipe(response)
  } catch (error) {
    sendJson(response, 404, { message: 'Not found' })
  }
})

server.listen(port, host, () => {
  console.log(`Mockup100 harness running at http://${host}:${port}/`)
})
