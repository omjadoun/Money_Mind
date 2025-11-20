import fs from 'fs';
import { parseOcrResult } from "./parser.js";

async function main() {
    try {
        // Mock OCR result simulating the Rupee symbol misread
        // "Apples ... 100.00"
        // "Milk ... 60.00"
        // "Bread ... 40.00"
        // "TOTAL ... 2200.00" (should be 200.00, but ₹ read as 2)
        const mockOcrData = {
            text: "Test Receipt\nGROCERY STORE\nApples 100.00\nMilk 60.00\nBread 40.00\nTOTAL 2200.00\nThank you!",
            words: [
                { text: "Apples", bbox: { y0: 50, y1: 70 } },
                { text: "100.00", bbox: { y0: 50, y1: 70 } },
                { text: "Milk", bbox: { y0: 80, y1: 100 } },
                { text: "60.00", bbox: { y0: 80, y1: 100 } },
                { text: "Bread", bbox: { y0: 110, y1: 130 } },
                { text: "40.00", bbox: { y0: 110, y1: 130 } },
                { text: "TOTAL", bbox: { y0: 150, y1: 170 } },
                { text: "2200.00", bbox: { y0: 150, y1: 170 } } // The problem candidate
            ]
        };

        let output = "";
        const log = (...args) => {
            output += args.join(" ") + "\n";
        };

        log("--- Testing Rupee Misread (2200 vs 200) ---");
        const result = parseOcrResult(mockOcrData);
        log("Result:", JSON.stringify(result, null, 2));

        fs.writeFileSync("reproduce_rupee_output.txt", output);
        console.log("Output written to reproduce_rupee_output.txt");
    } catch (error) {
        console.error("Error running reproduction script:", error);
        fs.writeFileSync("reproduce_rupee_output.txt", "Error: " + error.message);
    }
}

main();
