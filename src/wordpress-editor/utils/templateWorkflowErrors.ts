import { ApiRequestError, resolveApiErrorMessage } from "../api/client"

export type TemplateWorkflowErrorKind =
  | "duplicate_code"
  | "invalid_structure"
  | "upload_failed"
  | "save_failed"
  | "validation_failed"
  | "unknown"

export type TemplateWorkflowErrorResolution = {
  kind: TemplateWorkflowErrorKind
  code: string
  rawMessage: string
  isTechnical: boolean
}

function normalizeErrorSource(raw: unknown) {
  if (raw instanceof ApiRequestError) {
    return {
      code: String(raw.errors.find((item) => item.code)?.code || raw.responseCode || "").trim(),
      message: resolveApiErrorMessage(raw).trim(),
    }
  }
  if (raw && typeof raw === "object") {
    const source = raw as Record<string, unknown>
    return {
      code: String(source.code || "").trim(),
      message: String(source.message || source.error || "").trim(),
    }
  }
  return {
    code: "",
    message: String((raw as Error)?.message || raw || "").trim(),
  }
}

export function isTechnicalTemplateWorkflowMessage(message: string) {
  const normalized = String(message || "").trim().toLowerCase()
  if (!normalized) return false
  return [
    "sql",
    "syntax error",
    "exception",
    "traceback",
    "java.lang",
    "com.mysql",
    "constraint",
    "fk_",
    "stack trace",
    "xhr",
    "xmlhttprequest",
    "http 5",
    "http 4",
    "request aborted",
    "invalid json response",
    "polling failed",
  ].some((token) => normalized.includes(token))
}

export function resolveTemplateWorkflowError(raw: unknown): TemplateWorkflowErrorResolution {
  const { code, message } = normalizeErrorSource(raw)
  const normalizedCode = code.toLowerCase()
  const normalizedMessage = message.toLowerCase()
  const combined = `${normalizedCode} ${normalizedMessage}`.trim()

  if (
    combined.includes("template code already exists")
    || combined.includes("duplicate")
    || combined.includes("cannot delete or update a parent row")
    || combined.includes("fk_template_submissions_template")
    || combined.includes("template_code_exists")
  ) {
    return {
      kind: "duplicate_code",
      code,
      rawMessage: message,
      isTechnical: isTechnicalTemplateWorkflowMessage(message),
    }
  }

  if (
    combined.includes("invalid_structure")
    || combined.includes("invalid archive")
    || combined.includes("invalid zip")
    || combined.includes("unsupported archive")
    || combined.includes("missing required")
    || combined.includes("package inspection failed")
    || combined.includes("inspection failed")
    || combined.includes("validation failed")
    || combined.includes("zip folders")
    || combined.includes("directory")
    || combined.includes("manifest")
  ) {
    return {
      kind: "invalid_structure",
      code,
      rawMessage: message,
      isTechnical: isTechnicalTemplateWorkflowMessage(message),
    }
  }

  if (
    combined.includes("network error")
    || combined.includes("upload failed")
    || combined.includes("upload timeout")
    || combined.includes("timeout")
    || combined.includes("request aborted")
    || combined.includes("gateway")
  ) {
    return {
      kind: "upload_failed",
      code,
      rawMessage: message,
      isTechnical: isTechnicalTemplateWorkflowMessage(message),
    }
  }

  if (
    combined.includes("save failed")
    || combined.includes("failed to save")
    || combined.includes("update failed")
  ) {
    return {
      kind: "save_failed",
      code,
      rawMessage: message,
      isTechnical: isTechnicalTemplateWorkflowMessage(message),
    }
  }

  if (
    combined.includes("validate template code")
    || combined.includes("validation failed")
    || combined.includes("unable to validate")
  ) {
    return {
      kind: "validation_failed",
      code,
      rawMessage: message,
      isTechnical: isTechnicalTemplateWorkflowMessage(message),
    }
  }

  return {
    kind: "unknown",
    code,
    rawMessage: message,
    isTechnical: isTechnicalTemplateWorkflowMessage(message),
  }
}
