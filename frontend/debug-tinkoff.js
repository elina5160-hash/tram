const crypto = require('crypto');
const https = require('https');

const TERMINAL_KEY = "1765992881356";
const API_URL = "https://securepay.tinkoff.ru/v2/Init";

function generateToken(params, pwd) {
    const paramsWithPwd = { ...params, Password: pwd };
    const keys = Object.keys(paramsWithPwd).filter(k => k !== "Token" && k !== "Receipt" && k !== "DATA").sort();
    let str = "";
    for (const k of keys) {
        if (paramsWithPwd[k] !== undefined && paramsWithPwd[k] !== null && paramsWithPwd[k] !== "") {
            str += paramsWithPwd[k];
        }
    }
    const tokenInput = str;
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
    const pwd = "ejlk$s_nR!5rZTPR";
    
    console.log("=== DIAGNOSTIC START ===");
    console.log("TerminalKey:", TERMINAL_KEY);
    console.log("Password:", pwd);
    
    const orderId = "test_" + Math.floor(Date.now() / 1000);
    const initParams = {
        TerminalKey: TERMINAL_KEY,
        Amount: 1000,
        OrderId: orderId,
        Description: "Test Payment",
        Language: "ru"
    };
    
    // Generate Token manually with logging
    // Correct logic per T-Bank support: Password should be treated as a parameter "Password" and sorted alphabetically
    const paramsForToken = { ...initParams, Password: pwd };
    const keys = Object.keys(paramsForToken).filter(k => k !== "Token" && k !== "Receipt" && k !== "DATA").sort();
    console.log("Sorted Keys (including Password):", keys);
    
    let str = "";
    for (const k of keys) {
        if (paramsForToken[k] !== undefined && paramsForToken[k] !== null && paramsForToken[k] !== "") {
            str += paramsForToken[k];
        }
    }
    const tokenInput = str;
    console.log("String to Sign (concatenated params):");
    console.log(`"${tokenInput}"`);
    
    const token = crypto.createHash("sha256").update(tokenInput).digest("hex");
    console.log("Generated Token (SHA-256):", token);
    
    initParams.Token = token;
    
    console.log("Sending Request to:", API_URL);
    console.log("Body:", JSON.stringify(initParams, null, 2));
    
    await checkPassword(pwd);
}

// Override checkPassword to just run one test with logging
function checkPassword(pwd) {
    return new Promise((resolve) => {
        // Reuse the logic but we already generated params in run()
        // Let's just do a fetch here for simplicity using the params from run() if we could pass them
        // But since checkPassword is self-contained, let's just let it run its own test 
        // OR better, let's copy the fetch logic here.
        
        // We will just let the original logic run but for ONE password
        
        const orderId = "diag_" + Math.random().toString(36).substring(7);
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
                console.log("=== SERVER RESPONSE ===");
                console.log("Status:", res.statusCode);
                console.log("Body:", data);
                if (data.includes("Неверный токен")) {
                    console.log("\n❌ CONCLUSION: Password is incorrect or TerminalKey is invalid.");
                } else if (JSON.parse(data).Success) {
                    console.log("\n✅ CONCLUSION: Password is CORRECT!");
                }
                resolve(true);
            });
        });
        req.on('error', (e) => {
            console.error("Error:", e);
            resolve(false);
        });
        req.write(JSON.stringify(initParams));
        req.end();
    });
}

run();
