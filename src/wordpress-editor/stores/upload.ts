import { ref } from "vue"
import { defineStore } from "pinia"
import { PLATFORM_API_BASE, gatewayPlatformFetch } from "../api/client"
import type { TemplatePhysicalDimensions, TemplatePhysicalDimensionsCandidate } from "../api/client"
import { useAuthStore } from "./auth"

export type ViewAlias = {
  texture: string
  uv: string
}

export type SuggestedConfig = {
  display_name: string
  base_size_label?: string
  size_options?: string[]
  structure_overrides: {
    bucket_aliases: Record<string, string>
    view_aliases: Record<string, ViewAlias>
    part_aliases: Record<string, string>
  }
  compose_params: Record<string, unknown>
  input_constraints: Record<string, unknown>
  physical_dimensions_cm?: TemplatePhysicalDimensions
}

export type TemplateStructureNode = {
  name: string
  type: "folder" | "file"
  children?: TemplateStructureNode[]
}

type InspectJobStatus = "queued" | "running" | "done" | "failed"

export type InspectPayload = {
  inspect_job_id?: string
  status?: InspectJobStatus
  can_upload?: boolean
  summary: string
  errors: Array<{ code: string; message: string }>
  warnings: Array<{ code: string; message: string }>
  stats: Record<string, unknown>
  cover_candidate: string
  suggested_config: SuggestedConfig
  physical_dimensions_candidates?: Record<string, TemplatePhysicalDimensionsCandidate>
  example_tree?: TemplateStructureNode | null
}

type UploadCreateResponse = {
  job_id: string
  template_id: string
  template_code?: string
}

type UploadStatus = {
  job_id: string
  template_id: string
  template_code?: string
  owner_tenant_id: string
  category_id: string
  status: "queued" | "uploading" | "validating" | "parsing" | "materializing" | "done" | "failed"
  progress: number
  stage: string
  stage_progress?: {
    file_upload: number
    validation: number
    parsing: number
    materialization: number
  }
  error?: string | null
  error_code?: string
  summary?: string
  stats?: Record<string, unknown>
  errors?: Array<{ code: string; message: string }>
  warnings?: Array<{ code: string; message: string }>
  estimated_time_remaining?: number
}

type TemplateCodeCheckResult = {
  template_code: string
  available: boolean
  state?: "available" | "recoverable_deleted" | "conflict_active"
  message: string
  existing_template_id?: string
}

function unwrapApiEnvelope<T>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const source = value as Record<string, unknown>
    if ("data" in source && Object.keys(source).some((key) => ["code", "message", "errors", "timestamp", "traceId", "trace_id"].includes(key))) {
      return source.data as T
    }
  }
  return value as T
}

function extractApiErrorMessage(raw: string, status: number): string {
  if (!raw) return `HTTP ${status}`
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message
    if (Array.isArray(parsed.errors)) {
      const first = parsed.errors.find((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).message === "string") as
        | Record<string, unknown>
        | undefined
      if (first?.message && typeof first.message === "string") return first.message
    }
  } catch {
    // ignore parse error
  }
  return raw
}

export function resolveTemplateUploadUrl(path: string, gatewayBase: string): string {
  const [pathname, search = ""] = path.split("?", 2)
  const query = search ? `?${search}` : ""
  const base = gatewayBase.trim() || "/api/v1"
  const inspectStatusMatch = pathname.match(/^\/api\/v1\/templates\/uploads\/inspect\/([^/]+)$/)
  if (inspectStatusMatch) return `${base}/api/v1/templates/uploads/inspect/${inspectStatusMatch[1]}`.replace("/api/v1/api/v1/", "/api/v1/")
  const uploadStatusMatch = pathname.match(/^\/api\/v1\/templates\/uploads\/([^/]+)$/)
  if (uploadStatusMatch) return `${base}/api/v1/templates/uploads/${uploadStatusMatch[1]}`.replace("/api/v1/api/v1/", "/api/v1/")
  if (pathname === "/api/v1/templates/uploads/check-code") {
    return `${base}/api/v1/templates/uploads/check-code${query}`.replace("/api/v1/api/v1/", "/api/v1/")
  }
  if (pathname === "/api/v1/templates/uploads/inspect") return `${base}/api/v1/templates/uploads/inspect${query}`.replace("/api/v1/api/v1/", "/api/v1/")
  if (pathname === "/api/v1/templates/uploads/chunk/init") return `${base}/api/v1/templates/uploads/chunk/init${query}`.replace("/api/v1/api/v1/", "/api/v1/")
  if (pathname === "/api/v1/templates/uploads/chunk/part") return `${base}/api/v1/templates/uploads/chunk/part${query}`.replace("/api/v1/api/v1/", "/api/v1/")
  if (pathname === "/api/v1/templates/uploads/chunk/inspect") return `${base}/api/v1/templates/uploads/chunk/inspect${query}`.replace("/api/v1/api/v1/", "/api/v1/")
  if (pathname === "/api/v1/templates/uploads") return `${base}/api/v1/templates/uploads${query}`.replace("/api/v1/api/v1/", "/api/v1/")
  return `${gatewayBase}${path}`
}

