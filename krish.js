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
  return {
    variables: variableNames,
    formattedCode: result,
  };
}

// Example usage
const input =
  'height = [1,8,6,2,5,4,8,3,7] , s = "hello" , a = 3 , b = \'c\' , arr = [[3,4] , [4,6]] , str = "[]{}()" , arr2 = [[3,5]],arr3=[[[3,4]]]';
const result = parseAndFormat(input);

console.log("Extracted Variables:", result.variables);
console.log("Formatted Code:", result.formattedCode);

// function parseAndFormat(input) {
//   // Step 1: Extract all variable names
//   const variableNames = [];
//   const regex = /(\w+)\s*=/g; // Matches variable names followed by '='
//   let match;
//   while ((match = regex.exec(input)) !== null) {
//     variableNames.push(match[1]);
//   }

//   // Step 2: Replace square brackets with curly braces for arrays (not strings)
//   const processedInput = input
//     .replace(/(\w+)\s*=\s*(\[\[.*?\]\])/g, (_, varName, arrayContent) => {
//       // Replace square brackets with curly braces only inside 2D arrays
//       const transformedArray = arrayContent
//         .replace(/\[\[/g, "{{")
//         .replace(/\]\]/g, "}}")
//         .replace(/\[/g, "{")
//         .replace(/\]/g, "}");
//       return `${varName} = ${transformedArray}`;
//     })
//     .replace(/(\w+)\s*=\s*(\[.*?\])/g, (_, varName, arrayContent) => {
//       // Replace square brackets with curly braces only inside 1D arrays
//       const transformedArray = arrayContent
//         .replace(/\[/g, "{")
//         .replace(/\]/g, "}");
//       return `${varName} = ${transformedArray}`;
//     });

//   // Step 3: Insert 'auto' keyword before each variable declaration
//   const formattedCode = processedInput.replace(/(\w+)\s*=/g, "auto $1 =");

//   // Step 4: Replace commas separating variables with semicolons, but ignore commas inside arrays
//   const finalOutput = formattedCode.replace(/,([^{}[\]]*?auto)/g, " ; $1");

//   return {
//     variables: variableNames,
//     formattedCode: finalOutput,
//   };
// }

// // Example usage
// const input =
//   'height = [1,8,6,2,5,4,8,3,7] , s = "hello" , a = 3 , b = \'c\' , arr = [[3,4] , [4,6]] , str = "[]{}()" , arr2 = [[3,5]],arr3=[[[3,4]]]';
// const result = parseAndFormat(input);

// console.log("Extracted Variables:", result.variables);
// console.log("Formatted Code:", result.formattedCode);
