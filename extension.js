//import { constrainedMemory } from "process";

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { DOMParser } = require("@xmldom/xmldom");
let dummyLine = "// add your code here";
let selectedLanguage = "cpp";

/**
 * @param {vscode.ExtensionContext} context
 */

const { exec } = require("child_process");

function activate(context) {
  console.log(
    'Congratulations, your extension "leetcode-test-case-extractor" is now active!'
  );

  vscode.window.showInformationMessage(context.extensionPath);

  //------Side bar ka UI-UX

  const testCaseProvider = new TestCaseTreeProvider();
  vscode.window.registerTreeDataProvider("testCasesView", testCaseProvider);

  // Refresh the tree view when the active editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document.fileName.endsWith(`${selectedLanguage}`)) {
      testCaseProvider.currentCppFile = editor.document.fileName;
      testCaseProvider.refreshviajson();
    }
  });

  // Add a command to refresh manually
  context.subscriptions.push(
    vscode.commands.registerCommand("testCasesView.refresh", () => {
      testCaseProvider.refresh();
      vscode.window.showInformationMessage("Tree view refreshed!");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("testCasesView.refreshviajson", () => {
      testCaseProvider.refreshviajson();
      vscode.window.showInformationMessage("Tree view refreshed via json!");
    })
  );

  // Trigger initial refresh if there's an active cpp file
  if (
    vscode.window.activeTextEditor?.document.fileName.endsWith(
      `${selectedLanguage}`
    )
  ) {
    testCaseProvider.currentCppFile =
      vscode.window.activeTextEditor.document.fileName;
    testCaseProvider.refreshviajson();
  }

  // Register a command to handle item click
  vscode.commands.registerCommand("testCasesView.itemClicked", (item) => {
    if (item.label === "Run Button") {
      vscode.window.showInformationMessage("Running test case...");
      const parent = testCaseProvider.findParent(item);
      if (parent) {
        testCaseProvider.runTest(parent);
      }
    }
  });

  // Register a command to edit Input or Output
  vscode.commands.registerCommand("testCasesView.editText", (item) => {
    const currentValue = item.label.split(":")[1]?.trim() || "";
    vscode.window
      .showInputBox({
        prompt: `Edit ${item.label.split(":")[0]}`,
        value: currentValue,
      })
      .then((newValue) => {
        if (newValue !== undefined) {
          item.label = `${item.label.split(":")[0]}: ${newValue}`;
          testCaseProvider.refresh();
          vscode.window.showInformationMessage(
            `${item.label.split(":")[0]} updated.`
          );
        }
      });
  });

  // Register a command for "Run All"
  vscode.commands.registerCommand("testCasesView.runAll", () => {
    testCaseProvider.runAllTests();
    vscode.window.showInformationMessage("All test cases executed.");
  });

  // Register a command to add a new test case
  vscode.commands.registerCommand("testCasesView.addTestCase", () => {
    vscode.window
      .showInputBox({ prompt: "Enter the name of the new test case" })
      .then((testCaseName) => {
        if (testCaseName) {
          testCaseProvider.addTestCase(testCaseName);
          vscode.window.showInformationMessage(
            `Test case '${testCaseName}' added.`
          );
        }
      });
  });

  // Register a command to delete a test case
  vscode.commands.registerCommand("testCasesView.deleteTestCase", (item) => {
    testCaseProvider.deleteTestCase(item);
    vscode.window.showInformationMessage(`Test case '${item.label}' deleted.`);
  });

  vscode.commands.registerCommand("testCaseView.saveTestCases", () => {
    vscode.window.showInformationMessage("Saving test cases...");
    testCaseProvider.saveTestCases();
  });

  //context.subscriptions.push(saveCommand);

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
              // Read the file asynchronously
              const htmlContent = await fs.promises.readFile(filePath, "utf-8");
              // Extract test cases
              const testcasesAndBoilerplate = extractTestCases(htmlContent);
              const testCases = testcasesAndBoilerplate.testCases;
              const boilerplate = testcasesAndBoilerplate.boilerplate;

              //const iodatatypes = parseFunctionSignature(boilerplate);

              // Show test cases in the output channel
              const outputChannel =
                vscode.window.createOutputChannel("Test Cases");
              outputChannel.show();
              testCases.forEach((testCase, index) => {
                outputChannel.appendLine(`Test Case ${index + 1}:`);
                outputChannel.appendLine(`  Input: ${testCase.input}`);
                outputChannel.appendLine(`  Output: ${testCase.output}`);
              });
              //saveTestCasesToFile(testCases, filename); just saving it to downloads folder , nothing else
              createProblemFiles(filename, boilerplate, testCases);
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

class TreeItem extends vscode.TreeItem {
  constructor(label = "", children = null, contextValue = null) {
    super(
      label,
      children
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    this.children = children;
    this.contextValue = contextValue;

    // Add a command for "Run Button"
    if (label === "Run Button") {
      this.command = {
        command: "testCasesView.itemClicked",
        title: "Run Test",
        arguments: [this],
      };
    }

    // Add a command for editable fields (Input/Output)
    if (contextValue === "editable") {
      this.command = {
        command: "testCasesView.editText",
        title: "Edit Text",
        arguments: [this],
      };
    }

    // Add a command for "Run All"
    if (label === "Run All") {
      this.command = {
        command: "testCasesView.runAll",
        title: "Run All Tests",
      };
    }

    // Add a command for "New Test Case"
    if (contextValue === "addTestCase") {
      this.command = {
        command: "testCasesView.addTestCase",
        title: "Add Test Case",
      };
    }

    // Add a command for "Delete"
    if (contextValue === "deleteTestCase") {
      this.command = {
        command: "testCasesView.deleteTestCase",
        title: "Delete Test Case",
        arguments: [this],
      };
    }

    if (contextValue === "saveTestCases") {
      this.command = {
        command: "testCaseView.saveTestCases",
        title: "Save Test Cases",
      };
    }
  }
}

class TestCaseTreeProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    //this.data is empty map of TreeItem
    const resourcesPath = path.join(__dirname, "resources");

    this.icons = {
      pass: {
        light: path.join(resourcesPath, "pass.png"),
        dark: path.join(resourcesPath, "pass.png"),
      },
      fail: {
        light: path.join(resourcesPath, "fail.png"),
        dark: path.join(resourcesPath, "fail.png"),
      },
    };
    this.data = [];
    this.currentCppFile = null; // To track the active .cpp file
  }

  refreshviajson() {
    let tempdata = this.getTestCases();
    this.data = tempdata;
    this._onDidChangeTreeData.fire();
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  createTestCase(label, input, output) {
    const testCase = new TreeItem(label, [
      new TreeItem(`Input: ${input}`, null, "editable"),
      new TreeItem(`Output: ${output}`, null, "editable"),
      //new TreeItem("Data Types: " + iodatatypes),
      new TreeItem(`Run Button`, null, null),
      new TreeItem(`Result: NULL`, null, null),
      new TreeItem(`Delete`, null, "deleteTestCase"),
      new TreeItem(`Output : `, null, null),
    ]);
    return testCase;
  }

  createSaveButton() {
    return new TreeItem(
      "Save Test Cases",
      vscode.TreeItemCollapsibleState.None,
      "saveTestCases"
    );
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
    const problemName = path.basename(
      this.currentCppFile,
      `${selectedLanguage}`
    );
    const testCaseFilePath = path.join(testCasesFolder, `${problemName}json`);

    if (!fs.existsSync(testCaseFilePath)) {
      //make folder and .json file
      fs.writeFileSync(testCaseFilePath, JSON.stringify({ testCases: [] }));
      //return []; // No test case file for the active .cpp
    }

    try {
      const fileContent = fs.readFileSync(testCaseFilePath, "utf-8");
      const testCaseData = JSON.parse(fileContent);
      let tempdata = [];
      tempdata.push(new TreeItem("Add Test Case", null, "addTestCase"));
      tempdata.push(
        new TreeItem("Run All", null, null) // bss iska reverse karna baaki hai
      );
      let saveButton = this.createSaveButton();
      tempdata.push(saveButton);
      for (let i = 1; i < testCaseData.testCases.length; i++) {
        tempdata.push(
          this.createTestCase(
            `TC ${i}`,
            testCaseData.testCases[i].input,
            testCaseData.testCases[i].output
            //testCaseData.testCases[i].iodatatypes
          )
        );
      }
      return tempdata || [];
      //return testCaseData.testCases || [];
    } catch (err) {
      vscode.window.showErrorMessage("Error reading test case file. " + err);
      return [];
    }
  }

  saveTestCases() {
    if (!this.currentCppFile) {
      vscode.window.showErrorMessage("No active .cpp file to save test cases.");
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("No workspace folder is open.");
      return [];
    }

    const testCasesFolder = path.join(workspaceFolder, "test_cases");
    const problemName = path.basename(
      this.currentCppFile,
      `${selectedLanguage}`
    );
    const testCaseFile = path.join(testCasesFolder, `${problemName}json`);
    let testCaseDatajson = { testCases: [] };
    let testCaseData = [];

    testCaseData.push({
      input: "a=-1",
      output: "b=-1",
    });

    //now iterate over all test cases
    for (let i = 3; i < this.data.length; i++) {
      const testCase = this.data[i];
      const input = testCase.children[0].label.replace("Input: ", "").trim();
      const output = testCase.children[1].label.replace("Output: ", "").trim();
      testCaseData.push({
        input: input,
        output: output,
      });
    }

    vscode.window.showInformationMessage("Saving test cases...");
    testCaseDatajson.testCases = testCaseData;

    fs.writeFileSync(
      testCaseFile,
      JSON.stringify(testCaseDatajson, null, 2),
      "utf-8"
    );
    vscode.window.showInformationMessage(`Test cases saved to ${testCaseFile}`);
  }

  // Required method to resolve each tree item
  getTreeItem(element) {
    // Add icons for result items
    if (element.label.startsWith("Result :")) {
      const result = element.label.split(":")[1]?.trim();
      if (result === "Test Passed") {
        element.iconPath = this.icons.pass;
      } else if (result === "Test Failed") {
        element.iconPath = this.icons.fail;
      } else {
        element.iconPath = null;
      }
    }
    return element;
  }

  // Find parent of a specific child item
  findParent(child) {
    const findRecursive = (data, target) => {
      for (const item of data) {
        if (item.children && item.children.includes(target)) {
          return item;
        }
        if (item.children) {
          const parent = findRecursive(item.children, target);
          if (parent) return parent;
        }
      }
      return null;
    };
    return findRecursive(this.data, child);
  }

  // Required method to get tree data
  getChildren(element) {
    if (!element) {
      return this.data; // Return root-level items
    }
    return element.children || []; // Return children of the given item
  }

  // Method to run a single test case
  async runTest(testCase) {
    const resultChild = testCase.children[3];
    const outputChild = testCase.children[5];
    const input = testCase.children[0].label.split(":")[1].trim();
    const output = testCase.children[1].label.split(":")[1].trim();
    // const iodatatypes = testCase.children[2].contextValue;
    // const paramTypes = iodatatypes.paramTypes;
    // const returnType = iodatatypes.returnType;
    //const funName = iodatatypes.funName;

    //let parsedInputandvariblenames = parseAndFormat(input, paramTypes);
    //let parsedInput = parsedInputandvariblenames.formattedCode;
    //let variableNames = parsedInputandvariblenames.variables;
    let parsedinput2 = parseAndFormat2(input);
    //let parsedOutput = parseOutput(output, returnType);
    let parsedOutput2 = parseOutput2(output);

    // vscode.window.showInformationMessage(
    //   `"Parsed Test Cases:",${parsedInput}, ${parsedOutput}`
    // );
    //vscode.window.showInformationMessage(`Running Test Case ${index + 1}`);
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const cppContent = activeEditor.document.getText();
      let resp = await testerfun(cppContent, parsedinput2);

      let resp2;

      if (resp.includes("error")) {
        resp2 = "Test Failed";
      } else {
        await resp.replace("\n", " ");
        if (resp.trim() === parsedOutput2.trim()) {
          resp2 = "Test Passed";
        } else {
          resp2 = "Test Failed";
        }
      }

      if (resultChild) {
        resultChild.label = "Result : " + resp2;
        outputChild.label = "Output : " + resp.trim();
        this.refresh();
      }
    } else {
      vscode.window.showErrorMessage("No active file detected.");
    }
  }

  // Method to run all test cases
  async runAllTests() {
    for (const testCase of this.data) {
      if (testCase.children) {
        await this.runTest(testCase);
      }
    }
  }

  addTestCase(label) {
    const newTestCase = this.createTestCase(label, "Input", "Output"); // run all ka context isme paas karunga baad mei
    this.data.push(newTestCase);
    this.refresh(); // Refresh after adding the new test case
  }

  deleteTestCase(item) {
    const deleteRecursive = (data, targetItem) => {
      for (let i = 0; i < data.length; i++) {
        const currentItem = data[i];
        if (currentItem === targetItem) {
          data.splice(i, 1); // Remove the entire test case
          return true; // Stop further traversal
        }
        if (currentItem.children) {
          const removed = deleteRecursive(currentItem.children, targetItem);
          if (removed) return true; // Stop traversal if the item was deleted
        }
      }
      return false; // Item not found
    };

    // Find the parent of the clicked item
    const parent = this.findParent(item);
    if (parent) {
      // If the "Delete" button is clicked, remove the parent test case
      deleteRecursive(this.data, parent);
    } else {
      // If no parent is found, delete from root level (failsafe)
      deleteRecursive(this.data, item);
    }

    this.refresh(); // Refresh the tree to reflect changes
  }

  // Event to notify VS Code when the tree should refresh
  _onDidChangeTreeData = new vscode.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
}

//----------------------Parser----------------------------------

// function parseAndFormat(input, paramTypes) {
//   let variableNames = [];

//   const regex = /(\w+)\s*=/g;
//   let match;
//   while ((match = regex.exec(input)) !== null) {
//     variableNames.push(match[1]);
//   }

//   // Control flags and counters
//   let result = "";
//   let idx = 0;
//   let canInsertAuto = true;
//   //let canChangeBraces = true;
//   let canChangeComma = true;
//   let arrayDepth = 0;
//   let insideString = false;

//   for (let i = 0; i < input.length; i++) {
//     const char = input[i];
//     if (char === '"' || char === "'") {
//       insideString = !insideString;
//       //canChangeBraces = !insideString;
//       canChangeComma = !insideString;
//     }

//     if (!insideString) {
//       if (char === "[") {
//         arrayDepth++;
//         if (arrayDepth === 1) {
//           canChangeComma = false;
//         }
//         result += "{";
//         continue;
//       } else if (char === "]") {
//         result += "}";
//         arrayDepth--;
//         if (arrayDepth === 0) {
//           canChangeComma = true;
//         }
//         continue;
//       }

//       if (char === "," && canChangeComma && arrayDepth === 0) {
//         result += " ; ";
//         canInsertAuto = true;
//         continue;
//       }

//       if (canInsertAuto) {
//         result += paramTypes[idx] + " ";
//         idx += 1;
//         canInsertAuto = false;
//       }
//     }
//     result += char;
//   }
//   result += " ;";

//   return {
//     variables: variableNames,
//     formattedCode: result,
//   };
// }

function parseAndFormat2(input) {
  // let variableNames = [];

  // const regex = /(\w+)\s*=/g;
  // let match;
  // while ((match = regex.exec(input)) !== null) {
  //   variableNames.push(match[1]);
  // }

  // Control flags and counters
  let result = "";
  //let idx = 0;
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
        //result += paramTypes[idx] + " ";
        //idx += 1;
        canInsertAuto = false;
      }
    }
    result += char;
  }
  result += " ;";

  return result;
}

