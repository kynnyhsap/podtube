import { eq } from "drizzle-orm";
import path from "path";
import sharp from "sharp";
import { db } from "@/db";
import { Videos } from "@/db/schema";

const IMAGE_SIZE = 1300;

export async function GET(
  request: Request,
  { params }: { params: { filename: string } },
) {
  const { filename } = params;

  const { name: id, ext } = path.parse(filename);

  if (!id || (ext && ext !== ".png")) {
    return new Response(
      `Invalid image filename "${filename}". Expected "{videoId}.png"`,
      { status: 400 },
    );
  }

  const [video] = await db.select().from(Videos).where(eq(Videos.id, id));

  const imageResponse = await fetch(video.thumbnail);

  const image = await imageResponse.arrayBuffer();

  const resized = await sharp(image)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: "contain" })
    .png()
    .toBuffer();

  return new Response(resized, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
    },
  });
}
