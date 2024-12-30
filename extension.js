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

class TestCaseTreeProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.currentCppFile = null; // To track the active .cpp file
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTestCases() {
    if (!this.currentCppFile) {
      return []; // No active .cpp file
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("No workspace folder is open.");
      return [];
    }

    const testCasesFolder = path.join(workspaceFolder, "test_cases");
    const problemName = path.basename(this.currentCppFile, ".cpp");
    const testCaseFilePath = path.join(testCasesFolder, `${problemName}.json`);

    if (!fs.existsSync(testCaseFilePath)) {
      return []; // No test case file for the active .cpp
    }

    try {
      const fileContent = fs.readFileSync(testCaseFilePath, "utf-8");
      const testCaseData = JSON.parse(fileContent);
      return testCaseData.testCases || [];
    } catch (err) {
      console.error("Error reading test case file:", err);
      vscode.window.showErrorMessage("Error reading test case file.");
      return [];
    }
  }

  /**
   * Builds tree view items from test cases.
   */
  getTreeItems(testCases) {
    return testCases.map((testCase, index) => {
      const label = `Test Case ${index + 1}`;

      // Create a custom tree item for each test case
      const treeItem = new vscode.TreeItem(
        label,
        vscode.TreeItemCollapsibleState.None
      );
      treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;

      // Format the input and output as a markdown string for better readability
      const input = testCase.input
        ? `**Input:**\n\`\`\`\n${testCase.input}\n\`\`\``
        : "No Input";
      const output = testCase.output
        ? `**Output:**\n\`\`\`\n${testCase.output}\n\`\`\``
        : "No Output";

      // Setting markdown-like description (bold text with code blocks)
      treeItem.tooltip = `${input}\n\n${output}`;
      treeItem.description = `${input} | ${output}`;

      // Adding the button for running the test case
      const button = `Run Test Case ${index + 1}`;
      treeItem.command = {
        title: button,
        command: "testCasesView.runTestCase",
        arguments: [index, input, output], // Pass the index of the test case to run
      };

      return treeItem;
    });
  }

  getChildren() {
    const testCases = this.getTestCases();
    return this.getTreeItems(testCases);
  }

  getTreeItem(element) {
    return element;
  }
}

function activate(context) {
  console.log(
    'Congratulations, your extension "leetcode-test-case-extractor" is now active!'
  );

  const testCaseProvider = new TestCaseTreeProvider();
  vscode.window.registerTreeDataProvider("testCasesView", testCaseProvider);

  // Register a command to run the test case
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "testCasesView.runTestCase",
      (index, input, output) => {
        console.log(`Running test case ${index + 1}`);
        input = input.replace("**Input:**", "");
        output = output.replace("**Output:**", "");
        let parsedInput = parseInput(input);
        let parsedOutput = parseOutput(output);
        console.log(`"Parsed Test Cases:",${parsedInput}, ${parsedOutput}`);
        vscode.window.showInformationMessage(`Running Test Case ${index + 1}`);
        let variableNames = parseVariableNames(parsedInput);
        console.log(`Variable Names:`, variableNames);
        //testerfun(parsedInput, parsedOutput, variableNames); //parsing ache se karni reh gyi bss :)
        testerfun(parsedInputkk, parsedOutputkk, inputVariableskk);
        testCaseProvider.refresh();
      }
    )
  );

  // Refresh the tree view when the active editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document.fileName.endsWith(".cpp")) {
      testCaseProvider.currentCppFile = editor.document.fileName;
      testCaseProvider.refresh();
    }
  });

  // Add a command to refresh manually
  context.subscriptions.push(
    vscode.commands.registerCommand("testCasesView.refresh", () => {
      testCaseProvider.refresh();
    })
  );

  // Trigger initial refresh if there's an active cpp file
  if (vscode.window.activeTextEditor?.document.fileName.endsWith(".cpp")) {
    testCaseProvider.currentCppFile =
      vscode.window.activeTextEditor.document.fileName;
    testCaseProvider.refresh();
  }

  //---------------------------------------------END------------------------------------------------

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
            }
          } catch (err) {
            console.error("Error accessing file:", err);
          }
        }, 1000); // Debounce interval
      }
    }
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

