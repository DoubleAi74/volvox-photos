import { r2Client } from "@/lib/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { fileUrl } = await request.json();
    if (!fileUrl) return NextResponse.json({ success: false });

    // Extract Key from URL (removes the domain part)
    const domain = process.env.NEXT_PUBLIC_R2_DOMAIN;
    const fileKey = fileUrl.replace(`${domain}/`, "");

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
    });

    await r2Client.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Error deleting file" }, { status: 500 });
  }
}
