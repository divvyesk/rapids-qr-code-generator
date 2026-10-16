import { handleUpload } from "@vercel/blob/client";

// Issues short-lived tokens so the browser can upload an image straight to Vercel Blob
// (the file itself never passes through this function). Images are stored untouched.

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // keep in sync with MAX_IMAGE_BYTES in page.js
// No SVG: it can carry scripts, and these files are publicly served
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function POST(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("images/")) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
