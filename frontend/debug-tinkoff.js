const crypto = require('crypto');
const https = require('https');

const TERMINAL_KEY = "1765992881356";
const API_URL = "https://securepay.tinkoff.ru/v2/Init";

function generateToken(params, pwd) {
    const keys = Object.keys(params).filter(k => k !== "Token" && k !== "Receipt" && k !== "DATA").sort();
    let str = "";
    for (const k of keys) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
            str += params[k];
        }
    }
    const tokenInput = str + pwd;
    return crypto.createHash("sha256").update(tokenInput).digest("hex");
}

function checkPassword(pwd) {
    return new Promise((resolve) => {
        const orderId = "test_try_" + Math.random().toString(36).substring(7);
        const initParams = {
            TerminalKey: TERMINAL_KEY,
            Amount: 1000,
            OrderId: orderId,
            Description: "Test Payment",
            Language: "ru"
        };
        initParams.Token = generateToken(initParams, pwd);

        const req = https.request(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const isSuccess = !data.includes("Неверный токен");
                if (isSuccess) {
                    console.log(`FOUND CORRECT PASSWORD: "${pwd}"`);
                    console.log(`Response: ${data}`);
                } else {
                     // console.log(`Failed: "${pwd}"`);
                     process.stdout.write('.');
                }
                resolve(isSuccess);
            });
        });
        req.on('error', () => {
            process.stdout.write('E');
            resolve(false);
        });
        req.write(JSON.stringify(initParams));
        req.end();
    });
}

async function run() {
    console.log("Starting advanced password recovery...");
    
    // Base candidates including user input
    let candidates = [
        "ejlk$s_nR!5rZTPR", 
        "ejIk$s_nR!5rZTPR", 
        "ej1k$s_nR!5rZTPR",
        "ej|k$s_nR!5rZTPR",
        "ejlk$s_nRl5rZTPR", // l instead of !
        "ejlk$s_nRI5rZTPR", // I instead of !
        "ejlk$s_nR15rZTPR", // 1 instead of !
    ];

    // Homoglyph map (Latin -> Cyrillic lookalikes)
    const homoglyphs = {
        'e': ['е'],
        's': ['с'], // small s -> small es
        'r': ['г'], 
        'P': ['Р'],
        'T': ['Т'],
        'a': ['а'],
        'o': ['о'],
        'k': ['к'],
        'x': ['х'],
        'c': ['с'],
        'B': ['В'],
        'H': ['Н'],
        'M': ['М']
    };

    // Generate variations with homoglyphs
    const base = "ejlk$s_nR!5rZTPR";
    // We will try replacing characters one by one with Cyrillic equivalents if they exist
    for (let i = 0; i < base.length; i++) {
        const char = base[i];
        if (homoglyphs[char]) {
            for (const cyr of homoglyphs[char]) {
                const newPwd = base.substring(0, i) + cyr + base.substring(i + 1);
                candidates.push(newPwd);
            }
        }
    }
    
    // Add variations with "0" instead of "O" if applicable (none here)
    
    // Remove duplicates
    candidates = [...new Set(candidates)];

    console.log(`Testing ${candidates.length} variations (Minimal Request)...`);
    
    for (const pwd of candidates) {
        if (await checkPassword(pwd)) {
            break;
        }
    }
    console.log("\nDone.");
}

run();
