import { NextResponse } from "next/server";
import { Buffer } from "buffer";

export async function POST(req) {
  console.log("🔥 generate-blur API HIT");
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const url = new URL(imageUrl);
    const path = url.pathname;

    const blurURL = `https://files.volvox.pics/cdn-cgi/image/width=70,quality=70,blur=3,format=jpeg${path}`;

    const res = await fetch(blurURL);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch blur image" },
        { status: 500 }
      );
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return NextResponse.json({
      blurDataURL: `data:image/jpeg;base64,${base64}`,
    });
  } catch (err) {
    console.error("Blur generation failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