// function parseOutput(outputString, returnType) {
//   let result = "";
//   let insideString = false;

//   for (let i = 0; i < outputString.length; i++) {
//     const char = outputString[i];
//     if (char === '"' || char === "'") {
//       insideString = !insideString;
//     }

//     if (!insideString) {
//       if (char === "[") {
//         result += "{";
//         continue;
//       } else if (char === "]") {
//         result += "}";
//         continue;
//       }
//     }
//     result += char;
//   }

//   let outputContent = returnType + "  expected = " + result.trim() + ";";
//   return outputContent;
// }

function parseOutput2(outputString) {
  let result = "";
  let insideString = false;

  for (let i = 0; i < outputString.length; i++) {
    const char = outputString[i];
    if (char === '"' || char === "'") {
      insideString = !insideString;
    }

    if (!insideString) {
      if (
        char === "[" ||
        char === "]" ||
        char === "{" ||
        char === "}" ||
        char === "}" ||
        char === "{" ||
        char === " "
      ) {
        continue;
      }
      if (char == ",") {
        result += " ";
        continue;
      }
      // result += char;
    }
    result += char;
  }

  return result;
}
//-----------For extracting test cases from LeetCode-like HTML content---------------------------------------

function extractTestCases(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const testCases = [];

  // Extract test cases
  const strongElements = Array.from(doc.getElementsByTagName("strong"));

  let currentInput = null;

  strongElements.forEach((element) => {
    const strongElement = element;
    const text = strongElement.textContent?.trim();

    if (text === "Input:") {
      let inputText = strongElement.nextSibling?.textContent?.trim();
      if (inputText) {
        currentInput = inputText;
      } else {
        const inputSpan =
          strongElement.parentNode?.getElementsByTagName("span")[0];
        currentInput = inputSpan?.textContent;
      }
    } else if (text === "Output:" && currentInput) {
      let outputText = strongElement.nextSibling?.textContent?.trim();
      if (outputText) {
        testCases.push({ input: currentInput, output: outputText });
        currentInput = null; // Reset for the next case
      } else {
        const outputSpan =
          strongElement.parentNode?.getElementsByTagName("span")[0];

        // Get the text content of the <span>
        outputText = outputSpan?.textContent;
        if (outputText) {
          currentInput = sanitizeText(currentInput);
          outputText = sanitizeText(outputText);
          testCases.push({ input: currentInput, output: outputText });
        }
        currentInput = null; // Reset for the next case
      }
    }
  });

  // Locate elements with class "view-lines monaco-mouse-cursor-text"
  const elements = Array.from(doc.getElementsByTagName("div"));

  let boilerplateText = "";

  elements.forEach((element) => {
    if (
      element.getAttribute("class") === "view-lines monaco-mouse-cursor-text"
    ) {
      // Extract text content from child nodes
      boilerplateText = Array.from(element.childNodes)
        .map((node) => node.textContent)
        .join("\n");
    }
  });

  boilerplateText = sanitizeText(boilerplateText);

  return { testCases: testCases, boilerplate: boilerplateText };
}

