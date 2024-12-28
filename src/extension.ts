// // // // The module 'vscode' contains the VS Code extensibility API
// // // // Import the module and reference it with the alias vscode in your code below
// // // import * as vscode from 'vscode';

// // // // This method is called when your extension is activated
// // // // Your extension is activated the very first time the command is executed
// // // export function activate(context: vscode.ExtensionContext) {

// // // 	// Use the console to output diagnostic information (console.log) and errors (console.error)
// // // 	// This line of code will only be executed once when your extension is activated
// // // 	console.log('Congratulations, your extension "html-parser" is now active!');

// // // 	// The command has been defined in the package.json file
// // // 	// Now provide the implementation of the command with registerCommand
// // // 	// The commandId parameter must match the command field in package.json
// // // 	const disposable = vscode.commands.registerCommand('html-parser.helloWorld', () => {
// // // 		// The code you place here will be executed every time your command is executed
// // // 		// Display a message box to the user
// // // 		vscode.window.showInformationMessage('Hello World from html parser!');
// // // 	});

// // // 	context.subscriptions.push(disposable);
// // // }

// // // // This method is called when your extension is deactivated
// // // export function deactivate() {}
// // import * as vscode from "vscode";
// // import * as fs from "fs";
// // import * as path from "path";
// // import * as cheerio from "cheerio";

// // export function activate(context: vscode.ExtensionContext) {
// //   let disposable = vscode.commands.registerCommand(
// //     "extension.readLeetCodeHtml",
// //     async () => {
// //       // Show file picker to select the saved HTML file
// //       const fileUri = await vscode.window.showOpenDialog({
// //         canSelectMany: false,
// //         openLabel: "Open HTML File",
// //         filters: {
// //           "HTML Files": ["html"],
// //         },
// //       });

// //       if (!fileUri || fileUri.length === 0) {
// //         vscode.window.showErrorMessage("No file selected");
// //         return;
// //       }

// //       // Read the HTML file
// //       const filePath = fileUri[0].fsPath;
// //       fs.readFile(filePath, "utf8", (err, data) => {
// //         if (err) {
// //           vscode.window.showErrorMessage("Error reading file: " + err.message);
// //           return;
// //         }

// //         // Parse HTML using Cheerio
// //         const $ = cheerio.load(data);

// //         // Extract the title or description (or any other text you want)
// //         const title = $("h1").text(); // Assuming the title is inside an <h1> tag
// //         const description = $('div[data-cy="question-description"]').text(); // Assuming description is here
// //         console.log("hello");
// //         console.log("Title:", title);
// //         console.log("Description:", description);

// //         // Show extracted text in a VSCode WebView
// //         const panel = vscode.window.createWebviewPanel(
// //           "leetCodeHtmlPreview", // View type
// //           "LeetCode Problem", // Title
// //           vscode.ViewColumn.One, // Show in the first column
// //           {} // Webview options
// //         );

// //         // Provide HTML content to WebView
// //         panel.webview.html = `<h1>${title}</h1><p>${description}</p>`;
// //       });
// //     }
// //   );

// //   context.subscriptions.push(disposable);
// // }

// // export function deactivate() {}

// import * as vscode from "vscode";
// import * as fs from "fs";
// import * as path from "path";
// import * as cheerio from "cheerio";

// export function activate(context: vscode.ExtensionContext) {
//   let disposable = vscode.commands.registerCommand(
//     "extension.readLeetCodeHtml",
//     async () => {
//       // Show file picker to select the saved HTML file
//       const fileUri = await vscode.window.showOpenDialog({
//         canSelectMany: false,
//         openLabel: "Open HTML File",
//         filters: {
//           "HTML Files": ["html"],
//         },
//       });

//       if (!fileUri || fileUri.length === 0) {
//         vscode.window.showErrorMessage("No file selected");
//         return;
//       }

//       // Read the HTML file
//       const filePath = fileUri[0].fsPath;
//       fs.readFile(filePath, "utf8", (err, data) => {
//         if (err) {
//           vscode.window.showErrorMessage("Error reading file: " + err.message);
//           return;
//         }

//         // Parse HTML using Cheerio
//         const $ = cheerio.load(data);

//         // Extract the title or description (or any other text you want)
//         const title = $("h1").text(); // Assuming the title is inside an <h1> tag
//         const description = $('div[data-cy="question-description"]').text(); // Assuming description is here

//         // Log the extracted content for debugging
//         console.log("Title:", title);
//         console.log("Description:", description);

//         // Show extracted text in a VSCode WebView
//         const panel = vscode.window.createWebviewPanel(
//           "leetCodeHtmlPreview", // View type
//           "LeetCode Problem", // Title
//           vscode.ViewColumn.One, // Show in the first column
//           {} // Webview options
//         );

//         // Provide HTML content to WebView, with fallbacks
//         panel.webview.html = `
//                 <html>
//                     <body>
//                         <h1>${title || "No Title Found"}</h1>
//                         <p>${description || "No Description Found"}</p>
//                     </body>
//                 </html>
//             `;
//       });
//     }
//   );

//   context.subscriptions.push(disposable);
// }

// export function deactivate() {}

import * as vscode from "vscode";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.readLeetCodeHtml",
    async () => {
      // Show file picker to select the saved HTML file
      const fileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: "Open HTML File",
        filters: {
          "HTML Files": ["html"],
        },
      });

      if (!fileUri || fileUri.length === 0) {
        vscode.window.showErrorMessage("No file selected");
        return;
      }

      // Read the HTML file
      const filePath = fileUri[0].fsPath;
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          vscode.window.showErrorMessage("Error reading file: " + err.message);
          return;
        }

        // Create WebView to display the HTML content
        const panel = vscode.window.createWebviewPanel(
          "leetCodeHtmlPreview", // View type
          "LeetCode Problem", // Title
          vscode.ViewColumn.One, // Show in the first column
          {} // Webview options
        );

        // Set the entire HTML content in the WebView
        panel.webview.html = `
                <html>
                    <head><title>LeetCode Problem</title></head>
                    <body>
                        <h1>Complete HTML Content</h1>
                        <pre>${data}</pre>
                    </body>
                </html>
            `;
      });
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
