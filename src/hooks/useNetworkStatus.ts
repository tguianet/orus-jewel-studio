import { useEffect, useState } from "react";
import { isBrowserOnline } from "@/lib/networkStatus";

export function useNetworkStatus() {
  const [online, setOnline] = useState(() => isBrowserOnline());

  useEffect(() => {
    const sync = () => setOnline(isBrowserOnline());
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return { online, offline: !online };
}
