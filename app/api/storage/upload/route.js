import { r2Client } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3"; // <--- You were likely missing this
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"; // <--- And this
import { NextResponse } from "next/server"; // <--- And this

// In app/api/storage/upload/route.js
export async function POST(request) {
  console.log("--- ENV VAR DEBUG CHECK ---");
  console.log("R2 DOMAIN IN ENV:", process.env.NEXT_PUBLIC_R2_DOMAIN);
  console.log("--- END DEBUG CHECK ---");
  try {
    // 1. Destructure 'folder' from the incoming request
    const { filename, contentType, folder } = await request.json();

    // 2. Clean the filename
    const cleanFileName = `${Date.now()}-${filename.replace(/\s+/g, "-")}`;

    // 3. Construct the full Key (Path + Filename)
    // If a folder (path) was provided, use it. Otherwise just use filename.
    const fileKey = folder ? `${folder}/${cleanFileName}` : cleanFileName;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey, // <--- Use the full path here
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    return NextResponse.json({
      signedUrl,
      fileKey,
      publicUrl: `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${fileKey}`,
    });
  } catch (error) {
    console.error("R2 Error:", error);
    return NextResponse.json(
      { error: "Error creating upload URL" },
      { status: 500 }
    );
  }
}
