# 🛠️ Installation

1. Download the `.zip` file or clone this repository.
2. Extract the folder into your Moodle `lib/editor/tiny/plugins/` directory.
3. Rename the folder to `studiolms` (if necessary).
   Final path:
   `your-moodle/lib/editor/tiny/plugins/studiolms/`
4. Visit **Site administration > Notifications** to complete the installation.
5. The **StudioLMS** button appears in the TinyMCE toolbar (and under **Tools**) for users who hold
   `tiny/studiolms:use` in the page's context — editing teachers, non-editing teachers and managers
   by default. Managing **Site Templates** requires `tiny/studiolms:manageglobaltemplates`,
   granted to managers at site level by default.
6. Optional: under **Site administration > Plugins > Text editors > TinyMCE editor > StudioLMS** the
   administrator can switch off **Show the ready-made layouts**. The **Ready-made Layouts** tab then
   disappears from the dialog; site templates and each teacher's own templates are not affected. It is on
   by default.
