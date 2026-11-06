/** Outcome of trying to save one record. */
export type SaveResult =
  /** Stored on the server for the first time. */
  | { status: "saved" }
  /** The server already had this id: an earlier attempt succeeded. Safe, not an error. */
  | { status: "duplicate" }
  /** No signal: kept safely on this device and will upload by itself. */
  | { status: "queued" }
  | { status: "failed"; message: string; retryable: boolean };

interface ErrorLike {
  code?: string | null;
  message?: string;
  status?: number;
}

const NETWORK =
  /failed to fetch|fetch failed|networkerror|network request failed|load failed|timed out|timeout|offline/i;

/**
 * Decides whether a failed save is worth retrying. Retryable failures (no
 * connection, server busy, expired session) keep the record queued. Rejected
 * ones (permission, validation, missing flock) will never succeed, so they are
 * shown to the person and kept for review rather than retried forever.
 * A record is never silently dropped either way.
 */
export function classifySaveError(error: ErrorLike): SaveResult {
  const message = error.message ?? "";
  const code = error.code ?? "";

  if (NETWORK.test(message) || (!code && !error.status)) {
    return {
      status: "failed",
      retryable: true,
      message: "No connection to the server. Your figures are still here. Try again when you have a signal.",
    };
  }
  if (code === "42501") {
    return {
      status: "failed",
      retryable: false,
      message:
        process.env.NEXT_PUBLIC_DEMO_MODE === "true"
          ? "This demo's owner view is read-only. Switch to the farmhand view to try saving a record."
          : "You do not have permission to save this record.",
    };
  }
  if (code === "23503") {
    return {
      status: "failed",
      retryable: false,
      message: "This flock no longer exists, so the record cannot be saved.",
    };
  }
  if (code.startsWith("23") || code.startsWith("22")) {
    return {
      status: "failed",
      retryable: false,
      message: "The server rejected this record as invalid. Check the figures.",
    };
  }
  if (code === "PGRST301" || code === "PGRST303" || error.status === 401) {
    return {
      status: "failed",
      retryable: true,
      message: "Your session has expired. Sign in again, then the record will upload.",
    };
  }
  return {
    status: "failed",
    retryable: true,
    message: "The server could not save this just now. It will be retried.",
  };
}
