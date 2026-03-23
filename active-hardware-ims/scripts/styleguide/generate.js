const fs = require('fs');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const OUTPUT_HTML = path.join(__dirname, 'ui-catalog.html');
const OUTPUT_SKILLS = path.join(__dirname, '../..', 'skills.md');

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
        { name: "Standard (Primary)", classes: "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 shadow-sm", usage: "Standard primary forms trigger" },
        { name: "Bordered Action", classes: "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm", usage: "Filters and secondary routes actions" },
        { name: "Pill/Densitied", classes: "px-2.5 py-1 rounded-md text-[11px] font-bold border", usage: "Filtering toggles lists densities" }
    ],
    Badges: [
        { name: "Draft", classes: "bg-gray-100 border-gray-200 text-gray-700", usage: "Idle state or in-draft order headers" },
        { name: "Ready for Build", classes: "bg-amber-100 border-amber-200 text-amber-700", usage: "Allocation approved, ready for queue" },
        { name: "Invoiced", classes: "bg-purple-100 border-purple-200 text-purple-700", usage: "Financial breakdown saved" },
        { name: "Completed / Won", classes: "bg-green-100 border-green-200 text-green-700", usage: "Fulfillment completed" }
    ]
};

// Raw HTML fragments for complex structures to load statically.
const COMPLEX_LAYOUTS = [
    {
        name: "Workflow Stepper (Delivery Orders)",
        description: "Standard progress bar for tracking sequence milestones.",
        html: `
        <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Workflow Progress</h3>
            <div class="flex items-center w-full">
                <!-- Completed Step -->
                <div class="flex items-center flex-1">
                    <div class="relative flex flex-col items-center">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 border-2 border-green-500 text-white shadow-sm">
                            <i data-lucide="check-circle" class="w-4 h-4"></i>
                        </div>
                        <div class="absolute top-10 text-center text-[11px] font-semibold w-max text-green-600">
                            <span>Draft</span>
                        </div>
                    </div>
                    <div class="flex-1 h-1 mx-2 rounded-full bg-green-500"></div>
                </div>

                <!-- Active Step -->
                <div class="flex items-center flex-1">
                    <div class="relative flex flex-col items-center">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 border-2 border-blue-500 text-blue-600 font-bold ring-4 ring-blue-100">
                            <span class="text-xs">2</span>
                        </div>
                        <div class="absolute top-10 text-center text-[11px] font-bold w-max text-blue-600">
                            <span>Confirmed</span>
                        </div>
                    </div>
                    <div class="flex-1 h-1 mx-2 rounded-full bg-gray-100"></div>
                </div>

                <!-- Pending Step -->
                <div class="flex items-center">
                    <div class="relative flex flex-col items-center">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400">
                            <span class="text-xs">3</span>
                        </div>
                        <div class="absolute top-10 text-center text-[11px] font-semibold w-max text-gray-400">
                            <span>Ready</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="h-6"></div>
        </div>`
    },
    {
        name: "Standard Data List Tabular",
        description: "Grid based layouts for transactions and inventory rows.",
        html: `
        <div class="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
            <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                        <th class="px-6 py-3">Reference No</th>
                        <th class="px-6 py-3">Client Name</th>
                        <th class="px-6 py-3">Created</th>
                        <th class="px-6 py-3">Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td class="px-6 py-4 font-bold text-gray-900">DO-2026-0034</td>
                        <td class="px-6 py-4">Alpha Tech Corp</td>
                        <td class="px-6 py-4 text-gray-400">Mar 22, 2026</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 text-xs rounded-full border bg-amber-50 border-amber-200 text-amber-700 font-medium">Ready</span>
                        </td>
                    </tr>
                    <tr class="bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td class="px-6 py-4 font-bold text-gray-900">DO-2026-0035</td>
                        <td class="px-6 py-4">Beta Global LLC</td>
                        <td class="px-6 py-4 text-gray-400">Mar 23, 2026</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 text-xs rounded-full border bg-purple-50 border-purple-200 text-purple-700 font-medium">Invoiced</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`
    },
    {
        name: "Card Dashboard Metrics",
        description: "Highlights KPIs totals or quick metadata items.",
        html: `
        <div class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
            <div class="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                <i data-lucide="dollar-sign" class="w-5 h-5 text-blue-600"></i>
            </div>
            <div>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Expected Revenue</p>
                <p class="text-lg font-black text-gray-900 leading-tight">$450,200.00</p>
            </div>
        </div>`
    }
];

