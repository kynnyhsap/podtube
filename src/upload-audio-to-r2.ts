import { PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME, r2client } from "./r2";

export async function uploadAudioToR2(id: string, content: Buffer) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: id,
    Body: content,
    ContentType: "audio/mpeg",
  });

  return await r2client.send(command);
}
