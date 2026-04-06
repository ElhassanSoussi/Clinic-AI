"use client";

import { useState, useCallback, useRef } from "react";

interface UseAsyncActionReturn<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  pending: boolean;
  error: string;
  clearError: () => void;
}

/**
 * Manages async action lifecycle: prevents duplicate concurrent calls,
 * tracks pending/error state, and clears stale errors on retry.
 *
 * Usage:
 *   const sendSms = useAsyncAction(async (phone: string, body: string) => {
 *     return await api.frontdesk.sendSms({ customer_phone: phone, body });
 *   });
 *
 *   <button onClick={() => sendSms.run(phone, body)} disabled={sendSms.pending}>
 *     {sendSms.pending ? "Sending..." : "Send"}
 *   </button>
 *   {sendSms.error && <p>{sendSms.error}</p>}
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  onSuccess?: (result: TResult) => void
): UseAsyncActionReturn<TArgs, TResult> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inflightRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (inflightRef.current) return undefined;
      inflightRef.current = true;
      setPending(true);
      setError("");
      try {
        const result = await action(...args);
        setPending(false);
        onSuccessRef.current?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed";
        setPending(false);
        setError(message);
        return undefined;
      } finally {
        inflightRef.current = false;
      }
    },
    [action]
  );

  const clearError = useCallback(() => setError(""), []);

  return { run, pending, error, clearError };
}
