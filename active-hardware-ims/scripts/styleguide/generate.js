const fs = require('fs');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const OUTPUT_HTML = path.join(__dirname, 'ui-catalog.html');
const OUTPUT_SKILLS = path.join(__dirname, '../..', 'skills.md');

// ── UI SPECIFICATIONS ───────────────────────────────────────────────────────
const UI_SPEC = {
    Title: "Active Hardware IMS - Design Language",
    Colors: [
        { name: "Background", token: "var(--background)", hex: "#ffffff / #0f172a", usage: "Main Page Canvas" },
        { name: "Sidebar Background", token: "var(--chrome-sidebar-bg)", hex: "#111827", usage: "Navigation Column layout background" },
        { name: "Card Background", token: "var(--chrome-card-bg)", hex: "#ffffff", usage: "Layout containers and content wrappers" },
        { name: "Brand Primary", token: "bg-blue-600", hex: "#2563eb", usage: "High emphasis action items, workflow tags" },
        { name: "Alert Success", token: "bg-green-600 / bg-emerald-600", hex: "#16a34a / #059669", usage: "Completion and approvals" }
    ],
    Typography: [
        { name: "Main Title", classes: "text-3xl font-extrabold tracking-tight", description: "Cockpit Page Title labels" },
        { name: "Sub Title", classes: "text-lg font-bold text-gray-900", description: "Standard card section headings" },
        { name: "Body Regular", classes: "text-sm text-gray-600", description: "Default details reads or descriptions" },
        { name: "Caps Tag", classes: "text-[10px] font-bold uppercase tracking-widest", description: "Sub-tags, secondary badges" }
    ],
    Buttons: [
        { name: "Standard (Primary)", classes: "inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 shadow-sm", usage: "Standard primary forms trigger" },
        { name: "Bordered Action", classes: "inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm", usage: "Filters and secondary routes actions" },
        { name: "Pill/Densitied", classes: "px-2.5 py-1 rounded-md text-[11px] font-bold border", usage: "Filtering toggles lists densities" }
    ],
    Badges: [
        { name: "Draft", classes: "bg-gray-100 border-gray-200 text-gray-700", usage: "Idle state or in-draft order headers" },
        { name: "Ready for Build", classes: "bg-amber-100 border-amber-200 text-amber-700", usage: "Allocation approved, ready for queue" },
        { name: "Invoiced", classes: "bg-purple-100 border-purple-200 text-purple-700", usage: "Financial breakdown saved" },
        { name: "Completed / Won", classes: "bg-green-100 border-green-200 text-green-700", usage: "Fulfillment completed" }
    ]
};

// ── HTML GENERATOR ──────────────────────────────────────────────────────────
function generateHTML() {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${UI_SPEC.Title}</title>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        :root { --background: #ffffff; --chrome-sidebar-bg: #111827; --chrome-card-bg: #ffffff; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-6xl mx-auto space-y-12">
        <header class="border-b pb-6">
            <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight">${UI_SPEC.Title}</h1>
            <p class="text-gray-500 mt-2">Static Design Tokens documentation sheet. Reference consistent layout classes here.</p>
        </header>

        <!-- Colors -->
        <section>
            <h2 class="text-2xl font-bold text-gray-800 mb-6">🎨 Color Swatches</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                ${UI_SPEC.Colors.map(c => `
                    <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                        <div class="h-16 w-16 rounded-full mb-3 border shadow-sm" style="background-color: ${c.hex.split(' ')[0]}"></div>
                        <h4 class="font-bold text-sm text-gray-900">${c.name}</h4>
                        <code class="text-[10px] text-gray-500 mt-1">${c.token}</code>
                        <p class="text-xs text-gray-400 mt-2">${c.usage}</p>
                    </div>
                `).join('')}
            </div>
        </section>

        <!-- Typography -->
        <section class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Text Styles</h2>
            <div class="space-y-6">
                ${UI_SPEC.Typography.map(t => `
                    <div class="border-b border-dashed pb-4 last:border-0">
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">${t.name} - <code class="normal-case font-normal">${t.classes}</code></p>
                        <p class="${t.classes}">${t.description}</p>
                    </div>
                `).join('')}
            </div>
        </section>

        <!-- Buttons -->
        <section class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Buttons</h2>
            <div class="flex flex-wrap gap-6 items-center">
                ${UI_SPEC.Buttons.map(b => `
                    <div class="flex flex-col gap-2 items-start">
                        <button class="${b.classes}">Button Example</button>
                        <span class="text-xs text-gray-500"><code class="text-[10px]">${b.classes}</code></span>
                    </div>
                `).join('')}
            </div>
        </section>

        <!-- Badges -->
        <section class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Pills & Statuses</h2>
            <div class="flex flex-wrap gap-4 items-center">
                ${UI_SPEC.Badges.map(b => `
                    <div class="flex flex-col gap-2">
                        <span class="px-2.5 py-1 text-xs rounded-full border ${b.classes} font-medium">${b.name}</span>
                        <code class="text-[10px] text-gray-400 text-center">${b.classes.split(' ')[0]}</code>
                    </div>
                `).join('')}
            </div>
        </section>
    </div>
</body>
</html>`;

    fs.writeFileSync(OUTPUT_HTML, htmlContent);
    console.log(`✅ Visual catalog authored at ${OUTPUT_HTML}`);
}

// ── SKILLS.MD EXPORTER ──────────────────────────────────────────────────────
function generateSkills() {
    let markdown = `# active-hardware-ims UI Design Code Standards\n\n`;
    markdown += `Use this guide to ensure that all future references and rendering operations made are layout consistent.\n\n`;

    markdown += `## 1. Components & Standard Prefabs\n`;
    
    markdown += `### Standard Buttons\n`;
    UI_SPEC.Buttons.forEach(b => {
        markdown += `- **${b.name}**: \`${b.classes}\` (_${b.usage}_)\n`;
    });
    
    markdown += `\n### Status Headers / Pill Highlights\n`;
    UI_SPEC.Badges.forEach(b => {
        markdown += `- **${b.name}**: \`${b.classes}\` (_${b.usage}_)\n`;
    });

    markdown += `\n## 2. Dynamic Text Ranges\n`;
    UI_SPEC.Typography.forEach(t => {
        markdown += `- **${t.name}**: \`${t.classes}\` (${t.description})\n`;
    });

    markdown += `\n\n_Auto-generated via scripts/styleguide/generate.js_`;

    fs.writeFileSync(OUTPUT_SKILLS, markdown);
    console.log(`✅ Skills export written to ${OUTPUT_SKILLS}`);
}

// ── RUN ───────────────────────────────────────────────────────────────────
generateHTML();
generateSkills();
