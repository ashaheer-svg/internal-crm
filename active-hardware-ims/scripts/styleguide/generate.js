const fs = require('fs');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const OUTPUT_HTML = path.join(__dirname, 'ui-catalog.html');
const OUTPUT_REPORT = path.join(__dirname, '../../ui_inconsistency_report.md');
const DIRECTORY_TO_SCAN = path.join(__dirname, '../../app/dashboard');

const UI_SPEC = {
    Title: "Active Hardware IMS - Design Language",
    Colors: [
        { name: "Background", token: "var(--background)", hex: "#ffffff / #0f172a", usage: "Main Page Canvas" },
        { name: "Sidebar Background", token: "var(--chrome-sidebar-bg)", hex: "#111827", usage: "Navigation Column layout background" },
        { name: "Brand Primary", token: "bg-blue-600", hex: "#2563eb", usage: "High emphasis action items, workflow tags" }
    ],
    Typography: [
        { name: "Main Title", classes: "text-3xl font-extrabold tracking-tight", description: "Cockpit Page Title labels" },
        { name: "Sub Title", classes: "text-lg font-bold text-gray-900", description: "Standard card section headings" }
    ]
};

// ── 1. AUDIT / SCRAPE LOGIC ─────────────────────────────────────────────────
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
    let searchIdx = 0;
    const tagsToFind = ['button', 'Link', 'input', 'span', 'div'];

    while (true) {
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
        const classMatch = tagContent.match(/className=(?:["']|{[`"'])([\s\S]*?)(?:["']|[`"']})/i);
        
        if (classMatch) {
            const classes = classMatch[1];
            let reason = "";

            if (matchedTag === 'button' || matchedTag === 'Link') {
                if (classes.includes('rounded-xl')) reason = "Button uses overly rounded corners (`rounded-xl` instead of standard `rounded-lg`)";
                else if (classes.includes('font-bold')) reason = "Button uses heavy weight (`font-bold` instead of `font-medium`)";
                else if (classes.includes('px-6') && !classes.includes('sm:px')) reason = "Button padding is too wide (`px-6` inflated)";
            } 
            else if (matchedTag === 'input' && classes.includes('rounded-xl')) {
                reason = "Input uses non-standard heavy framing (`rounded-xl`)";
            }
            else if (matchedTag === 'span' && classes.includes('rounded-xl')) {
                reason = "Badge component uses heavy tracking framing (`rounded-xl`)";
            }
            else if (matchedTag === 'div' && classes.includes('bg-white') && classes.includes('shadow') && classes.includes('rounded-xl')) {
                 reason = "Dashboard Card uses non-standard curvature (`rounded-xl`)";
            }

            if (reason) {
                const lineNumber = content.substring(0, startIdx).split('\n').length;
                
                // Procedural fix for "After" mockup
                let standardClasses = classes
                    .replace('rounded-xl', 'rounded-lg')
                    .replace('rounded-2xl', 'rounded-lg')
                    .replace('font-bold', 'font-medium')
                    .replace('px-6', 'px-3')
                    .replace('py-2.5', 'py-2');

                deviations.push({
                    file: path.relative(path.join(__dirname, '../..'), file),
                    line: lineNumber,
                    tag: matchedTag,
                    classes: classes.replace(/\s+/g, ' ').trim(),
                    standardClasses: standardClasses.replace(/\s+/g, ' ').trim(),
                    reason: reason
                });
            }
        }
        searchIdx = endIdx;
    }
});

// ── 2. MARKDOWN REPORT GENERATOR ───────────────────────────────────────────
let markdown = `# 🔍 UI Design Inconsistency Audit Report\n\n`;
markdown += `| File Path | Line | Element | Inconsistency Reason |\n| :--- | :--- | :--- | :--- |\n`;
deviations.forEach(d => {
    markdown += `| \`${d.file}\` | \`${d.line}\` | \`<${d.tag}>\` | ${d.reason} |\n`;
});
fs.writeFileSync(OUTPUT_REPORT, markdown);

// ── 3. HTML VISUAL CATALOG GENERATOR ───────────────────────────────────────
function generateHTML() {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Visual Styleguide & Inconsistencies</title>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style> body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; } </style>
</head>
<body class="flex min-h-screen">
    <aside class="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0 p-4 space-y-4">
        <div class="flex items-center gap-2 mb-6 px-2">
            <div class="p-1.5 bg-blue-600 rounded-lg"><i data-lucide="activity" class="w-5 h-5"></i></div>
            <span class="font-black tracking-tight text-lg">Styleguide</span>
        </div>
        <nav class="space-y-1">
            <a href="#compare" class="flex items-center gap-3 px-3 py-2 bg-blue-600 font-medium text-sm rounded-lg text-white"><i data-lucide="git-branch" class="w-4 h-4"></i> Auditor Previews</a>
        </nav>
    </aside>

    <main class="flex-1 p-8 space-y-10 overflow-y-auto">
        <header class="border-b border-gray-200 pb-6">
            <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">UI Inconsistencies Audit Previews</h1>
            <p class="text-gray-500 mt-1">Found ${deviations.length} items with non-standard classes alongside proposed fixes.</p>
        </header>

        <section id="compare" class="space-y-6">
            ${deviations.map(d => `
                <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div class="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-gray-900 text-sm"><code class="text-blue-600 text-xs">${d.file} : line ${d.line}</code></h4>
                            <p class="text-xs text-red-500 mt-0.5">${d.reason}</p>
                        </div>
                        <span class="px-3 py-1 bg-gray-100 text-[10px] font-bold uppercase rounded-lg border text-gray-600">&lt;${d.tag}&gt;</span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100/80">
                        <!-- Before -->
                        <div class="p-6 flex flex-col items-center justify-center gap-4 bg-red-50/10">
                            <span class="px-2 py-0.5 text-[9px] bg-red-100 border border-red-200 text-red-700 font-bold uppercase rounded-md">Original Class</span>
                            
                            ${d.tag === 'button' || d.tag === 'Link' ? `<button class="${d.classes} no-underline">Current Render</button>` : ''}
                            ${d.tag === 'input' ? `<input class="${d.classes}" placeholder="Current Render" />` : ''}
                            ${d.tag === 'span' ? `<span class="${d.classes}">Current Render</span>` : ''}
                            ${d.tag === 'div' ? `<div class="${d.classes} p-4 text-xs">Card Sample</div>` : ''}

                            <code class="text-[9px] text-red-400 text-center whitespace-pre-wrap max-w-sm border p-1.5 bg-white rounded mt-2">${d.classes}</code>
                        </div>
                        
                        <!-- After -->
                        <div class="p-6 flex flex-col items-center justify-center gap-4 bg-emerald-50/10">
                            <span class="px-2 py-0.5 text-[9px] bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold uppercase rounded-md">Standard Fix</span>
                            
                            ${d.tag === 'button' || d.tag === 'Link' ? `<button class="${d.standardClasses} no-underline">Proposed Render</button>` : ''}
                            ${d.tag === 'input' ? `<input class="${d.standardClasses}" placeholder="Proposed Render" />` : ''}
                            ${d.tag === 'span' ? `<span class="${d.standardClasses}">Proposed Render</span>` : ''}
                            ${d.tag === 'div' ? `<div class="${d.standardClasses} p-4 text-xs">Card Sample</div>` : ''}

                            <code class="text-[9px] text-emerald-600 text-center whitespace-pre-wrap max-w-sm border p-1.5 bg-white rounded mt-2">${d.standardClasses}</code>
                        </div>
                    </div>
                </div>
            `).join('')}
        </section>
    </main>

    <script> lucide.createIcons(); </script>
</body>
</html>`;

    fs.writeFileSync(OUTPUT_HTML, htmlContent);
    console.log(`✅ Visual catalog generated with ${deviations.length} dynamic audited comparison cards.`);
}

generateHTML();
