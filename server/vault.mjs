import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "./contracts.mjs";
export async function atomicJSON(file, value) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + "." + randomUUID() + ".tmp";
  await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temp, file);
}
export class Vault {
  constructor(directory, encryption) {
    this.file = path.join(directory, "credentials.v1.json");
    this.encryption = encryption;
    this.records = {};
    this.writeQueue = Promise.resolve();
  }
  async load() {
    try {
      const data = JSON.parse(await readFile(this.file, "utf8"));
      if (
        data?.version === 1 &&
        data.records &&
        typeof data.records === "object"
      )
        this.records = data.records;
    } catch (e) {
      if (e.code !== "ENOENT")
        throw new AppError(
          "vault_unreadable",
          "Le coffre de clés ne peut pas être lu. Conservez le fichier et vérifiez votre trousseau système.",
          500,
        );
    }
  }
  async get(key) {
    const value = this.records[key];
    if (!value) return null;
    if (!this.encryption?.available())
      throw new AppError(
        "vault_locked",
        "Le trousseau système est verrouillé ou indisponible.",
        503,
      );
    try {
      return JSON.parse(
        await this.encryption.decrypt(Buffer.from(value, "base64")),
      );
    } catch {
      throw new AppError(
        "vault_locked",
        "Impossible de déchiffrer ce secret avec le trousseau actuel.",
        503,
      );
    }
  }
  async set(key, value) {
    if (value !== null && !this.encryption?.available())
      throw new AppError(
        "vault_unavailable",
        "Le trousseau système est indisponible. La clé reste utilisable pour cette session, sans sauvegarde.",
        503,
      );
    const encrypted =
      value === null
        ? null
        : Buffer.from(
            await this.encryption.encrypt(JSON.stringify(value)),
          ).toString("base64");
    const operation = this.writeQueue.then(async () => {
      const next = { ...this.records };
      if (encrypted === null) delete next[key];
      else next[key] = encrypted;
      await atomicJSON(this.file, { version: 1, records: next });
      this.records = next;
    });
    this.writeQueue = operation.catch(() => {});
    await operation;
  }
  keys() {
    return Object.keys(this.records);
  }
}
