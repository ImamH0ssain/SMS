import "server-only";
import { access, mkdir, open, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { env } from "@/lib/env";

export interface StorageAdapter {
  put(file: File): Promise<{ key: string; sizeBytes: number }>;
  getStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}

function root() {
  return resolve(/* turbopackIgnore: true */ process.cwd(), env.UPLOAD_DIR);
}

function safePath(key: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(key)) throw new Error("Unsafe storage key");
  return join(/* turbopackIgnore: true */ root(), key);
}

export const localDiskStorage: StorageAdapter = {
  async put(file) {
    await mkdir(root(), { recursive: true });
    const key = randomUUID();
    const handle = await open(safePath(key), "wx");
    try {
      await handle.writeFile(Buffer.from(await file.arrayBuffer()));
    } finally {
      await handle.close();
    }
    return { key, sizeBytes: file.size };
  },
  async getStream(key) {
    await access(safePath(key));
    return createReadStream(safePath(key));
  },
  async delete(key) {
    await rm(safePath(key), { force: true });
  },
};
