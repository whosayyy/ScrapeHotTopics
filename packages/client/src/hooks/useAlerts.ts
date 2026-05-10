import { useState, useEffect, useCallback } from "react";
import { onBreakingAlert } from "../services/socket";
import type { BreakingAlert } from "../types";

interface UseAlertsReturn {
  alert: BreakingAlert | null;
  dismiss: () => void;
}

export function useAlerts(): UseAlertsReturn {
  const [alert, setAlert] = useState<BreakingAlert | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const cleanup = onBreakingAlert((data) => {
      if (!dismissed.has(data.id)) {
        setAlert(data);
      }
    });
    return cleanup;
  }, [dismissed]);

  const dismiss = useCallback(() => {
    if (alert) {
      setDismissed((prev) => new Set(prev).add(alert.id));
      setAlert(null);
    }
  }, [alert]);

  return { alert, dismiss };
}
