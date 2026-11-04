# SIGRA interface foundations

## Direction
A working security desk, not a decorative dashboard. Keep navigation quiet so that the current access task remains the main visual focus. Preserve existing role-specific routes and content.

## Tokens
Paper #F4F7FB surrounds white #FFFFFF task surfaces. Navy #142A43 carries the text; blue #0057B8 identifies actions and the current destination. Teal #087F72 denotes successful outcomes, red #B42318 denied or destructive outcomes. Dark mode uses opaque navy surfaces with light blue actions and explicit foreground pairs.

Geist remains the sole type family. Use sentence case, left-aligned task content, short labels, and existing page headings rather than decorative labels. The shell uses a compact mobile account header, a navigation rail on tablets, and an expanded navigation panel on wide screens.

## Interaction and compatibility
All button sizes and navigation links retain at least 44px touch targets. Buttons have solid explicit foreground/background colors for normal, hover, expanded, disabled, and focus states; primitive styling does not require OKLCH or color-mix. Theme tokens use HEX throughout. Keyboard focus is visible, and reduced-motion preferences disable shell/button transitions.

The 320px shell keeps the account name truncated without removing its role or logout control. Existing page-specific wide tables still own their scrolling behavior.

## Scope and verification
Changes cover shared navigation, typography/palette, controls, and button primitives. Scanner logic, authentication and authorization are unchanged. Component tests cover navigation permissions, logout, control state, disabled actions, and link composition. CSS visual states require browser/device inspection; jsdom tests are not visual contrast or layout proof.
