import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { wrapTool } from "../src/core/wrapTool.js";
import {
  AllAttemptsFailedError,
  CircuitOpenError,
  ToolValidationError,
} from "../src/core/errors.js";

describe("wrapTool - retries", () => {
  it("retries on failure and eventually succeeds", async () => {
    let calls = 0;
    const flaky = async () => {
      calls += 1;
      if (calls < 3) throw new Error("transient");
      return "ok";
    };

    const safe = wrapTool(flaky, {
      name: "flaky",
      retry: { attempts: 5, baseDelayMs: 1, jitter: false },
      circuitBreaker: false,
    });

    const result = await safe(undefined);
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("throws AllAttemptsFailedError after exhausting attempts with no fallback", async () => {
    const alwaysFails = async () => {
      throw new Error("nope");
    };

    const safe = wrapTool(alwaysFails, {
      name: "alwaysFails",
      retry: { attempts: 2, baseDelayMs: 1, jitter: false },
      circuitBreaker: false,
    });

    await expect(safe(undefined)).rejects.toThrow(AllAttemptsFailedError);
  });

  it("never retries a validation error", async () => {
    const schema = { parse: (input: unknown) => z.object({ x: z.number() }).parse(input) };
    const fn = vi.fn(async (args: { x: number }) => args.x * 2);

    const safe = wrapTool(fn, {
      name: "typed",
      schema,
      retry: { attempts: 5, baseDelayMs: 1 },
      circuitBreaker: false,
    });

    await expect(safe({ x: "not a number" })).rejects.toThrow(ToolValidationError);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("wrapTool - timeout", () => {
  it("times out slow calls and can still retry into a fast one", async () => {
    let calls = 0;
    const sometimesSlow = () =>
      new Promise((resolve) => {
        calls += 1;
        const delay = calls === 1 ? 50 : 0;
        setTimeout(() => resolve("done"), delay);
      });

    const safe = wrapTool(sometimesSlow as () => Promise<string>, {
      name: "sometimesSlow",
      timeoutMs: 10,
      retry: { attempts: 2, baseDelayMs: 1, jitter: false },
      circuitBreaker: false,
    });

    const result = await safe(undefined);
    expect(result).toBe("done");
    expect(calls).toBe(2);
  });
});

describe("wrapTool - circuit breaker", () => {
  it("opens after the failure threshold and short-circuits further calls", async () => {
    const alwaysFails = async () => {
      throw new Error("down");
    };

    const safe = wrapTool(alwaysFails, {
      name: "circuitTest",
      retry: { attempts: 1 }, // no retries, so each call = 1 failure toward the breaker
      circuitBreaker: { failureThreshold: 2, resetTimeoutMs: 100_000 },
    });

    await expect(safe(undefined)).rejects.toThrow(AllAttemptsFailedError);
    await expect(safe(undefined)).rejects.toThrow(AllAttemptsFailedError);
    // Third call should be short-circuited without invoking the tool at all.
    await expect(safe(undefined)).rejects.toThrow(CircuitOpenError);
  });
});

describe("wrapTool - fallback", () => {
  it("returns the fallback value once attempts are exhausted", async () => {
    const alwaysFails = async () => {
      throw new Error("down");
    };

    const safe = wrapTool(alwaysFails, {
      name: "withFallback",
      retry: { attempts: 2, baseDelayMs: 1 },
      circuitBreaker: false,
      fallback: async () => "fallback value",
    });

    const result = await safe(undefined);
    expect(result).toBe("fallback value");
  });
});
