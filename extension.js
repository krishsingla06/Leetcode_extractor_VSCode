const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
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

function saveTestCasesToFile(testCases, filename) {
  const downloadsFolder = path.join(require("os").homedir(), "Downloads");
  //remove the .html extension
  filename = filename.replace(".html", "");
  const outputFile = path.join(
    downloadsFolder,
    "test_cases",
    `${filename}.txt`
  ); // Ensure file path is correct
  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }); // Create the folder if it doesn't exist
  }
  console.log("Output File........:", outputFile);

  let content = "";
  testCases.forEach((testCase, index) => {
    content += `Test Case ${index + 1}:\n`;
    content += `  Input: ${testCase.input}\n`;
    content += `  Output: ${testCase.output}\n\n`;
  });

  try {
    // Write to the file synchronously
    fs.writeFileSync(outputFile, content, "utf-8");
    vscode.window.showInformationMessage("Test cases saved to test_cases.txt.");
  } catch (err) {
    console.error("Error saving test cases to file:", err);
    vscode.window.showErrorMessage("Error saving test cases to file.");
  }
}

function createProblemFiles(problemName, templateCode, testCases) {
  problemName = problemName.replace(".html", "");
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  // File paths
  const cppFilePath = path.join(workspaceFolder, `${problemName}.cpp`);
  const testCaseFolder = path.join(workspaceFolder, "test_cases");
  const testCaseFilePath = path.join(testCaseFolder, `${problemName}.json`);

  // Ensure test_cases folder exists
  if (!fs.existsSync(testCaseFolder)) {
    fs.mkdirSync(testCaseFolder);
  }

  // Create .cpp file
  const cppTemplate =
    templateCode ||
    `
#include <iostream>
using namespace std;

int main() {
  // Solution code here
  return 0;
}
`;
  fs.writeFileSync(cppFilePath, cppTemplate.trim());

  // Create test cases file
  const testCaseData = {
    testCases: testCases || [],
  };
  fs.writeFileSync(testCaseFilePath, JSON.stringify(testCaseData, null, 2));

  // Open .cpp file in editor
  vscode.workspace.openTextDocument(cppFilePath).then((doc) => {
    vscode.window.vscode.window.showTextDocument(doc);
  });
}

let testCasesPanel = null;

function createTestCasesPanel() {
  testCasesPanel = vscode.window.createWebviewPanel(
    "testCasesPanel",
    "Test Cases",
    vscode.ViewColumn.Beside, // Fixed to the side panel
    {
      enableScripts: true,
      retainContextWhenHidden: true, // Keep panel alive when hidden
      //preserveFocus: true, // Keep focus on the editor
      viewColumn: vscode.ViewColumn.One,
    }
  );

  testCasesPanel.onDidDispose(() => {
    // Recreate the panel if closed
    testCasesPanel = null;
    createTestCasesPanel();
  });
}

function updateTestCasesPanel(problemName, testCases) {
  if (!testCasesPanel) {
    createTestCasesPanel();
  }

  const htmlContent = generateTestCasesHtml(problemName, testCases);
  testCasesPanel.webview.html = htmlContent;
}

function getTestCaseFilePath(problemName) {
  const testCasesFolder = path.join(
    vscode.workspace.workspaceFolders[0].uri.fsPath,
    "test_cases"
  );
  return path.join(testCasesFolder, `${problemName}.json`);
}

