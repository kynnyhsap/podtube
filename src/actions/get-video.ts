import { db } from "@/db";
import { Videos } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getVideo(id: string) {
  const [video] = await db.select().from(Videos).where(eq(Videos.id, id));

  if (!video) {
    throw new Error(`Video with ID ${id} not found.`);
  }

  return video;
}
