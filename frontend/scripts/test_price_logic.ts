
import { splitPrice, getPriceValue } from "../lib/price";

console.log("Starting Price Logic Tests...");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        failed++;
    }
}

// Test getPriceValue
console.log("\n--- Testing getPriceValue ---");

assert(getPriceValue(1000) === 1000, "Should handle number input: 1000 -> 1000");
assert(getPriceValue("1000") === 1000, "Should handle string number: '1000' -> 1000");
assert(getPriceValue("1000 руб.") === 1000, "Should handle string with suffix: '1000 руб.' -> 1000");
assert(getPriceValue("1 000 руб.") === 1000, "Should handle string with spaces: '1 000 руб.' -> 1000");
assert(getPriceValue("1000 / 500") === 1000, "Should take first part of split price: '1000 / 500' -> 1000");
assert(getPriceValue("1500 руб. / 3 шт.") === 1500, "Should take first part with text: '1500 руб. / 3 шт.' -> 1500");
assert(getPriceValue("") === 0, "Should handle empty string: '' -> 0");
assert(getPriceValue(null as any) === 0, "Should handle null: null -> 0");
assert(getPriceValue(undefined as any) === 0, "Should handle undefined: undefined -> 0");

// Test splitPrice
console.log("\n--- Testing splitPrice ---");

const res1 = splitPrice(1000);
assert(res1.main === "1 000 руб." && res1.sub === "", "Should format number: 1000 -> '1 000 руб.'"); 
// Note: toLocaleString might use non-breaking space (U+00A0), so we might need to be careful with string comparison.
// Let's check loose equality for spaces.

function normalize(s: string) {
    return s.replace(/\s/g, ' ').trim();
}

assert(normalize(res1.main) === "1 000 руб." && res1.sub === "", "Should format number (normalized): 1000 -> '1 000 руб.'");

const res2 = splitPrice("2000");
assert(normalize(res2.main) === "2 000 руб." && res2.sub === "", "Should format digit string: '2000' -> '2 000 руб.'");

const res3 = splitPrice("3000 руб.");
assert(res3.main === "3000 руб." && res3.sub === "", "Should handle existing suffix: '3000 руб.' -> '3000 руб.'");

const res4 = splitPrice("4000 руб. / шт");
assert(res4.main === "4000 руб." && res4.sub === "шт", "Should split with slash: '4000 руб. / шт' -> '4000 руб.', 'шт'");

const res5 = splitPrice("5000 / упаковка");
assert(res5.main === "5000" && res5.sub === "упаковка", "Should split simple slash: '5000 / упаковка' -> '5000', 'упаковка'");
// Note: splitPrice logic for slash without "руб" might not add "руб" automatically if it matches the slash pattern first.
// Let's check implementation of splitPrice again if this fails.

console.log("\n--- Summary ---");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