function generateTestCasesHtml(problemName, testCases) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${problemName} Test Cases</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
          }
          .container {
              padding: 10px;
              overflow-y: auto;
              max-height: 90vh;
          }
          h1 {
              font-size: 1.5rem;
              color: rgb(255, 255, 255);
          }
          .test-case {
              margin-bottom: 15px;
              padding: 10px;
              border: 1px solid #ccc;
              border-radius: 5px;
              background:rgb(8, 7, 7);
          }
          .test-case h2 {
              font-size: 1.2rem;
              margin: 0;
              color: rgb(255, 255, 255);
          }
          .test-case p {
              margin: 5px 0;
          }
          button {
              background: #007acc;
              color: white;
              border: none;
              padding: 5px 10px;
              border-radius: 3px;
              cursor: pointer;
          }
          button:hover {
              background: #005f99;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <h1>Test Cases</h1>
          ${testCases
            .map(
              (testCase, index) => `
              <div class="test-case">
                  <h2>Test Case ${index + 1}</h2>
                  <p><strong>Input:</strong> <pre>${testCase.input}</pre></p>
                  <p><strong>Output:</strong> <pre>${testCase.output}</pre></p>
                  <button onclick="runTest(${index})">Run Test Case</button>
              </div>
          `
            )
            .join("")}
      </div>
      <script>
          const vscode = acquireVsCodeApi();
          
          function runTest(index) {
              console.log("Running test case:", index);
              vscode.postMessage({
                  command: "runTestCase",
                  testCaseIndex: index
              });
          }
      </script>
  </body>
  </html>
  `;
}

function activate(context) {
  console.log(
    'Congratulations, your extension "leetcode-test-case-extractor" is now active!'
  );

  const downloadsFolder = path.join(require("os").homedir(), "Downloads");

  // Watch the downloads folder for changes to HTML files
  let debounceTimer;

  fs.watch(
    downloadsFolder,
    { persistent: true, recursive: false },
    (eventType, filename) => {
      if (eventType === "rename" && filename.endsWith(".html")) {
        const filePath = path.join(downloadsFolder, filename);

        // Clear previous debounce timer if it's still active
        clearTimeout(debounceTimer);

        // Set new debounce timer
        debounceTimer = setTimeout(async () => {
          try {
            const stats = await fs.promises.stat(filePath);

            if (stats.isFile()) {
              console.log(`New HTML file detected: ${filePath}`);

              // Read the file asynchronously
              const htmlContent = await fs.promises.readFile(filePath, "utf-8");

              // Extract test cases
              const testCases = extractTestCases(htmlContent);

              // Show test cases in the output channel
              const outputChannel =
                vscode.window.createOutputChannel("Test Cases");
              outputChannel.show();
              testCases.forEach((testCase, index) => {
                outputChannel.appendLine(`Test Case ${index + 1}:`);
                outputChannel.appendLine(`  Input: ${testCase.input}`);
                outputChannel.appendLine(`  Output: ${testCase.output}`);
              });
              saveTestCasesToFile(testCases, filename);
              createProblemFiles(filename, null, testCases);
              //createFileWithTemplateAndTestCases(filename);
              // createCppFileWithTemplate(filename);
              // showTestCasesInWebView(testCases);
            }
          } catch (err) {
            console.error("Error accessing file:", err);
          }
        }, 1000); // Debounce interval
      }
    }
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.fileName.endsWith(".cpp")) {
        const filePath = editor.document.fileName;
        const problemName = path.basename(filePath, ".cpp");
        const testCaseFilePath = getTestCaseFilePath(problemName);
        console.log("Test Case File Path:..........", testCaseFilePath);

        if (fs.existsSync(testCaseFilePath)) {
          console.log("Test cases found for:", problemName);
          const testCases = JSON.parse(
            fs.readFileSync(testCaseFilePath, "utf8")
          );
          console.log("Test Cases:..........", testCases);
          updateTestCasesPanel(problemName, testCases.testCases);
        } else {
          console.log("No test cases found for:", problemName);
          updateTestCasesPanel(problemName, []); // Empty if no test cases exist
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("html-parser.openTestCases", () => {
      if (!testCasesPanel) {
        createTestCasesPanel();
      }
    })
  );

  // Ensure the panel is always active when switching files
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (!testCasesPanel) {
        createTestCasesPanel();
      }
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

//---------------------------------OLD CODE---------------------------------

// fs.watch(
//   downloadsFolder,
//   { persistent: true, recursive: false },
//   (eventType, filename) => {
//     if (eventType === "rename" && filename.endsWith(".html")) {
//       const filePath = path.join(downloadsFolder, filename);

//       setTimeout(() => {
//         fs.stat(filePath, (err, stats) => {
//           if (err) {
//             console.error("Error accessing file:", err);
//             return;
//           }

//           if (stats.isFile()) {
//             console.log(`New HTML file detected: ${filePath}`);
//             const htmlContent = fs.readFileSync(filePath, "utf-8");

//             const testCases = extractTestCases(htmlContent);

//             const outputChannel =
//               vscode.window.createOutputChannel("Test Cases");
//             outputChannel.show();
//             testCases.forEach((testCase, index) => {
//               outputChannel.appendLine(`Test Case ${index + 1}:`);
//               outputChannel.appendLine(`  Input: ${testCase.input}`);
//               outputChannel.appendLine(`  Output: ${testCase.output}`);
//             });
//           }
//         });
//       }, 1000);
//     }
//   }
// );

// const disposable = vscode.commands.registerCommand(
//   "html-parser.extractTestCases",
//   async () => {
//     try {
//       vscode.window.showInformationMessage(
//         "Extract Test Cases command executed"
//       );
//       // Open file dialog to select HTML file
//       const fileUri = await vscode.window.showOpenDialog({
//         canSelectFiles: true,
//         canSelectMany: false,
//         filters: {
//           "HTML Files": ["html"],
//         },
//       });

//       if (fileUri && fileUri[0]) {
//         console.log("File selected");

//         const filePath = fileUri[0].fsPath;
//         const htmlContent = fs.readFileSync(filePath, "utf-8");

//         // Extract test cases
//         const testCases = extractTestCases(htmlContent);

//         // Display extracted test cases in the output channel
//         const outputChannel = vscode.window.createOutputChannel("Test Cases");
//         outputChannel.show();
//         testCases.forEach((testCase, index) => {
//           outputChannel.appendLine(`Test Case ${index + 1}:`);
//           outputChannel.appendLine(`  Input: ${testCase.input}`);
//           outputChannel.appendLine(`  Output: ${testCase.output}`);
//         });
//       } else {
//         vscode.window.showErrorMessage("No file selected.");
//       }
//     } catch (error) {
//       console.error(error);
//       vscode.window.showErrorMessage("Error extracting test cases.");
//     }
//   }
// );

// context.subscriptions.push(disposable);
