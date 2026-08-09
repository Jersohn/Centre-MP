import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MemberRecord } from "./memberFormUtils";
import type { CollecteRecord } from "./CollectesModule";
import { hasRemoteMembers, listMembersRemote } from "../services/memberService";
import { hasRemoteCollectes, listCollectesRemote } from "../services/collecteService";
import { MEMBERS_SEED } from "./membersData";

type OpsDataContextValue = {
  members: MemberRecord[];
  collectes: CollecteRecord[];
  loading: boolean;
  error: string | null;
  setMembers: React.Dispatch<React.SetStateAction<MemberRecord[]>>;
  setCollectes: React.Dispatch<React.SetStateAction<CollecteRecord[]>>;
  reloadMembers: () => Promise<void>;
  reloadCollectes: () => Promise<void>;
  reloadAll: () => Promise<void>;
};

const OpsDataContext = createContext<OpsDataContextValue | null>(null);

export function OpsDataProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [collectes, setCollectes] = useState<CollecteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadMembers = useCallback(async () => {
    if (!hasRemoteMembers()) {
      setMembers(MEMBERS_SEED);
      return;
    }
    const { data, error: loadError } = await listMembersRemote();
    if (loadError) {
      setError(loadError.message);
      setMembers([]);
      return;
    }
    setMembers(data);
  }, []);

  const reloadCollectes = useCallback(async () => {
    if (!hasRemoteCollectes()) {
      setCollectes([]);
      return;
    }
    const { data, error: loadError } = await listCollectesRemote();
    if (loadError) {
      setError(loadError.message);
      setCollectes([]);
      return;
    }
    setCollectes(data);
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([reloadMembers(), reloadCollectes()]);
    setLoading(false);
  }, [reloadMembers, reloadCollectes]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const value = useMemo(
    () => ({
      members,
      collectes,
      loading,
      error,
      setMembers,
      setCollectes,
      reloadMembers,
      reloadCollectes,
      reloadAll,
    }),
    [members, collectes, loading, error, reloadMembers, reloadCollectes, reloadAll],
  );

  return <OpsDataContext.Provider value={value}>{children}</OpsDataContext.Provider>;
}

export function useOpsData() {
  const ctx = useContext(OpsDataContext);
  if (!ctx) {
    throw new Error("useOpsData doit être utilisé dans OpsDataProvider.");
  }
  return ctx;
}
