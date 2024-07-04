import { GetObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME, r2client } from "./r2";

export async function streamAudioFromR2(key: string, range?: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Range: range,
  });

  return await r2client.send(command);
}
