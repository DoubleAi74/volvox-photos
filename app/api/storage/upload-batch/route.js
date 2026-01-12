import { r2Client } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { files } = await request.json();

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "files array is required" },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (files.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 files per batch" },
        { status: 400 }
      );
    }

    // Generate presigned URLs for all files in parallel
    const urlPromises = files.map(async ({ filename, contentType, folder, clientId }) => {
      const cleanFileName = `${Date.now()}-${filename.replace(/\s+/g, "-")}`;
      const fileKey = folder ? `${folder}/${cleanFileName}` : cleanFileName;

      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        ContentType: contentType,
        CacheControl: "public, max-age=7200",
      });

      const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

      return {
        clientId, // Echo back so client can match URLs to files
        signedUrl,
        fileKey,
        publicUrl: `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${fileKey}`,
      };
    });

    const results = await Promise.all(urlPromises);

    return NextResponse.json({ urls: results });
  } catch (error) {
    console.error("R2 Batch Error:", error);
    return NextResponse.json(
      { error: "Error creating upload URLs" },
      { status: 500 }
    );
  }
}
