import fs from 'fs';
import { parseReceiptText, extractDateFromText, extractTotalFromText } from "./parser.js";

async function main() {
  try {
    const sampleText = `
GROCERY STORE
Apples 3.00
Bread 2.50
Milk 4.00
Eggs 2.75
Chicken 8.50
Pasta 1.75
Tomato Sauce 2.25
Orange Juice 3.50
----------------------
TOTAL 28.25

03/15/2024
`;

    let output = "";
    const log = (...args) => {
      output += args.join(" ") + "\n";
    };

    log("--- Testing Full Parse ---");
    const result = parseReceiptText(sampleText);
    log("Result:", JSON.stringify(result, null, 2));

    log("\n--- Testing Date Extraction ---");
    const dateResult = extractDateFromText("03/15/2024");
    log("Date Extraction Result:", JSON.stringify(dateResult, null, 2));

    log("\n--- Testing Amount Extraction ---");
    const totalResult = extractTotalFromText(sampleText);
    log("Total Extraction Result:", JSON.stringify(totalResult, null, 2));

    const weirdAmountText = "371572024";
    log("\n--- Testing Weird Amount ---");
    const weirdResult = extractTotalFromText(weirdAmountText);
    log("Weird Amount Result:", JSON.stringify(weirdResult, null, 2));

    fs.writeFileSync("reproduce_output.txt", output);
    console.log("Output written to reproduce_output.txt");
  } catch (error) {
    console.error("Error running reproduction script:", error);
    fs.writeFileSync("reproduce_output.txt", "Error: " + error.message);
  }
}

main();
