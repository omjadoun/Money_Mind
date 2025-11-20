import fs from 'fs';
import { parseOcrResult } from "./parser.js";

async function main() {
    try {
        // Mock OCR result with word-level data
        // Simulating: "TOTAL 28.25" and a large number "371572024" (derived from date or noise)
        const mockOcrData = {
            text: "GROCERY STORE\nApples 3.00\nTOTAL 28.25\n03/15/2024\n371572024",
            words: [
                { text: "GROCERY", bbox: { y0: 10, y1: 30 } },
                { text: "STORE", bbox: { y0: 10, y1: 30 } },
                { text: "Apples", bbox: { y0: 50, y1: 70 } },
                { text: "3.00", bbox: { y0: 50, y1: 70 } },
                { text: "TOTAL", bbox: { y0: 100, y1: 120 } },
                { text: "28.25", bbox: { y0: 100, y1: 120 } },
                { text: "03/15/2024", bbox: { y0: 150, y1: 170 } },
                { text: "371572024", bbox: { y0: 180, y1: 200 } } // The problem candidate
            ]
        };

        let output = "";
        const log = (...args) => {
            output += args.join(" ") + "\n";
        };

        log("--- Testing parseOcrResult ---");
        const result = parseOcrResult(mockOcrData);
        log("Result:", JSON.stringify(result, null, 2));

        fs.writeFileSync("reproduce_ocr_result_output.txt", output);
        console.log("Output written to reproduce_ocr_result_output.txt");
    } catch (error) {
        console.error("Error running reproduction script:", error);
        fs.writeFileSync("reproduce_ocr_result_output.txt", "Error: " + error.message);
    }
}

main();
