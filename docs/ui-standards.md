# Time Shark UI Standards

This document outlines the design standards and conventions used across the Time Shark application. Follow these principles to ensure a consistent, professional, and accessible user experience.

## Modal Dialogs

Popups and modals must adhere to the following responsive structural guidelines:

### 1. Scrolling Strategy (Backdrop Scrolling)
All modals must use **Backdrop Scrolling**. 
- The modal overlay (the dark background) is scrollable (`overflow-y-auto`, `items-start`, `py-6`).
- The modal content card is placed intelligently (`my-auto`, `mx-auto`) without fixed scrolling heights (`max-h-[..]`).
- Do not restrict the `max-h` of modal bodies or use internal content scrolling for primary elements. 
- Using backdrop scrolling ensures native web scroll behavior and prevents primary action buttons from being awkwardly constrained off-screen.

#### Structural Example:
```html
<div class="fixed inset-0 bg-secondary/40 flex items-start justify-center z-[110] backdrop-blur-md pointer-events-auto overflow-y-auto py-6 px-4">
    <!-- Inner Modal body with dynamic margins -->
    <div class="bg-card zen-card shadow-soft w-full max-w-lg p-8 transform transition-all scale-95 opacity-0 relative my-auto mx-auto pointer-events-auto text-main border border-soft">
        ...
    </div>
</div>
```

### 2. Headers and Layout Separators
- Modals should heavily emphasize their title hierarchy. Titles should be aligned top-left (e.g. `text-left`, `items-start`).
- The modal header area (Title + Subtitle) must immediately be separated from the body form content using padded bottom borders (e.g., `mb-4 pb-4 border-b border-white/5`). This anchors the header and keeps the form elements cleanly partitioned below.

### 3. Action Buttons (Submit/Save)
- **Primary Buttons to the Left**: Standard practice requires primary action buttons (e.g., Save, Update, Create) to be left-aligned (`justify-start`) and listed first in the button group order when placed at the bottom bounds of a form. Secondary options like "Cancel" sit directly to the right of the primary button.
- **Large/Medium Modals** (e.g. `max-w-5xl`, `max-w-lg`): Action buttons should be left-aligned, use `zen-btn` class, and should not span the full width of the modal.
- **Small Modals** (e.g. `max-w-sm`): Action buttons may be **full-width** (`w-full`) providing a focused, singular call-to-action block.

### 4. Destructive Actions (Delete, Remove)
Delete buttons should *not* be placed at the bottom near primary save actions, to avoid catastrophic accidental clicks.
- **Placement**: Place destructive actions inline at the top of the modal, grouped directly to the right of the active Title on the left side of the screen (e.g., `Edit Task  [🗑️]`), or grouped with top-right window controls if applicable. Modals and their titles should follow `text-left` alignment so the hierarchy flows correctly from top-left.
- **Styling**: They should be subtle by default. Use a ghosted visual treatment with a slight red hint (`bg-red-500/10 text-red-500/70`) that only reveals a solid error shape (`hover:bg-red-500/20 hover:text-red-500`) upon hover. 
- Avoid large, attention-grabbing fully colored red buttons unless it is a purely destructive confirmation modal.

## Input Controls & Form Fields
- **Consistency**: Input fields should utilize consistent styling based on our zen theme. `bg-app`, `border-none`, `focus:ring-2 focus:ring-primary/20`.
- **Textareas vs Inputs**: Use `<textarea>` fields equipped with rows (e.g. `rows="2"`) for fields that frequently capture multiple thoughts, like "Notes" or "Descriptions".
- **Dark UI Optimizations**: Native browser elements like Date pickers (`<input type="date">` or `datetime-local`) must be forced to adapt to the dark theme using inline styles: `style="color-scheme: dark;"` to ensure native calendar icons have appropriate contrast.
