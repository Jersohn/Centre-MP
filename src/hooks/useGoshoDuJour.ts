import { useEffect, useState } from "react";
import {
  fetchGoshoDuJour,
  getCachedGoshoDuJour,
  mapGoshoApiToPassage,
} from "../services/goshoApi";
import type { GoshoPassage } from "../services/contentService";
import { OFFICIAL_DAILY_WISDOM_URL } from "../services/officialGosho";

type State = {
  gosho: GoshoPassage | null;
  dateLabel: string;
  author: string;
  sourceUrl: string;
  loading: boolean;
  error: string | null;
  fromApi: boolean;
};

type Options = {
  /** Si false, n’appelle pas l’API (contenu admin prioritaire). */
  enabled?: boolean;
};

function stateFromItem(item: NonNullable<ReturnType<typeof getCachedGoshoDuJour>>): State {
  return {
    gosho: mapGoshoApiToPassage(item),
    dateLabel: item.date,
    author: item.author,
    sourceUrl: item.sourceUrl || OFFICIAL_DAILY_WISDOM_URL,
    loading: false,
    error: null,
    fromApi: true,
  };
}

export function useGoshoDuJour({ enabled = true }: Options = {}) {
  const cached = enabled ? getCachedGoshoDuJour() : null;
  const [state, setState] = useState<State>(() =>
    cached
      ? stateFromItem(cached)
      : {
          gosho: null,
          dateLabel: "",
          author: "Nichiren Daishonin",
          sourceUrl: OFFICIAL_DAILY_WISDOM_URL,
          loading: enabled,
          error: null,
          fromApi: false,
        },
  );

  useEffect(() => {
    if (!enabled) {
      setState({
        gosho: null,
        dateLabel: "",
        author: "Nichiren Daishonin",
        sourceUrl: OFFICIAL_DAILY_WISDOM_URL,
        loading: false,
        error: null,
        fromApi: false,
      });
      return;
    }

    let active = true;

    async function load() {
      const existing = getCachedGoshoDuJour();
      if (existing) {
        if (!active) return;
        setState(stateFromItem(existing));
        return;
      }

      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const item = await fetchGoshoDuJour();
        if (!active) return;
        if (!item) {
          setState({
            gosho: null,
            dateLabel: "",
            author: "Nichiren Daishonin",
            sourceUrl: OFFICIAL_DAILY_WISDOM_URL,
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
          gosho: null,
          dateLabel: "",
          author: "Nichiren Daishonin",
          sourceUrl: OFFICIAL_DAILY_WISDOM_URL,
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