//----------------------Parser-------------------------
function parseInput(inputString) {
  // Remove any leading or trailing whitespace
  let inputContent = inputString.trim();
  // Add 'auto' keyword to variable assignments
  inputContent = inputContent.replace(/(\w+)\s*=\s*/g, "auto $1 ="); // Modify variable assignments
  inputContent += ";"; // Add semicolon to the input

  return inputContent;
}

function parseOutput(outputString) {
  // Remove any leading or trailing whitespace
  let outputContent = "auto expected = " + outputString.trim() + ";";
  return outputContent;
}

function parseVariableNames(input) {
  // Regular expression to capture variable names between 'auto' and '='
  const regex = /auto\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
  const variableNames = [];
  let match;

  // Loop through all matches and extract variable names
  while ((match = regex.exec(input)) !== null) {
    const varName = match[1]; // Extracted variable name
    variableNames.push(varName); // Store the variable name
  }

  return variableNames;
}

// For extracting test cases from LeetCode-like HTML content---------------------------------------
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

//---------------------------------------------Compile and run------------------------------------------------

const { exec } = require("child_process");

// Function to write the parsed content to bgrunner.cpp
function updateCppFile(parsedInput, parsedOutput, inputVariables) {
  // Path to your C++ file
  const cppFilePath = "./bgrunner.cpp";

  // Read the current content of the C++ file
  let cppContent = fs.readFileSync(cppFilePath, "utf8");

  // Extract where the code will be inserted after the line `// add your code here`
  const insertIndex = cppContent.indexOf("// add your code here");

  if (insertIndex === -1) {
    console.log("Couldn't find the comment line in bgrunner.cpp");
    return;
  }

  // Prepare the code to insert
  const inputString = parsedInput; // Example of parsed input
  const outputString = parsedOutput; // Example of parsed output
  const funCall = `fun(${inputVariables.join(", ")});`;

  // Insert the parsed input and output and the function call
  cppContent =
    cppContent.slice(0, insertIndex + "// add your code here".length) +
    "\n" +
    inputString +
    "\n" +
    outputString +
    "\n" +
    funCall +
    "\n" +
    cppContent.slice(insertIndex + "// add your code here".length);

  // Write the updated content back to the C++ file
  fs.writeFileSync(cppFilePath, cppContent);

  console.log(
    "Updated bgrunner.cpp with parsed input, output, and function call"
  );
}

// Function to compile and run the C++ file
function compileAndRunCpp() {
  // Compile the C++ file
  exec("g++ bgrunner.cpp -o kkk.exe", (err, stdout, stderr) => {
    if (err) {
      console.error(`Error compiling: ${stderr}`);
      return;
    }

    console.log("C++ code compiled successfully!");

    // Run the compiled executable
    exec("kkk.exe", (err, stdout, stderr) => {
      if (err) {
        console.error(`Error running C++ code: ${stderr}`);
        return;
      }

      // Output from the C++ program
      console.log(`C++ Output: ${stdout}`);
    });
  });
}

// Function to restore the original content from bgrunnerpermanent.cpp to bgrunner.cpp
function restoreOriginalCpp() {
  // Read the content of bgrunnerpermanent.cpp
  // const path =
  const permanentCpp = fs.readFileSync("./bgrunnerpermanent.cpp", "utf8");

  // Write the original content back to bgrunner.cpp
  fs.writeFileSync("./bgrunner.cpp", permanentCpp);

  console.log("Restored bgrunner.cpp to its original state.");
}

