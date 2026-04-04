const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../gameState.json');
try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawData);

    function beautify(code) {
        if (typeof code !== 'string') return code;
        
        // Normalize: Replace \n and related sequences first if they are literal
        let s = code;
        
        // Remove weird whitespace-only lines
        s = s.split('\n').filter(l => l.trim().length > 0).join('\n');

        const lines = s.split('\n');
        let indent = 0;
        const result = lines.map(line => {
            let trimmed = line.trim();
            
            // Adjust indent before line
            if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
                indent = Math.max(0, indent - 1);
            }
            
            const formatted = '    '.repeat(indent) + trimmed;
            
            // Adjust indent after line
            const open = (trimmed.match(/\{|\[|\(/g) || []).length;
            const close = (trimmed.match(/\}|\]|\)/g) || []).length;
            indent += (open - close);
            
            return formatted;
        }).join('\n');
        
        return result;
    }

    const processed = data.map(task => {
        const fields = ['buggyCode', 'expectedFix', 'imposterExpectedFix'];
        fields.forEach(f => {
            if (task[f]) {
                for (const lang in task[f]) {
                    task[f][lang] = beautify(task[f][lang]);
                }
            }
        });
        return task;
    });

    fs.writeFileSync(filePath, JSON.stringify(processed, null, 2), 'utf8');
    console.log('DONE');
} catch (err) {
    console.error(err);
}