// ── HTML GENERATOR ──────────────────────────────────────────────────────────
function generateHTML() {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${UI_SPEC.Title}</title>
    <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; }
        :root { --background: #ffffff; --chrome-sidebar-bg: #111827; --chrome-card-bg: #ffffff; }
    </style>
</head>
<body class="flex min-h-screen">
    <!-- Static Sidebar Navigation Mimic -->
    <aside class="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0 p-4 space-y-4">
        <div class="flex items-center gap-2 mb-6 px-2">
            <div class="p-1.5 bg-blue-600 rounded-lg"><i data-lucide="activity" class="w-5 h-5"></i></div>
            <span class="font-black tracking-tight text-lg">Styleguide</span>
        </div>
        <nav class="space-y-1">
            <a href="#colors" class="flex items-center gap-3 px-3 py-2 bg-blue-600 font-medium text-sm rounded-lg text-white"><i data-lucide="palette" class="w-4 h-4"></i> Colors</a>
            <a href="#typography" class="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm font-medium rounded-lg text-gray-300"><i data-lucide="type" class="w-4 h-4"></i> Typography</a>
            <a href="#buttons" class="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm font-medium rounded-lg text-gray-300"><i data-lucide="square" class="w-4 h-4"></i> Buttons</a>
            <a href="#complex" class="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm font-medium rounded-lg text-gray-300"><i data-lucide="layers" class="w-4 h-4"></i> Core Layouts</a>
        </nav>
    </aside>

    <main class="flex-1 p-8 space-y-12 overflow-y-auto">
        <header class="border-b border-gray-200 pb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">${UI_SPEC.Title}</h1>
                <p class="text-gray-500 mt-1">Live visual previews of component assemblies in use.</p>
            </div>
            <a href="https://tailwindcss.com" target="_blank" class="text-xs font-semibold px-2 py-1 bg-slate-100 border rounded text-slate-600">Tailwind V4</a>
        </header>

        <!-- Colors -->
        <section id="colors">
            <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i data-lucide="palette" class="w-5 h-5 text-blue-600"></i> Palette Tokens</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                ${UI_SPEC.Colors.map(c => `
                    <div class="bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm flex flex-col items-center text-center">
                        <div class="h-12 w-12 rounded-full mb-3 border shadow-inner" style="background-color: ${c.hex.split(' ')[0]}"></div>
                        <h4 class="font-bold text-sm text-gray-900">${c.name}</h4>
                        <code class="text-[11px] text-blue-600 mt-1">${c.token}</code>
                        <p class="text-xs text-gray-400 mt-1.5">${c.usage}</p>
                    </div>
                `).join('')}
            </div>
        </section>

        <!-- Typography -->
        <section id="typography" class="bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm">
            <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><i data-lucide="type" class="w-5 h-5 text-blue-600"></i> Typography Hierarchy</h2>
            <div class="space-y-6">
                ${UI_SPEC.Typography.map(t => `
                    <div class="border-b border-dashed border-gray-100 pb-4 last:border-0 last:pb-0">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">${t.name} &middot; <code class="normal-case font-normal text-blue-600">${t.classes}</code></p>
                        <p class="${t.classes}">${t.description}</p>
                    </div>
                `).join('')}
            </div>
        </section>

        <!-- Buttons -->
        <section id="buttons" class="bg-white p-6 rounded-xl border border-gray-200/70 shadow-sm">
            <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><i data-lucide="square" class="w-5 h-5 text-blue-600"></i> Buttons Elements</h2>
            <div class="flex flex-wrap gap-8 items-center">
                ${UI_SPEC.Buttons.map(b => `
                    <div class="flex flex-col gap-2 items-start">
                        <button class="${b.classes}">Trigger Action</button>
                        <span class="text-[10px] text-gray-400"><code class="text-blue-500">${b.classes.split(' ').slice(0,3).join(' ')}...</code></span>
                    </div>
                `).join('')}
            </div>
        </section>

        <!-- Complex Layouts -->
        <section id="complex">
            <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><i data-lucide="layers" class="w-5 h-5 text-blue-600"></i> Comprehensive Layout Layouts</h2>
            <div class="space-y-8">
                ${COMPLEX_LAYOUTS.map(l => `
                    <div class="space-y-2">
                        <div class="flex flex-col mb-2">
                            <h4 class="font-bold text-gray-900">${l.name}</h4>
                            <p class="text-xs text-gray-500">${l.description}</p>
                        </div>
                        <div class="bg-slate-100/40 border border-slate-200/60 p-6 rounded-2xl">
                            ${l.html}
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    </main>

    <script>
        lucide.createIcons();
    </script>
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
