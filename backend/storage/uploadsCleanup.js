/*  Storage helper: tidy uploads directory by keeping only N most recent files. 
    Exports:- cleanupUploadsKeepN(dir, keep=3)
    Usage: call after each upload or periodically.
*/

import fs from "fs/promises";
import path from "path";

export async function cleanupUploadsKeepN(dir, keep = 3) {
  try {
    const files = await fs.readdir(dir);
    if (!files || files.length <= keep) return;
    const fileStats = await Promise.all(files.map(async (fn) => {
      const full = path.join(dir, fn);
      try {
        const st = await fs.stat(full);
        return { file: full, mtimeMs: st.mtimeMs, size: st.size };
      } catch (e) {
        return null;
      }
    }));

    const valid = fileStats.filter(Boolean);
    valid.sort((a, b) => b.mtimeMs - a.mtimeMs); // newest first

    const toDelete = valid.slice(keep);
    for (const d of toDelete) {
      try {
        await fs.unlink(d.file);
        console.log(`🧹 Deleted old upload: ${d.file}`);
      } catch (e) {
        console.warn("Failed to delete old upload:", d.file, e.message);
      }
    }
  } catch (e) {
    console.warn("cleanupUploadsKeepN failed:", e);
  }
}
