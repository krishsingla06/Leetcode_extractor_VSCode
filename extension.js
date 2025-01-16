const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { DOMParser } = require("@xmldom/xmldom");
let allowedLanguages = ["cpp", "py"];

/**
 * @param {vscode.ExtensionContext} context
 */

const { exec } = require("child_process");

function activate(context) {
  console.log(
    'Congratulations, your extension "leetcode-test-case-extractor" is now active!'
  );

  vscode.window.showInformationMessage(context.extensionPath);

  const testCaseProvider = new TestCaseTreeProvider();
  vscode.window.registerTreeDataProvider("testCasesView", testCaseProvider);

  // Refresh the tree view when the active editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      if (
        allowedLanguages.includes(editor.document.fileName.split(".").pop())
      ) {
        testCaseProvider.currentCppFile = editor.document.fileName;
        testCaseProvider.refreshviajson();
      } else {
        testCaseProvider.currentCppFile = null;
        testCaseProvider.data = [
          new TreeItem(`Extension allows languages: ${allowedLanguages}`),
        ];
        testCaseProvider.refresh();
      }
    }
  });

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
  if (vscode.window.activeTextEditor) {
    if (
      allowedLanguages.includes(
        vscode.window.activeTextEditor.document.fileName.split(".").pop()
      )
    ) {
      testCaseProvider.currentCppFile =
        vscode.window.activeTextEditor.document.fileName;
      testCaseProvider.refreshviajson();
    } else {
      testCaseProvider.currentCppFile = null;
      testCaseProvider.data = [
        new TreeItem(`Extension allows languages: ${allowedLanguages}`),
      ];
      testCaseProvider.refresh();
    }
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
              // Show test cases in the output channel
              // const outputChannel =
              //   vscode.window.createOutputChannel("Test Cases");
              // outputChannel.show();
              // testCases.forEach((testCase, index) => {
              //   outputChannel.appendLine(`Test Case ${index + 1}:`);
              //   outputChannel.appendLine(`  Input: ${testCase.input}`);
              //   outputChannel.appendLine(`  Output: ${testCase.output}`);
              // });
              //ask for language
              let problemName = filename.replace(".html", "");
              // also remove last (1) type of thing
              problemName = filename.replace(/\s*\(.*\)/, "");

              const selectedLanguage = await vscode.window.showQuickPick(
                ["cpp", "py"], // Options
                {
                  placeHolder: `Select the language for problem ${problemName}`, // Placeholder text
                  canPickMany: false, // Ensure only one option can be selected
                  ignoreFocusOut: true, // Keep the picker open when focus is lost
                }
              );

              if (selectedLanguage === undefined) {
                vscode.window.showErrorMessage(
                  "No language selected. Please try again."
                );
                return;
              }
              let initialLanguage = selectedLanguage;

              createProblemFiles(
                filename,
                boilerplate,
                testCases,
                initialLanguage
              );
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

    // extension of current opened file
    let selectedLanguage = this.currentCppFile.split(".").pop();

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
      for (let i = 0; i < testCaseData.testCases.length; i++) {
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
      vscode.window.showErrorMessage(`No active file to save test cases.`);
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      vscode.window.showErrorMessage("No workspace folder is open.");
      return [];
    }

    const testCasesFolder = path.join(workspaceFolder, "test_cases");
    let selectedLanguage = this.currentCppFile.split(".").pop();
    const problemName = path.basename(
      this.currentCppFile,
      `${selectedLanguage}`
    );
    const testCaseFile = path.join(testCasesFolder, `${problemName}json`);
    let testCaseDatajson = { testCases: [] };
    let testCaseData = [];

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

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const cppContent = activeEditor.document.getText();
      const selectedLanguage = activeEditor.document.fileName.split(".").pop();
      let parsedinput2 = await parseAndFormat2(input, selectedLanguage);
      let parsedOutput2 = await parseOutput2(output);
      let resp = await testerfun(cppContent, parsedinput2, selectedLanguage);

      let resp2;

      if (resp.includes("error")) {
        resp2 = "Test Failed";
      } else {
        await resp.replace("\n", " ");
        await resp.replace("\r", " ");
        await resp.replace("\t", " ");
        await resp.replace("\v", " ");
        //replace new lines endlines and tabs

        console.log("resp : " + resp);
        console.log("parsedOutput2 : " + parsedOutput2);

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

function parseAndFormat2(input, selectedLanguage) {
  let result = "";
  let canInsertAuto = true;
  let canChangeComma = true;
  let arrayDepth = 0;
  let insideString = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' || char === "'") {
      insideString = !insideString;
      canChangeComma = !insideString;
    }

    if (!insideString) {
      if (char === "[") {
        arrayDepth++;
        if (arrayDepth === 1) {
          canChangeComma = false;
        }
        result += selectedLanguage === "py" ? "[" : "{";
        continue;
      } else if (char === "]") {
        //result += "}";
        result += selectedLanguage === "py" ? "]" : "}";
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
        canInsertAuto = false;
      }
    }
    result += char;
  }
  result += " ;";
  return result;
}

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
        char === " " ||
        char === "'" ||
        char === '"'
      ) {
        continue;
      }
      if (char == ",") {
        result += " ";
        continue;
      }
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

  const elements = Array.from(doc.getElementsByTagName("div"));

  let boilerplateText = "";

  elements.forEach((element) => {
    if (
      element.getAttribute("class") === "view-lines monaco-mouse-cursor-text"
    ) {
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

async function createProblemFiles(
  problemName,
  templateCode,
  testCases,
  initialLanguage = "cpp"
) {
  let selectedLanguage = initialLanguage;
  problemName = problemName.replace(".html", "");
  // also remove last (1) type of thing
  problemName = problemName.replace(/\s*\(.*\)/, "");
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  // File paths
  const cppFilePath = path.join(
    workspaceFolder,
    `${problemName}.${selectedLanguage}`
  );
  const testCaseFolder = path.join(workspaceFolder, "test_cases");
  const testCaseFilePath = path.join(testCaseFolder, `${problemName}.json`);

  // Ensure test_cases folder exists
  if (!fs.existsSync(testCaseFolder)) {
    await fs.mkdirSync(testCaseFolder);
  }

  // Create .cpp file

  let extratemp =
    selectedLanguage === "cpp"
      ? `
  #include <bits/stdc++.h>
  using namespace std;
  
  //You can't change class name and funtion name\n
  `
      : "";
  const cppTemplate = extratemp + templateCode;
  //if file already exists, then don't overwrite it

  if (fs.existsSync(cppFilePath)) {
    vscode.window.showErrorMessage(
      `File ${cppFilePath} already exists. Please delete it and try again.`
    );
    return;
  } else {
    await fs.writeFileSync(cppFilePath, cppTemplate.trim());
  }

  let testCaseData = {
    testCases: [],
  };

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
async function updateCppFile(currentcode, parsedinput2, selectedLanguage) {
  const cppFilePath = `./bgrunner.${selectedLanguage}`;

  let dummyLine = "// krish";

  if (selectedLanguage === "py") {
    dummyLine = "# krish";
  }

  let cppContent = currentcode;

  const insertIndex = cppContent.indexOf(dummyLine);

  if (insertIndex === -1) {
    fs.writeFileSync(cppFilePath, cppContent);
    vscode.window.showErrorMessage(
      `Couldn't find the comment line in bgrunner.${selectedLanguage}. Please add the comment line ${dummyLine} in the file.`
    );
    return;
  }

  const inputString = parsedinput2;
  cppContent =
    cppContent.slice(0, insertIndex) +
    "\n" +
    inputString +
    "\n" +
    cppContent.slice(insertIndex + dummyLine.length);
  fs.writeFileSync(cppFilePath, cppContent);
}

async function compileAndRunCpp(selectedLanguage) {
  const compile = () => {
    return new Promise((resolve, reject) => {
      if (selectedLanguage === "py") {
        resolve("Python does not require compilation.");
      } else if (selectedLanguage == "cpp") {
        let execstring = "g++ bgrunner.cpp -o kkk.exe";
        exec(execstring, (err, stdout, stderr) => {
          if (err) {
            reject(stderr);
          } else {
            resolve(stdout);
          }
        });
      } else {
        reject("Unsupported language.");
      }
    });
  };

  const run = () => {
    return new Promise((resolve, reject) => {
      if (selectedLanguage == "cpp") {
        exec("kkk.exe", (err, stdout, stderr) => {
          if (err) {
            reject(stderr);
          } else {
            resolve(stdout);
          }
        });
      } else if (selectedLanguage == "py") {
        const execstring = "python bgrunner.py";
        exec(execstring, (err, stdout, stderr) => {
          if (err) {
            reject(`Execution error: ${stderr}`);
          } else {
            resolve(stdout);
          }
        });
      } else {
        reject("Unsupported language.");
      }
    });
  };

  try {
    await compile(); // Wait for the compilation to complete
    const result = await run(); // Wait for the program to execute
    return result; // Return the program's output
  } catch (error) {
    return `error : ${error}`;
  }
}

async function testerfun(currentcode, parsedinput2, selectedLanguage = "cpp") {
  await updateCppFile(currentcode, parsedinput2, selectedLanguage);

  let resp = await compileAndRunCpp(selectedLanguage);
  return resp;
}