// Function to sanitize the extracted text
function sanitizeText(text) {
  // Replace non-breaking spaces with regular spaces
  text = text.replace(/\u00A0/g, " ");
  // Replace smart quotes with regular quotes
  text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // Optionally, remove any other non-printable characters
  text = text.replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters
  // Return the sanitized text
  return text;
}

// function saveTestCasesToFile(testCases, filename) {
//   // baad mei use karunga ise
//   const downloadsFolder = path.join(require("os").homedir(), "Downloads");
//   //remove the .html extension
//   filename = filename.replace(".html", "");
//   const outputFile = path.join(
//     downloadsFolder,
//     "test_cases",
//     `${filename}.txt`
//   ); // Ensure file path is correct
//   const dir = path.dirname(outputFile);
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true }); // Create the folder if it doesn't exist
//   }

//   let content = "";
//   testCases.forEach((testCase, index) => {
//     content += `Test Case ${index + 1}:\n`;
//     content += `  Input: ${testCase.input}\n`;
//     content += `  Output: ${testCase.output}\n\n`;
//   });

//   try {
//     // Write to the file synchronously
//     fs.writeFileSync(outputFile, content, "utf-8");
//     vscode.window.showInformationMessage("Test cases saved to test_cases.txt.");
//   } catch (err) {
//     vscode.window.showErrorMessage("Error saving test cases to file. " + err);
//   }
// }

