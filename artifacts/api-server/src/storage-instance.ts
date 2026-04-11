import { DatabaseStorage, seedIfEmpty } from "./database-storage";

export const storage = new DatabaseStorage();

seedIfEmpty().catch(err => console.error("[db] Seed error:", err));
