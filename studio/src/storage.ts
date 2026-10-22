import { openDB } from "idb";
import { useEffect, useState } from "react";
import { DEFAULT_PREFS, type Preferences, type Entry } from "./types";
let dbPromise: ReturnType<typeof openDB> | undefined;
function db() {
  return (dbPromise ??= openDB("sassycam-studio-v1", 1, {
    upgrade(d) {
      const s = d.createObjectStore("entries", { keyPath: "id" });
      s.createIndex("scope", "scope");
    },
  }));
}
export function guestId() {
  let id;
  try {
    id = localStorage.getItem("sassycam-guest");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sassycam-guest", id);
    }
  } catch {
    id = "private-session";
  }
  return "guest:" + id;
}
export function safePrefs(value: any, local = false): Preferences {
  const p = {
    ...DEFAULT_PREFS,
    provider: "browser",
    ...(value && typeof value === "object" ? value : {}),
    models: { ...DEFAULT_PREFS.models, ...value?.models },
    imageModels: { ...DEFAULT_PREFS.imageModels, ...value?.imageModels },
    endpoints: { ...DEFAULT_PREFS.endpoints, ...value?.endpoints },
  } as Preferences;
  p.mood = Math.max(-100, Math.min(100, Number(p.mood) || 0));
  p.interval = Math.max(15, Math.min(600, Number(p.interval) || 45));
  p.countdown = [0, 3, 5, 10].includes(Number(p.countdown))
    ? Number(p.countdown)
    : 0;
  p.volume = Math.max(0, Math.min(1, Number(p.volume) || 0));
  p.rate = Math.max(0.5, Math.min(2, Number(p.rate) || 1));
  p.auto = false;
  p.cloudConsent = false;
  return p;
}
export function usePreferences(scope: string, local: boolean) {
  const key = "sassycam-settings:" + scope;
  const [record, setRecord] = useState<{ key: string; p: Preferences }>(() => ({
    key: "",
    p: safePrefs(null, local),
  }));
  useEffect(() => {
    let value;
    try {
      value = JSON.parse(localStorage.getItem(key) || "null");
    } catch {}
    setRecord({ key, p: safePrefs(value, local) });
  }, [key, local]);
  const prefs = record.key === key ? record.p : safePrefs(null, local);
  function update(patch: Partial<Preferences>) {
    setRecord((current) => {
      const p = { ...(current.key === key ? current.p : prefs), ...patch };
      try {
        const { auto, cloudConsent, ...saved } = p;
        localStorage.setItem(key, JSON.stringify(saved));
      } catch {}
      return { key, p };
    });
  }
  return [prefs, update] as const;
}
export async function getEntries(scope: string): Promise<Entry[]> {
  const d = await db();
  return (await d.getAllFromIndex("entries", "scope", scope)).sort(
    (a: Entry, b: Entry) => b.date.localeCompare(a.date),
  );
}
export async function putEntry(entry: Entry) {
  const d = await db();
  const count = await d.countFromIndex("entries", "scope", entry.scope);
  if (count >= 250)
    throw new Error(
      "La galerie contient 250 éléments. Exportez-la puis retirez quelques éléments pour continuer.",
    );
  await d.put("entries", entry);
}
export async function removeEntry(id: string, scope: string) {
  const d = await db();
  const entry = await d.get("entries", id);
  if (entry?.scope === scope) await d.delete("entries", id);
}
export async function importEntries(raw: string, scope: string) {
  if (raw.length > 80_000_000)
    throw new Error("Archive trop volumineuse (80 Mo maximum).");
  const input = JSON.parse(raw);
  if (
    input.app !== "SassyCam" ||
    !Array.isArray(input.entries) ||
    input.entries.length > 250
  )
    throw new Error("Archive SassyCam invalide.");
  const entries: Entry[] = input.entries.map((e: any) => {
    if (
      !["capture", "reply", "portrait"].includes(e.kind) ||
      typeof e.text !== "string" ||
      e.text.length > 12000 ||
      (e.image &&
        (typeof e.image !== "string" ||
          e.image.length > 25_000_000 ||
          !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(
            e.image,
          )))
    )
      throw new Error("Cette archive contient un élément invalide.");
    return {
      id: crypto.randomUUID(),
      scope,
      kind: e.kind,
      text: e.text,
      image: e.image,
      mood: Math.max(-100, Math.min(100, Number(e.mood) || 0)),
      date: !Number.isNaN(Date.parse(e.date))
        ? e.date
        : new Date().toISOString(),
      provider: String(e.provider || "import").slice(0, 100),
      generated: e.generated === true,
      model: typeof e.model === "string" ? e.model.slice(0, 200) : undefined,
    };
  });
  const d = await db();
  if (
    (await d.countFromIndex("entries", "scope", scope)) + entries.length >
    250
  )
    throw new Error(
      "La limite de 250 éléments serait dépassée. Exportez votre galerie avant de libérer de la place.",
    );
  const tx = d.transaction("entries", "readwrite");
  for (const e of entries) await tx.store.put(e);
  await tx.done;
  return entries.length;
}
export function download(name: string, data: string, type?: string) {
  const blob = type ? new Blob([data], { type }) : null;
  const href = blob ? URL.createObjectURL(blob) : data;
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  if (blob) setTimeout(() => URL.revokeObjectURL(href), 1000);
}
