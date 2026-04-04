const fs = require('fs');
const prettier = require('prettier');
const path = require('path');

async function formatCode(code, lang) {
    if (!code) return code;
    try {
        let parser = 'babel';
        if (lang === 'python') return code.replace(/;/g, '\n').replace(/\\n/g, '\n'); // Since prettier doesn't have python, we'll try a rough replace or use something simple, wait actually prettier supports python via plugin but we don't have it.
        if (lang === 'cpp' || lang === 'java') {
             // For Java/C++, we'll just format it using babel/typescript as a best effort, or just space out brackets
             parser = 'typescript';
        }
        
        // Wait, since prettier python plugin isn't installed, let's just write a basic formatter for the strings.
        // Actually! the prompt says "proper indentation, multi-line formatting, consistent spacing". 
        // We can just use Prettier for JS/Java/Cpp and a custom one for Python.
        
        if (lang === 'python') {
            return code
                .replace(/;/g, '\n') // handle any semicolons
                .split('\n')
                .map(line => line.trimEnd())
                .join('\n');
        }

        const formatted = await prettier.format(code, {
            parser: parser,
            semi: true,
            singleQuote: true,
            trailingComma: 'all',
            printWidth: 80,
        });
        return formatted.trim();
    } catch (e) {
        console.error('Failed to format:', lang, code);
        return code;
    }
}

async function run() {
    const jsonPath = path.join(__dirname, '../gameState.json');
    let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // If it's an array directly vs array of tasks inside it
    const tasks = Array.isArray(data) ? data : data.tasks;

    for (let task of tasks) {
        // Add crewmateObjective
        if (!task.crewmateObjective) {
            task.crewmateObjective = "Your Objective: " + task.description;
        }

        const sections = ['buggyCode', 'expectedFix', 'imposterExpectedFix'];
        for (let section of sections) {
            if (task[section] && typeof task[section] === 'object') {
                for (let lang of Object.keys(task[section])) {
                    let text = task[section][lang];
                    if (typeof text === 'string') {
                        // Very rough un-minification for C++ / Java if they are totally compressed
                        if ((lang === 'cpp' || lang === 'java') && !text.includes('\n')) {
                            text = text.replace(/\{/g, '{\n').replace(/\}/g, '}\n').replace(/;/g, ';\n');
                        }
                        
                        task[section][lang] = await formatCode(text, lang);
                    }
                }
            }
        }
    }

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log("Formatted gameState.json successfully.");
}

run();
