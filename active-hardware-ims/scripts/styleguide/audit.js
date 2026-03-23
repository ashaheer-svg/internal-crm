const fs = require('fs');
const path = require('path');

const DIRECTORY_TO_SCAN = path.join(__dirname, '../../app/dashboard');
const REPORT_OUTPUT = path.join(__dirname, '../../ui_inconsistency_report.md');

function getAllFiles(dirPath, arrayOfFiles) {
    let files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });
    return arrayOfFiles;
}

const files = getAllFiles(DIRECTORY_TO_SCAN);
const deviations = [];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Scan all JSX elements
    let searchIdx = 0;
    while (true) {
        // Tag lookups for structural elements
        const tagsToFind = ['button', 'Link', 'input', 'span', 'div'];
        let matchedTag = "";
        let startIdx = -1;
        
        for (const t of tagsToFind) {
            const idx = content.indexOf('<' + t, searchIdx);
            if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
                startIdx = idx;
                matchedTag = t;
            }
        }
        
        if (startIdx === -1) break;
        
        const endIdx = content.indexOf('>', startIdx);
        if (endIdx === -1) break;
        
        const tagContent = content.substring(startIdx, endIdx);
        
        // Match className attribute
        const classMatch = tagContent.match(/className=(?:["']|{[`"'])([\s\S]*?)(?:["']|[`"']})/i);
        
        if (classMatch) {
            const classes = classMatch[1];
            let reason = "";

            if (matchedTag === 'button' || matchedTag === 'Link') {
                if (classes.includes('rounded-xl')) reason = "Button uses overly rounded corners (`rounded-xl` instead of standard `rounded-lg`)";
                else if (classes.includes('font-bold')) reason = "Button uses heavy weight (`font-bold` instead of `font-medium`)";
                else if (classes.includes('px-6') && !classes.includes('sm:px')) reason = "Button padding is too wide (`px-6` inflated density)";
            } 
            else if (matchedTag === 'input') {
                if (classes.includes('rounded-xl')) reason = "Input uses non-standard heavy framing (`rounded-xl`)";
                else if (classes.includes('px-6')) reason = "Input padding is too wide (`px-6`)";
            }
            else if (matchedTag === 'span' && classes.includes('rounded-xl')) {
                reason = "Badge component uses heavy tracking framing (`rounded-xl` instead of full capsule or md pill)";
            }
            else if (matchedTag === 'div' && classes.includes('bg-white') && classes.includes('shadow') && classes.includes('rounded-xl')) {
                 reason = "Dashboard Card uses non-standard curvature (`rounded-xl` deviated layout container)";
            }

            if (reason) {
                const lineNumber = content.substring(0, startIdx).split('\n').length;
                deviations.push({
                    file: path.relative(path.join(__dirname, '../..'), file),
                    line: lineNumber,
                    tag: matchedTag,
                    classes: classes.replace(/\s+/g, ' ').trim(),
                    reason: reason
                });
            }
        }
        
        searchIdx = endIdx;
    }
});

let markdown = `# 🔍 UI Design Inconsistency Audit Report\n\n`;
markdown += `This report lists location benchmarks in the Next.js layouts tree where tag renders represent deviated assemblies.\n\n`;
markdown += `### Standard Guidelines References:\n`;
markdown += `- **Buttons**: \`rounded-lg\` with \`font-medium\` weights.\n`;
markdown += `- **Badges**: Standard pill or full rounded layouts capsules handles.\n`;
markdown += `- **Cards**: Outer frame guidelines represent standard padding grids boundaries.\n\n`;

markdown += `## 🚨 Found Issues (${deviations.length} items)\n\n`;

markdown += `| File Path | Line | Element | Inconsistency Reason | Classes found |\n`;
markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;

deviations.forEach(d => {
    markdown += `| \`${d.file}\` | \`${d.line}\` | \`<${d.tag}>\` | ${d.reason} | \`${d.classes}\` |\n`;
});

markdown += `\n\n_Generated via scripts/styleguide/audit.js_`;

fs.writeFileSync(REPORT_OUTPUT, markdown);
console.log(`✅ Audit completed! Found ${deviations.length} items regarding Buttons, Inputs, Cards, and Badges layout deviations.`);
