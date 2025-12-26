import dotenv from "dotenv";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// 1. Load Environment Variables FIRST
// Next.js usually stores secrets in .env.local
dotenv.config({ path: ".env.local" });

console.log("Environment variables loaded.");

// 2. Dynamically Import Firebase
// We use 'await import' so this happens AFTER dotenv runs
const { db } = await import("../lib/firebase.js");
const { collection, getDocs, doc, writeBatch, query, where } = await import(
  "firebase/firestore"
);

// --- Helper: Generate Blur Placeholder ---
async function generateBlurDataURL(imageUrl) {
  try {
    if (!imageUrl) return null;

    const urlObj = new URL(imageUrl);
    const path = urlObj.pathname;

    // Cloudflare URL logic
    const blurURL = `https://files.volvox.pics/cdn-cgi/image/width=70,quality=70,blur=3,format=jpeg${path}`;

    const res = await fetch(blurURL);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    console.error(`Failed blur for ${imageUrl}:`, err.message);
    return null;
  }
}

async function main() {
  console.log("🔥 Starting Client SDK Update Script...");

  // OPTIONAL: Auto-login as Admin (Uncomment if you get permission errors)
  // const auth = getAuth();
  // await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  // console.log("Logged in.");

  console.log("🔐 Logging in...");
  const auth = getAuth();

  // REPLACE THESE with your actual admin email/password
  // OR add them to your .env.local file as ADMIN_EMAIL and ADMIN_PASSWORD
  const email = process.env.ADMIN_EMAIL || "adam74aldridge@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "volvox";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log(`✅ Logged in as ${email}`);
  } catch (error) {
    console.error("❌ Login failed:", error.message);
    console.error(
      "If you don't have an email/password user, create one in Firebase Console -> Authentication."
    );
    process.exit(1);
  }

  // 1. Fetch ALL Pages and Posts
  console.log("Fetching documents...");
  const postsSnap = await getDocs(collection(db, "posts"));
  const pagesSnap = await getDocs(collection(db, "pages"));

  console.log(`Loaded ${postsSnap.size} posts and ${pagesSnap.size} pages.`);

  // 2. Prepare Batch
  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      console.log(`💾 Committed batch of ${opCount} updates.`);
      batch = writeBatch(db); // Reset batch
      opCount = 0;
    }
  };

  // --- PART 1: Update Post Counts on Pages ---
  console.log("-----------------------------------");
  console.log("📊 Recalculating Page Counts...");

  const pageCounts = {};
  pagesSnap.forEach((p) => {
    pageCounts[p.id] = 0;
  });

  postsSnap.forEach((postDoc) => {
    const post = postDoc.data();
    if (post.page_id && pageCounts.hasOwnProperty(post.page_id)) {
      pageCounts[post.page_id]++;
    }
  });

  for (const pageDoc of pagesSnap.docs) {
    const realCount = pageCounts[pageDoc.id];
    const currentCount = pageDoc.data().postCount;

    if (realCount !== currentCount) {
      const ref = doc(db, "pages", pageDoc.id);
      batch.update(ref, { postCount: realCount });
      opCount++;
      console.log(`Page ${pageDoc.id}: ${currentCount || 0} -> ${realCount}`);
      if (opCount >= 490) await commitBatch();
    }
  }

  // // --- PART 2: Generate Blur for Posts ---
  // console.log("-----------------------------------");
  // console.log("🖼️  Checking Blur Placeholders...");

  // for (const postDoc of postsSnap.docs) {
  //   const post = postDoc.data();

  //   // Check: Has thumbnail, but NO blurDataURL
  //   if (post.thumbnail) {
  //     console.log(`Generating blur for post ${postDoc.id}...`);
  //     const blurData = await generateBlurDataURL(post.thumbnail);

  //     if (blurData) {
  //       const ref = doc(db, "posts", postDoc.id);

  //       // This overwrites the existing value
  //       batch.update(ref, { blurDataURL: blurData });

  //       opCount++;
  //       console.log(`  > Success`);

  //       // Committing frequently to save progress
  //       if (opCount >= 490) await commitBatch();
  //     }
  //   }
  // }

  await commitBatch();
  console.log("✅ Done!");
}

main().catch((e) => console.error(e));
