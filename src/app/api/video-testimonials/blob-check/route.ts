import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return NextResponse.json({ ok: false, error: "BLOB_READ_WRITE_TOKEN is not set" }, { status: 500 });
  }

  const tokenPrefix = token.startsWith("vercel_blob_rw_") ? "vercel_blob_rw_" : token.slice(0, 20);
  const storeId = token.split("_")[3] ?? "unknown";

  // Try a small test put to verify the blob store is accessible
  try {
    const { put } = await import("@vercel/blob");
    const testBlob = await put("__blob_check_test.txt", "ok", {
      access: "public",
      addRandomSuffix: true,
      token,
    });

    // Clean up
    const { del } = await import("@vercel/blob");
    await del(testBlob.url, { token });

    return NextResponse.json({
      ok: true,
      tokenPrefix,
      storeId,
      testUrl: testBlob.url,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      tokenPrefix,
      storeId,
      error: (err as Error).message,
    }, { status: 500 });
  }
}
