# Frappe Gantt for Kanboard

This plugin adds an **interactive Gantt chart** to the Kanboard project management system.  It leverages the open‑source [Frappe Gantt](https://github.com/frappe/gantt) library to render tasks on a timeline and extends Kanboard with rich dependency management, custom durations, interactive editing and export capabilities.  Instead of showing a static snapshot of tasks, the plugin turns your project into a live schedule where tasks, links and durations can be modified directly on the chart.

## Plugin highlights

* **Dedicated Gantt tab** – Each project gains its own full‑screen Gantt chart.  All JavaScript and CSS assets are bundled in the plugin, so it runs entirely offline without relying on external CDNs.

* **Drag‑and‑drop editing** – Users with the appropriate permissions can move tasks along the timeline or resize them to change start and due dates.  Every drag or resize writes the updated values back to Kanboard immediately.

* **Custom durations** – The task form includes a **Duration** field.  Entering a value defines the default length of the bar when no due date is set.  This value is stored as task metadata and never touches the core Kanboard tables, avoiding database errors.

* **Rich dependency support** – Internal links of type **“relates to”** are used to draw arrows between tasks.  A small *seed* marker lets you choose the direction of the arrow (i.e. whether Task A relates to Task B or vice versa).  Dependencies can be created, viewed and removed directly from the Gantt view via the sidebar.

* **Automatic enforcement of block relationships** – The plugin honours Kanboard’s “blocks” and “is blocked by” links.  If a task is blocked, it cannot be scheduled before its blocker finishes.  When a task that blocks others is extended, the plugin automatically shifts the start dates of its dependents so they no longer start too early.  Visual cues (red/white stripes on the bar) indicate whether a task is blocked or acting as a blocker.

* **Sidebar and search** – A collapsible sidebar lists all tasks with their durations and watchers.  It includes a live search box to quickly find tasks, plus a plus‑button to add new dependencies.  Link types and existing relationships are shown in a list so you can delete them when they are no longer needed.

* **Export to PDF** – You can export the current Gantt chart as a multi‑page PDF.  The plugin clones the SVG, inlines styles, adds a white background and slices the timeline into printable pages.

* **Minimum disturbance updates** – When bars are moved the plugin respects existing watchers and only applies the minimal changes necessary (e.g. raising the start date of blocked tasks) to keep the schedule consistent.

## Installation

To install Frappe Gantt simply extract the plugin folder into your Kanboard plugins directory and reload Kanboard.  The plugin is self‑contained and does not require any external build steps.

1. Download the plugin archive (this repository includes a pre‑built `FrappeGantt` folder).
2. Copy or extract the `FrappeGantt` folder into your Kanboard `plugins` directory (for example `kanboard/plugins/FrappeGantt`).  Make sure the folder name matches the plugin class name (`FrappeGantt`) so that Kanboard will register it.
3. Ensure the web server user has permission to read the plugin files.  When you reload Kanboard, a new **Gantt** tab will appear in the project header.

If your Kanboard instance has the built‑in plugin installer enabled, you can alternatively upload the ZIP file through **Settings → Plugins**.  For this to work the `PLUGIN_INSTALLER` setting must be enabled and the plugins directory writable【93785668332061†L113-L123】.

## Using the Gantt chart

* **Opening the chart:** Navigate to any project and click the **Gantt** tab.  The chart will render all tasks in the project, grouped by swimlane and including subtasks if enabled.

* **Editing tasks:** Click and drag a bar to move the task horizontally or grab the handle at the ends to extend or shorten it.  Double‑clicking a bar opens the standard task edit modal.  Durations are inferred from the start and due dates or from the custom **Duration** field if no due date is set.

* **Creating dependencies:** Use the search field in the sidebar to find the target task, select **“relates to”** and click the plus button to create an arrow from the selected task to the target.  The plugin stores a *seed* record to remember the arrow direction.  To remove a link, hover over it in the list and click the delete icon.

* **Understanding blockers:** Red/white stripes on the left edge of a bar show that the task is **blocked** by another (it cannot start sooner).  Stripes on the right edge mean the task **blocks** other tasks.  If you extend a blocker, the plugin will automatically adjust the start dates of blocked tasks to maintain the dependency.

* **Filtering and searching:** The sidebar provides a live search to quickly locate tasks.  You can collapse or expand the sidebar to maximise the chart area.  Tasks are grouped by swimlane and sorted to reflect their order in Kanboard.

* **Exporting:** Click the export icon in the toolbar to generate a PDF of your current view.  The plugin translates the SVG into a PDF, adds margins and backgrounds and splits the content into multiple pages when necessary.

## Requirements

* **Kanboard 1.2.20 or higher** – Frappe Gantt relies on hooks introduced in this version.
* **Modern browser** – Chrome, Edge or Firefox are recommended for the best experience.


## Development

This plugin is open source and welcomes contributions.  The code is organized as follows:

* **`Plugin.php`** – Registers routes, hooks and metadata fields; enforces dependency rules when tasks are updated.
* **`Controller`** – Implements API endpoints for saving tasks and managing links.
* **`Assets/js`** – Contains JavaScript modules that initialize the chart, decorate it with stripe overlays and handle link creation, sidebar rendering and export.
* **`Assets/css`** – Styles for the Gantt chart, sidebar and overlays.
* **`Template`** – Blade templates used to render the task form, sidebar, and the main Gantt view.

When modifying the plugin, respect the Kanboard coding standards.  To build the JavaScript and CSS bundles, run the provided build scripts (if available) or include your changes directly in the source files under `Assets`.

## License

This plugin is distributed under the MIT License.  See the [LICENSE](LICENSE) file for details.