// Example parsed input, output, and variable list
const parsedInputkk = "auto nums = {3, 2, 2, 3} ; auto val = 2;"; // Example input
const parsedOutputkk = "auto expectedoutput = 'a';"; // Example output
const inputVariableskk = ["nums", "val"]; // List of variable names

// Update the C++ file with parsed input, output, and function call

async function testerfun(parsedInput, parsedOutput, inputVariables) {
  console.log("Kuch nhi kiya");
  await restoreOriginalCpp();
  await updateCppFile(parsedInput, parsedOutput, inputVariables);
  await compileAndRunCpp();
  setTimeout(() => {
    restoreOriginalCpp();
  }, 500);
}

//testerfun(parsedInput, parsedOutput, inputVariables);

//---------------------------------------------END------------------------------------------------

//---------------------------------OLD CODE---------------------------------

// let testCasesView = null;

// function getTestCaseFilePath(problemName) {
//   const testCasesFolder = path.join(
//     vscode.workspace.workspaceFolders[0].uri.fsPath,
//     "test_cases"
//   );
//   return path.join(testCasesFolder, `${problemName}.json`);
// }

// function generateTestCasesHtml(problemName, testCases) {
//   return `
//   <!DOCTYPE html>
//   <html lang="en">
//   <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>${problemName} Test Cases</title>
//       <style>
//           body {
//               font-family: Arial, sans-serif;
//               margin: 0;
//               padding: 0;
//           }
//           .container {
//               padding: 10px;
//               overflow-y: auto;
//               max-height: 90vh;
//           }
//           h1 {
//               font-size: 1.5rem;
//               color: rgb(255, 255, 255);
//           }
//           .test-case {
//               margin-bottom: 15px;
//               padding: 10px;
//               border: 1px solid #ccc;
//               border-radius: 5px;
//               background:rgb(8, 7, 7);
//           }
//           .test-case h2 {
//               font-size: 1.2rem;
//               margin: 0;
//               color: rgb(255, 255, 255);
//           }
//           .test-case p {
//               margin: 5px 0;
//           }
//           button {
//               background: #007acc;
//               color: white;
//               border: none;
//               padding: 5px 10px;
//               border-radius: 3px;
//               cursor: pointer;
//           }
//           button:hover {
//               background: #005f99;
//           }
//       </style>
//   </head>
//   <body>
//       <div class="container">
//           <h1>Test Cases</h1>
//           ${testCases
//             .map(
//               (testCase, index) => `
//               <div class="test-case">
//                   <h2>Test Case ${index + 1}</h2>
//                   <p><strong>Input:</strong> <pre>${testCase.input}</pre></p>
//                   <p><strong>Output:</strong> <pre>${testCase.output}</pre></p>
//                   <button onclick="runTest(${index})">Run Test Case</button>
//               </div>
//           `
//             )
//             .join("")}
//       </div>
//       <script>
//           const vscode = acquireVsCodeApi();

//           function runTest(index) {
//               console.log("Running test case:", index);
//               vscode.postMessage({
//                   command: "runTestCase",
//                   testCaseIndex: index
//               });
//           }
//       </script>
//   </body>
//   </html>
//   `;
// }

//---------------------------------OLD CODE---------------------------------

// context.subscriptions.push(
//   vscode.window.onDidChangeActiveTextEditor((editor) => {
//     if (editor && editor.document.fileName.endsWith(".cpp")) {
//       const filePath = editor.document.fileName;
//       const problemName = path.basename(filePath, ".cpp");
//       const testCaseFilePath = getTestCaseFilePath(problemName);
//       console.log("Test Case File Path:..........", testCaseFilePath);

//       if (fs.existsSync(testCaseFilePath)) {
//         console.log("Test cases found for:", problemName);
//         const testCases = JSON.parse(
//           fs.readFileSync(testCaseFilePath, "utf8")
//         );
//         console.log("Test Cases:..........", testCases);
//       } else {
//         console.log("No test cases found for:", problemName);
//       }
//     }
//   })
// );

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
