# Leetcode Testcases Extractor VSCode Extension
#### [Demo Video link](https://www.youtube.com/watch?v=1t02cNeGKcY&t=209s)

## Introduction

The Leetcode Testcases Extractor is a powerful Visual Studio Code extension designed to streamline the process of working with test cases for Leetcode problems. For added convenience, a Chrome extension has also been developed, allowing users to bypass the hassle of copying and pasting Leetcode problem links. 

With an intuitive GUI and robust features, this extension simplifies test case management, making it an essential tool for competitive programmers and Leetcode enthusiasts.

---

## Features

### Seamless Test Case Management
- **Extract Test Cases from Leetcode Problems**: Quickly extract test cases directly from Leetcode problems.
- **Dynamic Test Case Display**: Automatically updates the test cases to match the currently active `.cpp` file, ensuring you always see relevant test cases.

### Intuitive GUI
- Open the test case extension from the sidebar, easily identifiable by its **smiley logo**.
- User-friendly interface for managing test cases, including:
  - **Run Single Test Case**
  - **Run All Test Cases**
  - **Edit Test Case**
  - **Delete Test Case**
  - **Add New Test Case**

### Persistent Storage
- Test cases are stored in a `.json` file, ensuring all modifications are saved.
- Changes remain persistent even after closing and reopening Visual Studio Code.

### Chrome Extension Integration
- Simplified workflow with a Chrome extension that eliminates the need to manually paste Leetcode problem links.

---

## Detailed Description of How It Works

1. **Opening the Leetcode Problem Page**:
   - The user opens a Leetcode problem page in their browser.

2. **Triggering the Chrome Extension**:
   - With the Chrome extension installed, the user clicks the "Let's Code" button.
   - If the page is indeed a Leetcode problem, the HTML of the problem is downloaded to the user's system.

3. **Triggering the VS Code Extension**:
   - The VS Code extension is automatically triggered as soon as the problem's HTML is downloaded.

4. **Selecting the Desired Language**:
   - The extension prompts the user to select their preferred programming language.

5. **Parsing the Problem Data**:
   - The HTML file is parsed to extract the test cases and boilerplate code.
   - A new file is created based on the problem's name, corresponding to the selected language.
   - Boilerplate code is added to the file, and the test cases are stored in a `.json` file.

6. **CRUD Operations on Test Cases**:
   - All standard CRUD operations are supported, including:
     - **Add New Test Case**
     - **Edit Existing Test Case**
     - **Delete Test Case**
     - **View Test Case**
   - The test cases are managed through a dedicated GUI accessible via the sidebar.

7. **Responsive Test Case Updates**:
   - As the user switches between different problems, the displayed test cases dynamically update to match the active problem.

8. **Executing Test Cases**:
   - Users can run single or multiple test cases, with results and outputs displayed in real-time.

9. **File Naming**:
   - The names of all files (code and test case files) correspond to the problem name to ensure consistency (file renaming is not currently supported).

10. **GUI Highlights**:
    - A sleek and responsive interface ensures ease of use.
    - Test case results and outputs are clearly shown after running.

---

**Enjoy hassle-free test case management!**