async function createProblemFiles(problemName, templateCode, testCases) {
  problemName = problemName.replace(".html", "");
  // also remove last (1) type of thing
  problemName = problemName.replace(/\s*\(.*\)/, "");
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
    await fs.mkdirSync(testCaseFolder);
  }

  // Create .cpp file
  const cppTemplate =
    `
#include <bits/stdc++.h>
using namespace std;

//You can't change class name and funtion name\n
` + templateCode;
  await fs.writeFileSync(cppFilePath, cppTemplate.trim());

  let testCaseData = {
    testCases: [],
  };

  testCaseData.testCases.push({
    input: "a=-1",
    output: "b=-1",
  });

  // Add the actual test cases
  testCases.forEach((testCase) => {
    testCaseData.testCases.push({
      input: testCase.input,
      output: testCase.output,
    });
  });

  // Write the modified data to the file
  await fs.writeFileSync(
    testCaseFilePath,
    JSON.stringify(testCaseData, null, 2)
  );

  // Open .cpp file in editor
  vscode.workspace.openTextDocument(cppFilePath).then((doc) => {
    vscode.window.showTextDocument(doc);
  });
}

//---------------------------------------------Compile and run------------------------------------------------
// Function to write the parsed content to bgrunner.cpp
async function updateCppFile(currentcode, parsedinput2) {
  // Path to your C++ file
  const cppFilePath = "./bgrunner.cpp";

  let cppContent = currentcode;

  const insertIndex = cppContent.indexOf(dummyLine);

  if (insertIndex === -1) {
    //also show error message
    fs.writeFileSync(cppFilePath, cppContent);
    vscode.window.showErrorMessage(
      `Couldn't find the comment line in bgrunner.cpp. Please add the comment line ${dummyLine} in the file.`
    );
    return;
  }

  const inputString = parsedinput2;
  cppContent =
    cppContent.slice(0, insertIndex + dummyLine.length) +
    "\n" +
    inputString +
    "\n" +
    cppContent.slice(insertIndex + dummyLine.length);
  fs.writeFileSync(cppFilePath, cppContent);
}

