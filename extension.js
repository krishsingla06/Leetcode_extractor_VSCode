const vscode = require("vscode");
const fs = require("fs");
const { DOMParser } = require("@xmldom/xmldom");
/**
 * @param {vscode.ExtensionContext} context
 */

// /**
//  * Extracts test cases from LeetCode-like HTML content.
//  * @param html - The HTML string to extract test cases from.
//  * @returns An array of test cases with inputs and outputs.
//  */

function extractTestCases(html) {
  console.log("entered function....");

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Check if doc is parsed correctly
  console.log("Parsed HTML document:");
  console.log(doc);

  const testCases = [];

  // Convert NodeList to an array and check for strong tags
  const strongElements = Array.from(doc.getElementsByTagName("strong"));

  console.log("Found strong elements:");
  if (strongElements.length === 0) {
    console.log("No strong elements found.");
  } else {
    console.log("Strong elements found:");
    console.log(strongElements);
  }

  let currentInput = null;

  strongElements.forEach((element) => {
    // Explicitly cast `element` as a `Node` from `xmldom`
    const strongElement = element;
    const text = strongElement.textContent?.trim();

    console.log("Element Text:", text);

    if (text === "Input:") {
      const inputText = strongElement.nextSibling?.textContent?.trim();
      console.log("Found Input Text:", inputText);
      if (inputText) {
        currentInput = inputText;
      }
    } else if (text === "Output:" && currentInput) {
      const outputText = strongElement.nextSibling?.textContent?.trim();
      console.log("Found Output Text:", outputText);
      if (outputText) {
        testCases.push({ input: currentInput, output: outputText });
        currentInput = null; // Reset for the next case
      }
    }
  });

  console.log("Extracted test cases:", testCases);
  return testCases;
}

function activate(context) {
  console.log(
    'Congratulations, your extension "leetcode-test-case-extractor" is now active!'
  );
  const disposable = vscode.commands.registerCommand(
    "html-parser.extractTestCases",
    async () => {
      try {
        vscode.window.showInformationMessage(
          "Extract Test Cases command executed"
        );
        // Open file dialog to select HTML file
        const fileUri = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectMany: false,
          filters: {
            "HTML Files": ["html"],
          },
        });

        if (fileUri && fileUri[0]) {
          console.log("File selected");

          const filePath = fileUri[0].fsPath;
          const htmlContent = fs.readFileSync(filePath, "utf-8");

          // Extract test cases
          const testCases = extractTestCases(htmlContent);

          // Display extracted test cases in the output channel
          const outputChannel = vscode.window.createOutputChannel("Test Cases");
          outputChannel.show();
          testCases.forEach((testCase, index) => {
            outputChannel.appendLine(`Test Case ${index + 1}:`);
            outputChannel.appendLine(`  Input: ${testCase.input}`);
            outputChannel.appendLine(`  Output: ${testCase.output}`);
          });
        } else {
          vscode.window.showErrorMessage("No file selected.");
        }
      } catch (error) {
        console.error(error);
        vscode.window.showErrorMessage("Error extracting test cases.");
      }
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Deactivate the extension.
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
