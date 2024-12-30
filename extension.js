const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { DOMParser } = require("@xmldom/xmldom");

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
  console.log(
    'Congratulations, your extension "leetcode-test-case-extractor" is now active!'
  );

  //------Side bar ka UI-UX

  const testCaseProvider = new TestCaseTreeProvider();
  vscode.window.registerTreeDataProvider("testCasesView", testCaseProvider);

  // Register a command to run the test case
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "testCasesView.runTestCase",
      (index, input, output) => {
        console.log(`Running test case ${index + 1}`);
        console.log(input);
        console.log(output);
        let parsedInputandvariblenames = parseAndFormat(input);
        let parsedInput = parsedInputandvariblenames.formattedCode;
        let variableNames = parsedInputandvariblenames.variables;
        let parsedOutput = parseOutput(output);
        console.log(`"Parsed Test Cases:",${parsedInput}, ${parsedOutput}`);
        vscode.window.showInformationMessage(
          `"Parsed Test Cases:",${parsedInput}, ${parsedOutput}`
        );
        //vscode.window.showInformationMessage(`Running Test Case ${index + 1}`);
        console.log(`Variable Names:`, variableNames);
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          const filePath = activeEditor.document.fileName;
          console.log(`Current file path: ${filePath}`);

          // Read the file content (if needed)
          const cppContent = activeEditor.document.getText();

          // Pass everything to the tester function
          testerfun(
            cppContent,
            parsedInputkk,
            parsedOutputkk,
            inputVariableskk
          );
        } else {
          vscode.window.showErrorMessage("No active file detected.");
        }

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

  //------Code to watch whether new HTML file is downloaded or not, if yes, fetch its IO and generate boilerplate (Leetcode template fetching pending)------------------------------------------------
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
  //-------End
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

//------------------Sidebar-------------------

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
      const input = testCase.input ? testCase.input : "No Input";
      const output = testCase.output ? testCase.output : "No Output";

      // Setting markdown-like description (bold text with code blocks)
      treeItem.tooltip = `Input : \n${input}\nOutput : \n${output}`;
      treeItem.description = `Input = ${input} | Output = ${output}`;

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

//----------------------Parser----------------------------------

function parseAndFormat(input) {
  let result = "";
  let variableNames = [];

  const regex = /(\w+)\s*=/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    variableNames.push(match[1]);
  }

  // Control flags and counters
  let canInsertAuto = true;
  //let canChangeBraces = true;
  let canChangeComma = true;
  let arrayDepth = 0;
  let insideString = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' || char === "'") {
      insideString = !insideString;
      //canChangeBraces = !insideString;
      canChangeComma = !insideString;
    }

    if (!insideString) {
      if (char === "[") {
        arrayDepth++;
        if (arrayDepth === 1) {
          canChangeComma = false;
        }
        result += "{";
        continue;
      } else if (char === "]") {
        result += "}";
        arrayDepth--;
        if (arrayDepth === 0) {
          canChangeComma = true;
        }
        continue;
      }

      if (char === "," && canChangeComma && arrayDepth === 0) {
        result += " ; ";
        canInsertAuto = true;
        continue;
      }

      if (canInsertAuto) {
        result += "auto ";
        canInsertAuto = false;
      }
    }
    result += char;
  }

  console.log("returning : ", result);
  return {
    variables: variableNames,
    formattedCode: result,
  };
}

function parseOutput(outputString) {
  // Remove any leading or trailing whitespace
  let outputContent = "auto expected = " + outputString.trim() + ";";
  return outputContent;
}
//-----------For extracting test cases from LeetCode-like HTML content---------------------------------------
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
function updateCppFile(currentcode, parsedInput, parsedOutput, inputVariables) {
  // Path to your C++ file
  const cppFilePath = "./bgrunner.cpp";

  // Read the current content of the C++ file
  let cppContentwithoutcurrentcode = fs.readFileSync(cppFilePath, "utf8");
  let cppContent = `${currentcode}\n${cppContentwithoutcurrentcode}`;

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
  console.log("Entered Compile and run function");
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
      //popup in vscode showing result
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

async function testerfun(
  currentcode,
  parsedInput,
  parsedOutput,
  inputVariables
) {
  console.log("Kuch nhi kiya");
  await restoreOriginalCpp();
  await updateCppFile(currentcode, parsedInput, parsedOutput, inputVariables);
  await compileAndRunCpp();
  // setTimeout(() => {
  //   restoreOriginalCpp();
  // }, 500);
}

//----------get cpp code of current file
function getCurrentCode(filePath) {
  try {
    const code = fs.readFileSync(filePath, "utf-8");
    return code;
  } catch (error) {
    console.error("Error reading the current file:", error);
    return null;
  }
}
