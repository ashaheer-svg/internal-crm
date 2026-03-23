# active-hardware-ims UI Design Code Standards

Use this guide to ensure that all future references and rendering operations made are layout consistent.

## 1. Components & Standard Prefabs
### Standard Buttons
- **Standard (Primary)**: `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 shadow-sm` (_Standard primary forms trigger_)
- **Bordered Action**: `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm` (_Filters and secondary routes actions_)
- **Pill/Densitied**: `px-2.5 py-1 rounded-md text-[11px] font-bold border` (_Filtering toggles lists densities_)

### Status Headers / Pill Highlights
- **Draft**: `bg-gray-100 border-gray-200 text-gray-700` (_Idle state or in-draft order headers_)
- **Ready for Build**: `bg-amber-100 border-amber-200 text-amber-700` (_Allocation approved, ready for queue_)
- **Invoiced**: `bg-purple-100 border-purple-200 text-purple-700` (_Financial breakdown saved_)
- **Completed / Won**: `bg-green-100 border-green-200 text-green-700` (_Fulfillment completed_)

## 2. Dynamic Text Ranges
- **Main Title**: `text-3xl font-extrabold tracking-tight` (Cockpit Page Title labels)
- **Sub Title**: `text-lg font-bold text-gray-900` (Standard card section headings)
- **Body Regular**: `text-sm text-gray-600` (Default details reads or descriptions)
- **Caps Tag**: `text-[10px] font-bold uppercase tracking-widest` (Sub-tags, secondary badges)


_Auto-generated via scripts/styleguide/generate.js_