# UWAZI Plus light and dark logos

## Build
- Add a Brand logos section to Admin Content with separate uploads for dark surfaces and light surfaces.
- Preload the existing white UWAZI Plus wordmark into the dark-surface slot.
- Leave the light-surface slot empty with the note “Upload the black wordmark version here.”
- Store both files in the existing private media bucket and save their locations in Platform Settings.

## Shared logo
- Create one `PlusLogo` component with an `on_dark` prop.
- Load both saved logo locations through a safe public read helper.
- Resolve private files to short-lived display links.
- Prefer the logo matching the surface and fall back to the other logo when one is missing.
- Keep the existing bundled white logo as the final fallback so no broken image can appear.

## Apply everywhere
- Replace Plus branding in the paywall, Plus page, Compass report prompt, Ask limit wall, My City lock, lesson locks, and Watch locks.
- Pass `on_dark` based on each actual chip or card surface, not the selected app theme.
- Preserve the green plus without filters or recoloring.

## Access and verification
- Keep uploads and edits limited to super admins.
- Allow people to read only the two configured logo files from the private media bucket.
- Verify the paywall and Plus page in the browser on desktop and phone sizes.
- Verify the empty light slot falls back to the white wordmark without a missing image.

## Technical details
- Save the settings as `plus_logo_dark_url` and `plus_logo_light_url`.
- Add a read-only database function for the two brand settings because Platform Settings remains admin-only.
- Add a narrow storage rule that exposes only files currently selected as Plus logos.
