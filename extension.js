//import { constrainedMemory } from "process";

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { DOMParser } = require("@xmldom/xmldom");

/**
 * @param {vscode.ExtensionContext} context
 */

const { exec } = require("child_process");

function activate(context) {
  console.log(
    'Congratulations, your extension "leetcode-test-case-extractor" is now active!'
  );

  //console.log(context.extensionPath);
  vscode.window.showInformationMessage(context.extensionPath);

  //------Side bar ka UI-UX

  const testCaseProvider = new TestCaseTreeProvider();
  vscode.window.registerTreeDataProvider("testCasesView", testCaseProvider);

  // Refresh the tree view when the active editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document.fileName.endsWith(".cpp")) {
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
  if (vscode.window.activeTextEditor?.document.fileName.endsWith(".cpp")) {
    testCaseProvider.currentCppFile =
      vscode.window.activeTextEditor.document.fileName;
    testCaseProvider.refreshviajson();
  }

  // Register a command to handle item click
  vscode.commands.registerCommand("testCasesView.itemClicked", (item) => {
    if (item.label === "Run Button") {
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
              console.log(`New HTML file detected: ${filePath}`);

              // Read the file asynchronously
              const htmlContent = await fs.promises.readFile(filePath, "utf-8");
              // Extract test cases
              const testcasesAndBoilerplate = extractTestCases(htmlContent);
              const testCases = testcasesAndBoilerplate.testCases;
              const boilerplate = testcasesAndBoilerplate.boilerplate;

              console.log("Boilerplate:", boilerplate);
              const iodatatypes = parseFunctionSignature(boilerplate);
              console.log("Function Signature:", iodatatypes);

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
              createProblemFiles(filename, boilerplate, testCases, iodatatypes);
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
    console.log("Test Case Data: Refreshing", tempdata);
    this.data = tempdata;
    this._onDidChangeTreeData.fire();
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  createTestCase(label, input, output, iodatatypes) {
    const testCase = new TreeItem(label, [
      new TreeItem(`Input: ${input}`, null, "editable"),
      new TreeItem(`Output: ${output}`, null, "editable"),
      //new TreeItem("Data Types: " + iodatatypes),
      new TreeItem(`Run Button`, null, iodatatypes),
      new TreeItem(`Result: NULL`, null, null),
      new TreeItem(`Delete`, null, "deleteTestCase"),
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
    const problemName = path.basename(this.currentCppFile, ".cpp");
    const testCaseFilePath = path.join(testCasesFolder, `${problemName}.json`);

    if (!fs.existsSync(testCaseFilePath)) {
      return []; // No test case file for the active .cpp
    }

    try {
      const fileContent = fs.readFileSync(testCaseFilePath, "utf-8");
      const testCaseData = JSON.parse(fileContent);
      console.log("Test Case Data: ", testCaseData);
      let tempdata = [];
      tempdata.push(new TreeItem("Add Test Case", null, "addTestCase"));
      tempdata.push(
        new TreeItem("Run All", null, testCaseData.testCases[0].iodatatypes) // bss iska reverse karna baaki hai
      );
      let saveButton = this.createSaveButton();
      tempdata.push(saveButton);
      for (let i = 1; i < testCaseData.testCases.length; i++) {
        console.log("Test Case Data: Rendering", testCaseData.testCases[i]);
        console.log(
          "Test Case Data: Rendering",
          testCaseData.testCases[i].input
        );
        console.log(
          "Test Case Data: Rendering",
          testCaseData.testCases[i].output
        );
        tempdata.push(
          this.createTestCase(
            `TC ${i}`,
            testCaseData.testCases[i].input,
            testCaseData.testCases[i].output,
            testCaseData.testCases[i].iodatatypes
          )
        );
        console.log("Test Case Data: Rendered : ", testCaseData.testCases[i]);
      }
      return tempdata || [];
      //return testCaseData.testCases || [];
    } catch (err) {
      console.error("Error reading test case file:", err);
      vscode.window.showErrorMessage("Error reading test case file.");
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
    const problemName = path.basename(this.currentCppFile, ".cpp");
    const testCaseFile = path.join(testCasesFolder, `${problemName}.json`);
    let testCaseDatajson = { testCases: [] };
    let testCaseData = [];
    const runAllButton = this.data[1];
    testCaseData.push({
      iodatatypes: runAllButton.contextValue, //from runall button
      input: "a=-1",
      output: "b=-1",
    });

    //now iterate over all test cases
    for (let i = 3; i < this.data.length; i++) {
      const testCase = this.data[i];
      const input = testCase.children[0].label.replace("Input: ", "").trim();
      const output = testCase.children[1].label.replace("Output: ", "").trim();
      const iodatatypes = testCase.children[2].contextValue;
      testCaseData.push({
        iodatatypes: iodatatypes,
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
    //this.refresh();
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
    const input = testCase.children[0].label.split(":")[1].trim();
    const output = testCase.children[1].label.split(":")[1].trim();
    const iodatatypes = testCase.children[2].contextValue;
    const paramTypes = iodatatypes.paramTypes;
    const returnType = iodatatypes.returnType;
    const funName = iodatatypes.funName;
    console.log("Pressed Run Button");
    console.log("Input: ", input);
    console.log("Output: ", output);
    console.log("IODatatypes: ", iodatatypes);
    console.log("paramtypes", paramTypes);
    console.log("returntypes  ", returnType);

    let parsedInputandvariblenames = parseAndFormat(input, paramTypes);
    let parsedInput = parsedInputandvariblenames.formattedCode;
    let variableNames = parsedInputandvariblenames.variables;
    let parsedOutput = parseOutput(output, returnType);
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
      let resp = await testerfun(
        cppContent,
        parsedInput,
        parsedOutput,
        variableNames,
        funName
      );

      if (resultChild) {
        //const isPass = 0;
        //let input = testCase.children[0].label.split(":")[1].trim();
        //let output = testCase.children[1].label.split(":")[1].trim();
        // console.log("Input: ", input);
        // console.log("Output: ", output);
        console.log("Result recieved : ", resp);

        resultChild.label = "Result : " + resp;
        this.refresh();
      }
    } else {
      vscode.window.showErrorMessage("No active file detected.");
    }

    // if (resultChild) {
    //   const isPass = 0;
    //   //let input = testCase.children[0].label.split(":")[1].trim();
    //   //let output = testCase.children[1].label.split(":")[1].trim();
    //   // console.log("Input: ", input);
    //   // console.log("Output: ", output);

    //   resultChild.label = `Result: ${isPass ? "Pass" : "Fail"}`;
    //   this.refresh();
    // }
  }

  // Method to run all test cases
  async runAllTests() {
    for (const testCase of this.data) {
      if (testCase.children) {
        console.log("Running test case:", testCase.label);
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

function parseAndFormat(input, paramTypes) {
  let variableNames = [];

  const regex = /(\w+)\s*=/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    variableNames.push(match[1]);
  }

  // Control flags and counters
  let result = "";
  let idx = 0;
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
        result += paramTypes[idx] + " ";
        idx += 1;
        canInsertAuto = false;
      }
    }
    result += char;
  }
  result += " ;";

  console.log("returning formattedcode : ", result);
  console.log("returning Variable Names: ", variableNames);
  return {
    variables: variableNames,
    formattedCode: result,
  };
}

function parseOutput(outputString, returnType) {
  let result = "";
  let insideString = false;

  for (let i = 0; i < outputString.length; i++) {
    const char = outputString[i];
    if (char === '"' || char === "'") {
      insideString = !insideString;
    }

    if (!insideString) {
      if (char === "[") {
        result += "{";
        continue;
      } else if (char === "]") {
        result += "}";
        continue;
      }
    }
    result += char;
  }

  let outputContent = returnType + "  expected = " + result.trim() + ";";
  return outputContent;
}
//-----------For extracting test cases from LeetCode-like HTML content---------------------------------------

function extractTestCases(html) {
  console.log("Entered function...");

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  console.log("Parsed HTML document:");
  console.log(doc);

  const testCases = [];

  // Extract test cases
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
    const strongElement = element;
    const text = strongElement.textContent?.trim();

    console.log("Element Text:", text);

    if (text === "Input:") {
      let inputText = strongElement.nextSibling?.textContent?.trim();
      console.log("Found Input Text:", inputText);
      if (inputText) {
        currentInput = inputText;
      } else {
        const inputSpan =
          strongElement.parentNode?.getElementsByTagName("span")[0];
        console.log("Input Span:", inputSpan);
        currentInput = inputSpan?.textContent;
      }
    } else if (text === "Output:" && currentInput) {
      let outputText = strongElement.nextSibling?.textContent?.trim();
      console.log("Found Output Text:", outputText);
      if (outputText) {
        testCases.push({ input: currentInput, output: outputText });
        currentInput = null; // Reset for the next case
      } else {
        const outputSpan =
          strongElement.parentNode?.getElementsByTagName("span")[0];

        console.log("Output Span:", outputSpan);

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

  if (!boilerplateText) {
    console.log("Boilerplate container not found.");
  }

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

function saveTestCasesToFile(testCases, filename) {
  // baad mei use karunga ise
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

async function createProblemFiles(
  problemName,
  templateCode,
  testCases,
  iodatatypes
) {
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
    iodatatypes: iodatatypes,
    input: "a=-1",
    output: "b=-1",
  });

  // Add the actual test cases
  testCases.forEach((testCase) => {
    testCaseData.testCases.push({
      iodatatypes: iodatatypes,
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
    vscode.window.vscode.window.showTextDocument(doc);
  });
}

//---------------------------------------------Compile and run------------------------------------------------
// Function to write the parsed content to bgrunner.cpp
async function updateCppFile(
  currentcode,
  parsedInput,
  parsedOutput,
  inputVariables,
  funName
) {
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
  // const funCall = `fun(${inputVariables.join(", ")});`;
  const nxtline = `if (expected == krish.${funName}(${inputVariables.join(
    ", "
  )}))`;
  //if (expectedoutput == fun(nums, val))

  // Insert the parsed input and output and the function call
  cppContent =
    cppContent.slice(0, insertIndex + "// add your code here".length) +
    "\n" +
    inputString +
    "\n" +
    outputString +
    "\n" +
    "Solution krish;\n" +
    nxtline +
    cppContent.slice(insertIndex + "// add your code here".length);

  // Write the updated content back to the C++ file
  fs.writeFileSync(cppFilePath, cppContent);

  console.log(
    "Updated bgrunner.cpp with parsed input, output, and function call"
  );
}

async function compileAndRunCpp() {
  console.log("Entered Compile and Run function");

  // Compile the C++ file
  const compile = () => {
    return new Promise((resolve, reject) => {
      exec("g++ bgrunner.cpp -o kkk.exe", (err, stdout, stderr) => {
        if (err) {
          console.error(`Error compiling: ${stderr}`);
          reject(stderr);
        } else {
          console.log("C++ code compiled successfully!");
          resolve(stdout);
        }
      });
    });
  };

  // Run the compiled executable
  const run = () => {
    return new Promise((resolve, reject) => {
      exec("kkk.exe", (err, stdout, stderr) => {
        if (err) {
          console.error(`Error running C++ code: ${stderr}`);
          reject(stderr);
        } else {
          console.log(`C++ Output: ${stdout}`);
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
    console.error("Error during compile and run:", error);
    throw error; // Rethrow the error for the caller to handle
  }
}

// Function to restore the original content from bgrunnerpermanent.cpp to bgrunner.cpp
async function restoreOriginalCpp() {
  // Read the content of bgrunnerpermanent.cpp
  // const path =
  const permanentCpp = fs.readFileSync("./bgrunnerpermanent.cpp", "utf8");

  // Write the original content back to bgrunner.cpp
  fs.writeFileSync("./bgrunner.cpp", permanentCpp);

  console.log("Restored bgrunner.cpp to its original state.");
}

async function testerfun(
  currentcode,
  parsedInput,
  parsedOutput,
  inputVariables,
  funName
) {
  console.log("Kuch nhi kiya");
  console.log("Restoring stated");
  await restoreOriginalCpp();
  console.log("restoring ended");
  console.log("updating started");
  await updateCppFile(
    currentcode,
    parsedInput,
    parsedOutput,
    inputVariables,
    funName
  );
  console.log("updating end");
  console.log("compile and run start");
  let resp = await compileAndRunCpp();
  console.log("compiled -- ", resp);
  return resp;
  // setTimeout(() => {
  //   restoreOriginalCpp();
  // }, 500);
}

//------------------Function Signature Parser-------------------

function parseFunctionSignature(functionSignature) {
  // Regex to extract the return type and parameter types
  const regex = /([a-zA-Z0-9<>&\[\]]+)\s+([a-zA-Z0-9_]+)\s*\((.*)\)/;

  // Match the function signature using regex
  const match = functionSignature.match(regex);

  if (!match) {
    console.error("Invalid function signature");
    return;
  }

  // Extract return type and parameters
  const returnTypewithampercent = match[1]; // The return type is the first capture group
  const funName = match[2]; // The function name is in the second capture group
  const paramsStringwithampercent = match[3]; // The parameter types are in the third capture group
  const returnType = returnTypewithampercent.replace("&", ""); // Remove the & symbol
  const paramsString = paramsStringwithampercent.replace("&", ""); // Remove the & symbol
  console.log("paramsString:", paramsString);
  // Now, extract the parameter data types
  const paramTypes = paramsString.split(",").map((param) => {
    // Clean up spaces and extract only the data type part
    const dataType = param.trim().split(" ")[0];
    return dataType;
  });

  // Return the result as an object
  return {
    returnType,
    paramTypes,
    funName,
  };
}
