# UI Design System

> **This is the source of truth for all UI in this application.**
> Follow these patterns exactly when building new pages or modifying existing ones.

---

## Buttons

All buttons use `inline-flex items-center gap-1.5 text-sm font-medium transition-colors shadow-sm rounded-lg`.

| Variant | Class |
|---|---|
| **Primary** | `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm` |
| **Secondary** | `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm` |
| **Danger** | `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm` |
| **Ghost** | `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors` |
| **Disabled** | Add `disabled:opacity-50 disabled:cursor-not-allowed` to any variant |
| **Icon-only** | `p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors` |

### Icon Spacing
- Use `gap-1.5` on the button (NOT `mr-2` on icons)
- Icon size: `w-4 h-4` for most buttons, `w-3.5 h-3.5` for small/compact

### Segmented Toggle (Board/List, All/Mine)
```tsx
<div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
  <button className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${active ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
    <Icon className="w-3.5 h-3.5" />
    Label
  </button>
</div>
```

---

## Form Inputs

All form controls use `rounded-lg border border-gray-200 text-sm shadow-sm` with focus ring.

| Element | Class |
|---|---|
| **Text Input** | `block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none` |
| **Select** | `block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white` |
| **Textarea** | `block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none` |
| **Label** | `block text-sm font-medium text-gray-700 mb-1` |
| **Help text** | `text-xs text-gray-500 mt-1` |
| **Read-only / auto field** | Add `bg-gray-50` to the input |

**Field group pattern:**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
  <input className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
</div>
```

---

## Status Badges

```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-{color}-100 text-{color}-700">
  STATUS
</span>
```

| Status | Color |
|---|---|
| OPEN / ACTIVE / IN_PROGRESS | `blue` |
| WON / PAID / COMPLETED / DELIVERED | `green` |
| LOST / CANCELLED / OVERDUE | `red` |
| DRAFT / PENDING | `gray` |
| SENT / PROCESSING | `purple` |
| WARNING / PARTIALLY | `yellow` |

---

## Page Headers

```tsx
<div className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
  <div className="flex items-center gap-3">
    <h1 className="text-xl font-semibold text-gray-900">Page Title</h1>
    {/* optional segmented toggles or filters */}
  </div>
  <div className="flex items-center gap-2">
    {/* Secondary buttons first, then primary last */}
    <button className="...secondary...">Export</button>
    <button className="...primary...">+ New Item</button>
  </div>
</div>
```

---

## Cards / Panels

```tsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
  <div className="px-6 py-4 border-b border-gray-200">
    <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Section Title</h2>
  </div>
  <div className="p-6">{/* content */}</div>
</div>
```

---

## Tables

```tsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Col</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200 bg-white">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm text-gray-900">Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Empty States

```tsx
<div className="text-center py-12 text-gray-400">
  <Icon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
  <p className="text-sm font-medium text-gray-500">No items found</p>
  <p className="text-xs mt-1">Get started by creating your first item.</p>
  <button className="...primary... mt-4">+ New Item</button>
</div>
```

---

## Modals

```tsx
<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
    <div className="flex justify-between items-center px-6 py-4 border-b">
      <h2 className="text-lg font-semibold text-gray-900">Modal Title</h2>
      <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
    <div className="p-6 space-y-4">{/* form fields */}</div>
    <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
      <button className="...secondary...">Cancel</button>
      <button className="...primary...">Save</button>
    </div>
  </div>
</div>
```

---

## What NOT to do

❌ `rounded-md` → use `rounded-lg`  
❌ `px-4 py-2` → use `px-3 py-2`  
❌ `border-gray-300` → use `border-gray-200`  
❌ `mr-2` on icons → use `gap-1.5` on the button  
❌ `flex` on buttons → use `inline-flex`  
❌ Bare `border rounded-md` (no color) → always specify `border-gray-200`
