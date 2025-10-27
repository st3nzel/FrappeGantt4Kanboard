# Frappe Gantt for Kanboard

This plugin adds an **interactive Gantt chart** to the Kanboard project management system.  It leverages the open‑source [Frappe Gantt](https://github.com/frappe/gantt) library to render tasks on a timeline and extends Kanboard with dependency management, custom durations and export capabilities.

## Features

* **Dedicated Gantt view per project** – A new tab appears in the project header that opens a full‑screen Gantt chart.  All assets are bundled locally and no external CDNs are used.
* **Interactive timeline** – Users with edit permissions can drag and resize task bars to adjust the start and due dates.  Changes are immediately persisted back to Kanboard.
* **Custom duration field** – The task creation/edit form gains a numeric **Duration** input.  The value is stored in task metadata and used to calculate bar lengths on the chart.  Duration values are never written directly into Kanboard’s SQL table; the field is removed before inserts/updates and saved separately in metadata.
* **Dependency links** – Use the side panel to search for tasks and add **internal links**.  Currently the “relates to” link type is used to represent dependencies.  A *seed* record is stored so that the plugin knows which side of the relation is the arrow head.  Links can be created and removed without leaving the Gantt view.
* **Blocked and blocker indicators** – If a task is blocked by another task (via a “blocks” link), the plugin ensures the blocked task cannot start before its blocker finishes.  Conversely, when a task blocks others and its due date is extended, the plugin automatically shifts the start date of directly blocked tasks forward.  Red/white stripes on the left side of a bar denote that the task is *blocked*; stripes on the right side denote that the task *blocks* other tasks.
* **Sidebar with live search** – The chart includes a sidebar that lists tasks, shows durations and watchers, and provides a search box for quickly locating tasks.  A plus button allows you to create new dependency links directly from the chart.
* **PDF export** – Tasks can be exported as a PDF using the built‑in export functionality.  The plugin clones the SVG, inlines styles, inserts backgrounds and slices the chart into pages for PDF generation.
* **Support for watchers and baselines** – When moving or resizing bars the plugin respects existing due dates and watchers (for example, tasks that are blocked or blocking) and applies minimal updates only when necessary.

## Installation

There are two ways to install plugins in Kanboard: via the **web interface** or by manually copying files.  Since Kanboard v1.2.8 the web interface is disabled by default for security reasons【93785668332061†L113-L123】.

### Installation via the web interface

1. Ensure your Kanboard instance meets the following requirements【93785668332061†L113-L123】:
   * The **plugin directory must be writable** by the web server user.
   * The **PHP Zip extension** must be available on your server.
   * The configuration option `PLUGIN_INSTALLER` must be set to `true` in your `config.php` file.
   * Only administrators can install or remove plugins from the user interface.
2. Download the ZIP archive of this plugin from the releases page or the built file provided here.
3. Log in to Kanboard as an administrator and navigate to **Settings → Plugins**.
4. Click **“Upload and install a plugin”**, select the downloaded ZIP file, and confirm.  Kanboard will extract the plugin into the `plugins` directory and make the Gantt tab available for each project.

### Manual installation

If you prefer to install plugins manually or your installation does not support the built‑in installer, follow these steps:

1. Download the ZIP archive of this plugin and extract it locally.  You should end up with a folder called `FrappeGantt` containing `Plugin.php`, `Assets`, `Controller`, `Service`, etc.
2. Upload the `FrappeGantt` folder to the **plugins directory** of your Kanboard installation.  For example, on a typical installation you would copy it to `/path/to/kanboard/plugins/FrappeGantt`.  When running Kanboard on Cloudron, the documentation notes that plugins can be installed by uploading and extracting them into `/app/data/plugins`【96351855768407†L307-L313】.
3. Ensure that the web server user has read access to the plugin files and that the plugin folder name matches its class (first letter capitalized) so Kanboard can register it【96351855768407†L307-L313】.
4. Reload the Kanboard page.  You should see a **Gantt** tab in the project header.

## Usage

1. Open a project and click the **Gantt** tab.  The chart will load all tasks in the project.
2. **Drag or resize** a bar to change a task’s start or due date.  If a task is blocked by another, the plugin will prevent you from starting it before the blocker finishes.  Extending a blocker’s due date will automatically push forward the start of any directly blocked tasks.
3. To **link tasks**, use the search field in the sidebar to find the target task, select a link type (currently “relates to”), and click the plus button.  A seed record determines which direction the arrow points.  Links can be removed via the list of existing links.
4. **Duration** values can be set when creating or editing a task.  Enter a numeric value in the “Duration” field; the plugin stores it as metadata and uses it to draw the bar length. (Only if start/due date is not set)
5. Use the **export** option in the toolbar to generate a PDF of the current view.  The plugin slices the chart into pages to fit on standard paper sizes. !not working

## Requirements

* Kanboard **version ≥ 1.2.20** (the plugin uses hooks available from this version onward).
* PHP 8.1+ is recommended for Kanboard itself (see Kanboard requirements).
* A modern browser (Chrome/Edge/Firefox) to use the interactive Gantt.

## Development

This plugin is open source and welcomes contributions.  The code is organized as follows:

* **`Plugin.php`** – Registers routes, hooks and metadata fields; enforces dependency rules when tasks are updated.
* **`Controller`** – Implements API endpoints for saving tasks and managing links.
* **`Assets/js`** – Contains JavaScript modules that initialize the chart, decorate it with stripe overlays and handle link creation, sidebar rendering and export.
* **`Assets/css`** – Styles for the Gantt chart, sidebar and overlays.
* **`Template`** – Blade templates used to render the task form, sidebar, and the main Gantt view.

When modifying the plugin, respect the Kanboard coding standards.  To build the JavaScript and CSS bundles, run the provided build scripts (if available) or include your changes directly in the source files under `Assets`.

## License

This plugin is distributed under the MIT License. 
