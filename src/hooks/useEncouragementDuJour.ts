import { useEffect, useState } from "react";
import {
  fetchEncouragementDuJour,
  getCachedEncouragementDuJour,
  mapEncouragementToDirective,
} from "../services/encouragementApi";
import type { DirectiveItem } from "../services/contentService";

type State = {
  directive: DirectiveItem | null;
  reference: string;
  sourceUrl: string;
  loading: boolean;
  error: string | null;
  fromApi: boolean;
};

type Options = {
  /** Si false, n’appelle pas l’API (contenu admin prioritaire). */
  enabled?: boolean;
};

function stateFromItem(
  item: NonNullable<ReturnType<typeof getCachedEncouragementDuJour>>,
): State {
  return {
    directive: mapEncouragementToDirective(item),
    reference: item.reference,
    sourceUrl: item.sourceUrl,
    loading: false,
    error: null,
    fromApi: true,
  };
}

export function useEncouragementDuJour({ enabled = true }: Options = {}) {
  const cached = enabled ? getCachedEncouragementDuJour() : null;
  const [state, setState] = useState<State>(() =>
    cached
      ? stateFromItem(cached)
      : {
          directive: null,
          reference: "",
          sourceUrl: "https://www.sokaglobal.org/",
          loading: enabled,
          error: null,
          fromApi: false,
        },
  );

  useEffect(() => {
    if (!enabled) {
      setState({
        directive: null,
        reference: "",
        sourceUrl: "https://www.sokaglobal.org/",
        loading: false,
        error: null,
        fromApi: false,
      });
      return;
    }

    let active = true;

    async function load() {
      const existing = getCachedEncouragementDuJour();
      if (existing) {
        if (!active) return;
        setState(stateFromItem(existing));
        return;
      }

      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const item = await fetchEncouragementDuJour();
        if (!active) return;
        if (!item) {
          setState({
            directive: null,
            reference: "",
            sourceUrl: "https://www.sokaglobal.org/",
            loading: false,
            error: null,
            fromApi: false,
          });
          return;
        }
        setState(stateFromItem(item));
      } catch {
        if (!active) return;
        setState({
          directive: null,
          reference: "",
          sourceUrl: "https://www.sokaglobal.org/",
          loading: false,
          error: null,
          fromApi: false,
        });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [enabled]);

  return state;
}