async function compileAndRunCpp() {
  const compile = () => {
    return new Promise((resolve, reject) => {
      exec("g++ bgrunner.cpp -o kkk.exe", (err, stdout, stderr) => {
        if (err) {
          reject(stderr);
        } else {
          resolve(stdout);
        }
      });
    });
  };

  const run = () => {
    return new Promise((resolve, reject) => {
      exec("kkk.exe", (err, stdout, stderr) => {
        if (err) {
          reject(stderr);
        } else {
          resolve(stdout);
        }
      });
    });
  };

  try {
    await compile(); // Wait for the compilation to complete
    const result = await run(); // Wait for the program to execute
    return result; // Return the program's output
  } catch (error) {
    return `error + ${error}`;
    //throw error; // Rethrow the error for the caller to handle
  }
}

async function testerfun(currentcode, parsedinput2) {
  await updateCppFile(currentcode, parsedinput2);

  let resp = await compileAndRunCpp();
  return resp;
}

//------------------Function Signature Parser-------------------

// function parseFunctionSignature(functionSignature) {
//   // Regex to extract the return type and parameter types
//   const regex = /([a-zA-Z0-9<>&\[\]]+)\s+([a-zA-Z0-9_]+)\s*\((.*)\)/;

//   // Match the function signature using regex
//   const match = functionSignature.match(regex);

//   if (!match) {
//     console.error("Invalid function signature");
//     return;
//   }

//   // Extract return type and parameters
//   const returnTypewithampercent = match[1]; // The return type is the first capture group
//   const funName = match[2]; // The function name is in the second capture group
//   const paramsStringwithampercent = match[3]; // The parameter types are in the third capture group
//   const returnType = returnTypewithampercent.replace("&", ""); // Remove the & symbol
//   const paramsString = paramsStringwithampercent.replace("&", ""); // Remove the & symbol
//   console.log("paramsString:", paramsString);
//   // Now, extract the parameter data types
//   const paramTypes = paramsString.split(",").map((param) => {
//     // Clean up spaces and extract only the data type part
//     const dataType = param.trim().split(" ")[0];
//     return dataType;
//   });

//   // Return the result as an object
//   return {
//     returnType,
//     paramTypes,
//     funName,
//   };
// }
