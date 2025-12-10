import crypto from "node:crypto"

function verifySignature(outSum: string, invId: string, signature: string, password2: string) {
  const calc = crypto.createHash("md5").update([outSum, invId, password2].join(":"), "utf8").digest("hex")
  return calc.toLowerCase() === signature.toLowerCase()
}

export async function POST(req: Request) {
  const password2 = process.env.ROBO_PASSWORD2
  if (!password2) {
    return new Response("", { status: 500 })
  }
  const raw = await req.text()
  const sp = new URLSearchParams(raw)
  const outSum = sp.get("OutSum") || ""
  const invId = sp.get("InvId") || ""
  const signature = sp.get("SignatureValue") || ""
  if (!outSum || !invId || !signature) {
    return new Response("", { status: 400 })
  }
  const ok = verifySignature(outSum, invId, signature, password2)
  if (!ok) {
    return new Response("", { status: 400 })
  }
  return new Response(`OK${invId}`, { status: 200, headers: { "Content-Type": "text/plain" } })
}

export async function GET(req: Request) {
  const password2 = process.env.ROBO_PASSWORD2
  if (!password2) {
    return new Response("", { status: 500 })
  }
  const url = new URL(req.url)
  const outSum = url.searchParams.get("OutSum") || ""
  const invId = url.searchParams.get("InvId") || ""
  const signature = url.searchParams.get("SignatureValue") || ""
  if (!outSum || !invId || !signature) {
    return new Response("", { status: 400 })
  }
  const ok = verifySignature(outSum, invId, signature, password2)
  if (!ok) {
    return new Response("", { status: 400 })
  }
  return new Response(`OK${invId}`, { status: 200, headers: { "Content-Type": "text/plain" } })
}

