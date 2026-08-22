import { ToolTimeoutError } from "../core/errors.js";

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number | undefined,
  toolName: string,
): Promise<T> {
  if (!timeoutMs) return fn();

  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ToolTimeoutError(toolName, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}
