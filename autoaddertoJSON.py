import re


def fun(input_string):
  # Use regex to extract content between '**Input:' and '**Output:'
  match = re.search(r'\*\*Input:\*\*(.*?)\*\*Output:\*\*(.*?)$', input_string, re.DOTALL)

  if match:
      # Extract input and output sections
    input_content = match.group(1).strip()  # Content between Input and Output
    output_content = match.group(2).strip()  # Content after Output
    # Add 'auto' keyword to input content (you can modify this logic based on requirements)
    input_content = re.sub(r'(\w+)\s*=', r'auto \1 =', input_content)
    input_content+=";"
    output_content="auto expected = "+output_content+";"

    #print("Input with auto added:")
    print(input_content)
    #print("\nOutput:")
    print(output_content)
  else:
    print("No match found!")