export const useUploadStore = defineStore("upload", () => {
  const authStore = useAuthStore()
  const inspection = ref<InspectPayload | null>(null)
  const loading = ref(false)
  const error = ref("")
  const uploadStatus = ref<UploadStatus | null>(null)
  const uploadResult = ref<UploadCreateResponse | null>(null)

  function resolveRuntimeUrl(path: string): string {
    return resolveTemplateUploadUrl(path, PLATFORM_API_BASE)
  }

  function xhrForm<T>(
    path: string,
    form: FormData,
    options: {
      headers?: Record<string, string>
      onProgress?: (progress: number | null) => void
    } = {},
  ): Promise<T> {
    const url = resolveRuntimeUrl(path)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", url, true)
      xhr.withCredentials = true
      Object.entries(options.headers || {}).forEach(([key, value]) => {
        if (!value) return
        if (key.toLowerCase() === "content-type") return
        xhr.setRequestHeader(key, value)
      })
      xhr.upload.onprogress = (event) => {
        if (!options.onProgress) return
        if (!event.lengthComputable) {
          options.onProgress(null)
          return
        }
        const ratio = event.total ? event.loaded / event.total : 0
        options.onProgress(Math.max(0, Math.min(1, ratio)))
      }
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(extractApiErrorMessage(xhr.responseText, xhr.status)))
          return
        }
        try {
          resolve(unwrapApiEnvelope<T>(JSON.parse(xhr.responseText)))
        } catch {
          reject(new Error("Invalid JSON response"))
        }
      }
      xhr.onerror = () => reject(new Error("Network error"))
      xhr.onabort = () => reject(new Error("Request aborted"))
      xhr.send(form)
    })
  }

  async function requestUploadJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(resolveRuntimeUrl(path), {
      credentials: "include",
      ...init,
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new Error(extractApiErrorMessage(raw, response.status))
    }
    if (!raw) {
      return {} as T
    }
    try {
      return unwrapApiEnvelope<T>(JSON.parse(raw))
    } catch {
      throw new Error("Invalid JSON response")
    }
  }

  function resetInspection() {
    inspection.value = null
    uploadStatus.value = null
    uploadResult.value = null
    error.value = ""
  }

  function resolveInspectionErrorMessage(payload: InspectPayload) {
    return payload.errors?.find((item) => item?.message)?.message || payload.summary || "Template inspection failed"
  }

  async function pollInspection(inspectJobId: string, maxAttempts = 180) {
    let attempts = 0
    while (attempts < maxAttempts) {
      const payload = await requestUploadJson<InspectPayload>(`/api/v1/templates/uploads/inspect/${inspectJobId}`, {
        headers: authStore.authHeaders,
      })
      inspection.value = payload
      uploadStatus.value = {
        ...(uploadStatus.value || {
          job_id: "",
          template_id: "",
          template_code: "",
          owner_tenant_id: "",
          category_id: "",
          status: "validating" as const,
          progress: 0.95,
          stage: "Inspecting package",
        }),
        status: "validating",
        progress: 0.95,
        stage: payload.status === "failed" ? "Inspection failed" : "Inspecting package",
      }
      if (payload.status === "done") {
        return payload
      }
      if (payload.status === "failed") {
        throw new Error(resolveInspectionErrorMessage(payload))
      }
      attempts += 1
      await new Promise((resolve) => window.setTimeout(resolve, payload.status === "queued" ? 800 : 1200))
    }
    throw new Error(`Inspection timeout after ${maxAttempts} polling attempts`)
  }

  async function inspect(file: File, displayName: string, templateCode: string, currentTemplateId = "") {
    loading.value = true
    error.value = ""
    try {
      // Cloudflare Free 单请求体 100MB 限制,>90MB 走分片上传
      const CHUNK_THRESHOLD = 90 * 1024 * 1024
      if (file.size > CHUNK_THRESHOLD) {
        await inspectChunked(file, displayName, templateCode, currentTemplateId)
        return
      }
      const form = new FormData()
      form.append("display_name", displayName)
      form.append("template_code", templateCode)
      if (currentTemplateId.trim()) {
        form.append("current_template_id", currentTemplateId.trim())
      }
      form.append("zip_file", file)
      uploadStatus.value = {
        job_id: "",
        template_id: currentTemplateId || templateCode,
        template_code: templateCode,
        owner_tenant_id: "",
        category_id: "",
        status: "uploading",
        progress: 0,
        stage: "Uploading file (inspect)",
        stage_progress: { file_upload: 0, validation: 0, parsing: 0, materialization: 0 },
      }
      const initialInspection = await xhrForm<InspectPayload>("/api/v1/templates/uploads/inspect", form, {
        headers: authStore.authHeaders,
        onProgress: (ratio) => {
          const next = ratio == null ? (uploadStatus.value?.stage_progress?.file_upload || 0) : ratio
          uploadStatus.value = {
            ...uploadStatus.value!,
            progress: next * 0.9,
            stage: ratio == null ? "Uploading file (inspect)" : `Uploading file (inspect) · ${Math.round(next * 100)}%`,
            stage_progress: { ...(uploadStatus.value?.stage_progress || {}), file_upload: next } as any,
          }
        },
      })
      if (initialInspection.inspect_job_id && initialInspection.status && initialInspection.status !== "done") {
        inspection.value = initialInspection
        uploadStatus.value = {
          ...uploadStatus.value!,
          status: "validating",
          progress: Math.max(uploadStatus.value?.progress || 0, 0.95),
          stage: "Inspecting package",
        }
        inspection.value = await pollInspection(initialInspection.inspect_job_id)
      } else {
        inspection.value = initialInspection
      }
    } catch (err) {
      error.value = String((err as Error).message || err)
    } finally {
      loading.value = false
    }
  }

  // 分片上传辅助：JSON POST（init 用 application/json，避免 form-data 解析）
  function xhrJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = resolveRuntimeUrl(path)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", url, true)
      xhr.withCredentials = true
      xhr.setRequestHeader("Content-Type", "application/json")
      Object.entries(authStore.authHeaders || {}).forEach(([key, value]) => {
        if (!value) return
        if (key.toLowerCase() === "content-type") return
        xhr.setRequestHeader(key, value as string)
      })
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(extractApiErrorMessage(xhr.responseText, xhr.status)))
          return
        }
        try {
          resolve(unwrapApiEnvelope<T>(JSON.parse(xhr.responseText)))
        } catch {
          reject(new Error("Invalid JSON response"))
        }
      }
      xhr.onerror = () => reject(new Error("Network error"))
      xhr.onabort = () => reject(new Error("Request aborted"))
      xhr.send(JSON.stringify(body))
    })
  }

  // 大文件分片上传：每片 ≤90MB（绕过 CDN 100MB 单请求体限制）
  async function inspectChunked(file: File, displayName: string, templateCode: string, currentTemplateId = "") {
    const CHUNK_SIZE = 90 * 1024 * 1024
    const CONCURRENT_CHUNKS = 4 // 并发上传数
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const chunkProgress = new Array(totalChunks).fill(0)

    uploadStatus.value = {
      job_id: "",
      template_id: currentTemplateId || templateCode,
      template_code: templateCode,
      owner_tenant_id: "",
      category_id: "",
      status: "uploading",
      progress: 0,
      stage: `Initializing upload...`,
      stage_progress: { file_upload: 0, validation: 0, parsing: 0, materialization: 0 },
    }

    // 1. init
    const initRes = await xhrJson<{ session_id: string }>("/api/v1/templates/uploads/chunk/init", {
      total_size: file.size,
      total_chunks: totalChunks,
      filename: file.name,
    })
    const sessionId = initRes.session_id
    if (!sessionId) throw new Error("chunk init failed: missing session_id")

    uploadStatus.value.stage = `Uploading chunks...`

    // 2. part * N (并行上传)
    const uploadChunkWithRetry = async (chunkIndex: number): Promise<void> => {
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const blob = file.slice(start, end)
      const form = new FormData()
      form.append("session_id", sessionId)
      form.append("chunk_index", String(chunkIndex))
      form.append("chunk", blob, `${file.name}.part${chunkIndex}`)

      let lastErr: unknown = null
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await xhrForm<{ session_id: string }>(
            "/api/v1/templates/uploads/chunk/part",
            form,
            {
              headers: authStore.authHeaders,
              onProgress: (ratio) => {
                chunkProgress[chunkIndex] = ratio ?? 0
                const totalProgress = chunkProgress.reduce((sum, p) => sum + p, 0) / totalChunks
                
                uploadStatus.value = {
                  ...uploadStatus.value!,
                  progress: totalProgress * 0.9,
                  stage: `Uploading chunks... ${Math.round(totalProgress * 100)}%`,
                  stage_progress: { ...(uploadStatus.value?.stage_progress || {}), file_upload: totalProgress } as any,
                }
              },
            },
          )
          return // Success
        } catch (err) {
          lastErr = err
        }
      }
      throw new Error(`Chunk ${chunkIndex + 1}/${totalChunks} upload failed after 3 retries: ${(lastErr as Error)?.message || lastErr}`)
    }

    async function runWithConcurrency(poolLimit: number, array: number[], iteratorFn: (item: number) => Promise<void>) {
        const ret: Promise<void>[] = [];
        const executing: Set<Promise<any>> = new Set();
        for (const item of array) {
            const p = Promise.resolve().then(() => iteratorFn(item));
            ret.push(p);

            if (poolLimit <= array.length) {
                const e = p.finally(() => executing.delete(e));
                executing.add(e);
                if (executing.size >= poolLimit) {
                    await Promise.race(executing);
                }
            }
        }
        return Promise.all(ret);
    }
    
    const queue = [...Array(totalChunks).keys()] // [0, 1, 2, ...]
    await runWithConcurrency(CONCURRENT_CHUNKS, queue, uploadChunkWithRetry);


    // 3. inspect（合并 + 触发 Python 校验）
    uploadStatus.value = {
      ...uploadStatus.value!,
      progress: 0.9,
      stage: "Merging and inspecting package",
    }
    const inspectForm = new FormData()
    inspectForm.append("session_id", sessionId)
    inspectForm.append("filename", file.name)
    inspectForm.append("display_name", displayName)
    inspectForm.append("template_code", templateCode)
    if (currentTemplateId.trim()) {
      inspectForm.append("current_template_id", currentTemplateId.trim())
    }
    const initialInspection = await xhrForm<InspectPayload>("/api/v1/templates/uploads/chunk/inspect", inspectForm, {
      headers: authStore.authHeaders,
    })
    if (initialInspection.inspect_job_id && initialInspection.status && initialInspection.status !== "done") {
      inspection.value = initialInspection
      uploadStatus.value = {
        ...uploadStatus.value!,
        status: "validating",
        progress: 0.95,
        stage: "Inspecting package",
      }
      inspection.value = await pollInspection(initialInspection.inspect_job_id)
    } else {
      inspection.value = initialInspection
    }
  }

  async function checkTemplateCode(templateCode: string, currentTemplateId: string = "") {
    error.value = ""
    const query = new URLSearchParams({ template_code: templateCode.trim() })
    if (currentTemplateId.trim()) {
      query.set("current_template_id", currentTemplateId.trim())
    }
    try {
      return await gatewayPlatformFetch<TemplateCodeCheckResult>(`/api/v1/templates/uploads/check-code?${query.toString()}`, {
        headers: authStore.authHeaders,
      })
    } catch (err) {
      error.value = String((err as Error).message || err)
      throw err
    }
  }

  async function poll(jobId: string, maxAttempts = 60, progressBase = 0, progressScale = 1) {
    let attempts = 0
    const startTime = Date.now()
    
    while (attempts < maxAttempts) {
      try {
        const status = await gatewayPlatformFetch<UploadStatus>(`/api/v1/templates/uploads/${jobId}`, {
          headers: authStore.authHeaders,
        })
        const preservedTemplateId = String(uploadStatus.value?.template_id || uploadResult.value?.template_id || "").trim()
        const preservedTemplateCode = String(uploadStatus.value?.template_code || uploadResult.value?.template_code || "").trim()
        uploadStatus.value = {
          ...status,
          template_id: String(status.template_id || preservedTemplateId || "").trim(),
          template_code: String(status.template_code || preservedTemplateCode || "").trim(),
          progress: Math.max(0, Math.min(1, progressBase + (status.progress || 0) * progressScale)),
        }
        
        // Calculate estimated time remaining
        const elapsed = Date.now() - startTime
        const avgProgress = status.progress || 0
        if (avgProgress > 0) {
          const estimatedTotal = elapsed / avgProgress
          uploadStatus.value.estimated_time_remaining = Math.max(0, estimatedTotal - elapsed)
        }
        
        if (uploadStatus.value.status === "done") {
          return
        }
        
        if (uploadStatus.value.status === "failed") {
          throw new Error(uploadStatus.value.error || 'Upload failed')
        }
        
        attempts++
        // Adaptive polling: more frequent at beginning, slower at end
        const delay = (status.progress || 0) < 0.5 ? 500 : 2000
        await new Promise((resolve) => window.setTimeout(resolve, delay))
        
      } catch (err) {
        attempts++
        if (attempts >= maxAttempts) {
          throw new Error(`Upload polling failed after ${maxAttempts} attempts: ${err}`)
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000))
      }
    }
    
    throw new Error(`Upload timeout after ${maxAttempts} polling attempts`)
  }

  async function upload(
    file: File | null,
    displayName: string,
    templateCode: string,
    categoryId: string,
    suggestedConfig: SuggestedConfig,
    inspectJobId = "",
    currentTemplateId = "",
  ) {
    loading.value = true
    error.value = ""
    uploadResult.value = null
    try {
      if (!inspectJobId.trim() && !file) {
        throw new Error("Please choose a template archive and run inspection first.")
      }
      const form = new FormData()
      form.append("display_name", displayName)
      form.append("template_code", templateCode)
      if (currentTemplateId.trim()) {
        form.append("current_template_id", currentTemplateId.trim())
      }
      form.append("category_id", categoryId)
      form.append("template_config", JSON.stringify(suggestedConfig))
      if (inspectJobId.trim()) {
        form.append("inspect_job_id", inspectJobId.trim())
      } else if (file) {
        form.append("zip_file", file)
      }
      let latestFileProgress = 0
      uploadStatus.value = {
        job_id: "",
          template_id: currentTemplateId || templateCode,
        template_code: templateCode,
        owner_tenant_id: "",
        category_id: categoryId,
        status: "uploading",
        progress: 0,
        stage: "Uploading file",
        stage_progress: { file_upload: 0, validation: 0, parsing: 0, materialization: 0 },
      }
      uploadResult.value = await xhrForm<UploadCreateResponse>("/api/v1/templates/uploads", form, {
        headers: authStore.authHeaders,
        onProgress: (ratio) => {
          if (ratio == null) return
          latestFileProgress = ratio
          uploadStatus.value = {
            ...uploadStatus.value!,
            progress: latestFileProgress * 0.25,
            stage: `Uploading file · ${Math.round(latestFileProgress * 100)}%`,
            stage_progress: { ...(uploadStatus.value?.stage_progress || {}), file_upload: latestFileProgress } as any,
          }
        },
      })
      uploadStatus.value = {
        ...uploadStatus.value!,
        job_id: uploadResult.value.job_id,
        template_id: uploadResult.value.template_id,
        template_code: uploadResult.value.template_code || templateCode,
        status: "queued",
        progress: Math.max(uploadStatus.value.progress, 0.25),
        stage: "Queued",
      }
      await poll(uploadResult.value.job_id, 180, 0.25, 0.75)
    } catch (err) {
      error.value = String((err as Error).message || err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 上传完成后,在跳转 editor 之前轮询 ready 端点,直到 runtime 资源 + DB 字段都就绪。
   * timeoutMs 为总超时(默认 30s),intervalMs 为轮询间隔(默认 800ms)。
   * 返回最后一次的 ready 详情;若超时仍未就绪,ready 会保持 false 让调用方决定。
   */
  async function waitForUploadReady(
    templateId: string,
    options: { timeoutMs?: number; intervalMs?: number; onTick?: (info: any) => void } = {},
  ): Promise<any> {
    const id = templateId.trim()
    if (!id) return { ready: false, reason: "missing_template_id" }
    const timeoutMs = options.timeoutMs ?? 30000
    const intervalMs = options.intervalMs ?? 800
    const deadline = Date.now() + timeoutMs
    let last: any = { ready: false }
    while (Date.now() < deadline) {
      try {
        last = await gatewayPlatformFetch<any>(
          `/api/v1/templates/uploads/ready/${encodeURIComponent(id)}`,
          { headers: authStore.authHeaders },
        )
        options.onTick?.(last)
        if (last && last.ready) return last
      } catch (err) {
        last = { ready: false, error: String((err as Error).message || err) }
      }
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs))
    }
    return last
  }

  return { inspection, loading, error, uploadStatus, uploadResult, resetInspection, inspect, upload, checkTemplateCode, waitForUploadReady }
})
