# TimeShark Timeline Philosophy

This document outlines the core narrative and design philosophy behind the Timeline zoom configurations and layout principles in TimeShark.

## Overview
The TimeShark Timeline is designed to act as an executive visualization tool that gracefully transitions from strict, zoomed-in tactical delivery into high-level, overarching roadmap abstractions.

## Time Scales (The 'What')
*   **DAY** (`Tactical & Execution`): Used for logging hours, tracking exact start/stop intervals, and observing micro-overlaps on today's agenda.
*   **WEEK** (`Operational & Planning`): The default state. Used for sprint tracking, ensuring task loads are balanced across the immediate team, and projecting impending deliverables.
*   **MONTH** (`Strategic Tracking`): Used for observing overarching project lifecycles, milestone deadlines, and identifying macro bottlenecks without getting distracted by single-day fluctuations.
*   **YEAR** (`Executive Roadmap`): Strips away granular noise. Used purely to visualize broad project spans phase-by-phase across quarters.

## Zoom Depths (The 'How')
*   **COMPACT** (`Pattern Recognition`): Strips away text inside task bars and compresses negative space in row heights. Designed strictly for viewing massive lists where you need to identify "heat-mapping"—spotting extremely busy periods, resource stacking, or timeline collisions at a glance.
*   **REGULAR** (`Core Interface`): The sweet spot. Text is visible, click targets are comfortable, and standard UI components are accessible. Designed for everyday interaction, editing, and task management.
*   **RELAXED** (`Presentation Mode`): Expands row heights and font sizes significantly. Ideal for projecting on a screen during team meetings, ensuring remote peers can read timelines clearly over video calls, or for touch-first device usage.

## Visual Anchors
* **Collapsible Trees:** Both Teams/Resources and Projects are fully collapsible. The tool relies on heavy branch reduction so you can present pristine executive roadmaps without drowning in backlog tasks.
* **Solid vs Hollow Data:** Finished/Complete elements present completely solid visual bars. Pending, TODO, or active tasks use hollow layout approaches. If it's solid, it's done. 
* **Zero-Blur Crispness:** Transparent blurs have been removed in favor of opaque, distinct layers (`bg-card`, `bg-app`) coupled with bright high-contrast text (`opacity-90`, `opacity-100`). The interface should never feel "stuffy" in dark mode. 
