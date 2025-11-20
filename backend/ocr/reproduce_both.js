import fs from 'fs';
import { parseOcrResult, parseReceiptText } from "./parser.js";

async function main() {
    try {
        const text = `Test Receipt
GROCERY STORE
Date: 13-05-2023
Apples ....... 100.00
Milk .......... 60.00
Bread .......... 40.00
TOTAL .......... 2200.00
Thank you!`;

        const mockOcrData = {
            text: text,
            words: [
                { text: "Apples", bbox: { y0: 50, y1: 70 } },
                { text: "100.00", bbox: { y0: 50, y1: 70 } },
                { text: "Milk", bbox: { y0: 80, y1: 100 } },
                { text: "60.00", bbox: { y0: 80, y1: 100 } },
                { text: "Bread", bbox: { y0: 110, y1: 130 } },
                { text: "40.00", bbox: { y0: 110, y1: 130 } },
                { text: "TOTAL", bbox: { y0: 150, y1: 170 } },
                { text: "2200.00", bbox: { y0: 150, y1: 170 } }
            ]
        };

        let output = "";
        const log = (...args) => {
            output += args.join(" ") + "\n";
        };

        log("--- Testing parseReceiptText (Text-Only) ---");
        const resText = parseReceiptText(text);
        log("Result:", JSON.stringify(resText, null, 2));

        log("\n--- Testing parseOcrResult (Word-Level) ---");
        const resOcr = parseOcrResult(mockOcrData);
        log("Result:", JSON.stringify(resOcr, null, 2));

        fs.writeFileSync("reproduce_both_output.txt", output);
        console.log("Output written to reproduce_both_output.txt");
    } catch (error) {
        console.error("Error running reproduction script:", error);
        fs.writeFileSync("reproduce_both_output.txt", "Error: " + error.message);
    }
}

main();
