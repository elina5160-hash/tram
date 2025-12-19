import crypto from "node:crypto"

function verifySignature(outSum: string, invId: string, signature: string, password2: string, params?: URLSearchParams) {
  let base = `${outSum}:${invId}:${password2}`
  
  if (params) {
      const shpParams: { key: string, value: string }[] = []
      params.forEach((value, key) => {
          if (key.startsWith('Shp_')) {
              shpParams.push({ key, value })
          }
      })
      
      shpParams.sort((a, b) => a.key.localeCompare(b.key))
      
      shpParams.forEach(p => {
          base += `:${p.key}=${p.value}`
      })
  }

  console.log('Base string:', base)
  const calc = crypto.createHash("md5").update(base, "utf8").digest("hex").toLowerCase()
  console.log('Calculated hash:', calc)
  return calc === String(signature || "").toLowerCase()
}

// Test
const outSum = "3000"
const invId = "123"
const pass2 = "mumsSVW4Bm5o14Xm8IVz"
const params = new URLSearchParams()
params.append("Shp_item", "1")
params.append("Shp_label", "official")
params.append("Other", "IgnoreMe")

// Calculate expected signature manually
// 3000:123:mumsSVW4Bm5o14Xm8IVz:Shp_item=1:Shp_label=official
const expectedBase = "3000:123:mumsSVW4Bm5o14Xm8IVz:Shp_item=1:Shp_label=official"
const expectedSig = crypto.createHash("md5").update(expectedBase, "utf8").digest("hex").toLowerCase()

console.log('Expected sig:', expectedSig)

const result = verifySignature(outSum, invId, expectedSig, pass2, params)
console.log('Verification result:', result ? 'PASS' : 'FAIL')

if (!result) process.exit(1)
