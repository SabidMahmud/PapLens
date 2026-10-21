interface RequestAbortContext {
  signal: AbortSignal;
  timedOut: () => boolean;
  cleanup: () => void;
}

export function createRequestAbortContext(
  timeoutMs: number,
  callerSignal?: AbortSignal
): RequestAbortContext {
  const controller = new AbortController();
  let didTimeOut = false;

  const abortFromCaller = () => controller.abort();
  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timeoutId = window.setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      callerSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
}
