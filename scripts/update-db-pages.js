import dotenv from "dotenv";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Load env vars FIRST
dotenv.config({ path: ".env.local" });

// Dynamic imports after env
const { db } = await import("../lib/firebase.js");
const { collection, getDocs, doc, writeBatch } = await import(
  "firebase/firestore"
);

/* ---------------------------------------------
 * Helper: Generate Blur Placeholder (Cloudflare)
 * ------------------------------------------- */
async function generateBlurDataURL(imageUrl) {
  try {
    if (!imageUrl) return null;

    const urlObj = new URL(imageUrl);
    const path = urlObj.pathname;

    const blurURL =
      `https://files.volvox.pics/cdn-cgi/image/` +
      `width=70,quality=70,blur=3,format=jpeg${path}`;

    const res = await fetch(blurURL);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    console.error(`Blur failed for ${imageUrl}:`, err.message);
    return null;
  }
}

/* ---------------------------------------------
 * Main
 * ------------------------------------------- */
async function main() {
  console.log("🔥 Starting User/Page Maintenance Script...");

  /* ---------- Auth ---------- */
  const auth = getAuth();
  const email = process.env.ADMIN_EMAIL || "adam74aldridge@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "volvox";
  if (!email || !password) {
    throw new Error("Missing ADMIN_EMAIL or ADMIN_PASSWORD");
  }

  await signInWithEmailAndPassword(auth, email, password);
  console.log(`✅ Logged in as ${email}`);

  /* ---------- Load data ---------- */
  console.log("📥 Fetching users and pages...");
  const usersSnap = await getDocs(collection(db, "users"));
  const pagesSnap = await getDocs(collection(db, "pages"));

  console.log(`Loaded ${usersSnap.size} users and ${pagesSnap.size} pages`);

  /* ---------- Batch handling ---------- */
  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      console.log(`💾 Committed ${opCount} updates`);
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  /* ---------------------------------------------
   * PART 1: Recalculate user.pageCount
   * ------------------------------------------- */
  console.log("-----------------------------------");
  console.log("📊 Recalculating user page counts...");

  const userPageCounts = {};

  usersSnap.forEach((u) => {
    userPageCounts[u.id] = 0;
  });

  pagesSnap.forEach((pageDoc) => {
    const page = pageDoc.data();
    if (page.userId && userPageCounts.hasOwnProperty(page.userId)) {
      userPageCounts[page.userId]++;
    }
  });

  for (const userDoc of usersSnap.docs) {
    const realCount = userPageCounts[userDoc.id];
    const currentCount = userDoc.data().pageCount || 0;

    if (realCount !== currentCount) {
      batch.update(doc(db, "users", userDoc.id), {
        pageCount: realCount,
      });
      opCount++;
      console.log(`User ${userDoc.id}: ${currentCount} → ${realCount}`);
      if (opCount >= 490) await commitBatch();
    }
  }

  /* ---------------------------------------------
   * PART 2: Backfill page.blurDataURL
   * ------------------------------------------- */
  console.log("-----------------------------------");
  console.log("🖼️  Checking page blur placeholders...");

  for (const pageDoc of pagesSnap.docs) {
    const page = pageDoc.data();

    // Backfill only (do not overwrite)
    if (page.thumbnail && !page.blurDataURL) {
      console.log(`Generating blur for page ${pageDoc.id}...`);
      const blurDataURL = await generateBlurDataURL(page.thumbnail);

      if (blurDataURL) {
        batch.update(doc(db, "pages", pageDoc.id), {
          blurDataURL,
        });
        opCount++;
        console.log("  > Success");

        if (opCount >= 490) await commitBatch();
      }
    }
  }

  await commitBatch();
  console.log("✅ Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
