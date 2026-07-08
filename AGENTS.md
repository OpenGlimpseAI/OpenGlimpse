# Reasoning
Before writing any code, first, examine the folder structure, and any relevant files to understand the project. Read the PROJECT_DOCUMENTATION.md file, and update it with new information as you add new features or if any information is missing.
Next, look at the user’s query and reason through what needs to be done for it to be implemented, consult documentation before implementing anything, plan out a list of functions or other functionality you want to implement
Before implementing any code, look up for keywords of the code you want to implement from the previous step, and reuse the code rather than creating redundant functions
Finally, you can implement the code, ensure that the style guide is followed

# Coding Guide:
## General Style
Do not use excessive or aesthetic comments, keep comments and documentation to a minimal
Do not modify the README.md file, do not create any new files for documentation or any other purposes unless explicitly instructed to

## Client Side/ React Code
For client side code, ensure that all react components are properly split into components
Each reusable component should have its own file within its own module folder, any components that only need to be used within a component can be placed in that file

## Server Side / Node js Code
Any Express.js routing code should be places in the index.js file
Any module specific code must remain inside the module folder

Folder Structure:
Root directory
src/
client/
assets/
src/
components/
<one folder per module>
pages/
<one folder per module>
<vite configs>

	server/
		database/
		modules/
			<one folder per module>
	index.js
README.md
PROJECT_DOCUMENTATION.md
.gitignore
