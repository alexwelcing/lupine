# Census skip-link visual investigation

**Finding: tall element-capture artifact; no product CSS change is needed.**

Chromium 151.0.7922.34 was run against the isolated, unchanged v3 HTTP preview.
The only census input was the already-public resource with SHA-256
`a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a`.
No private inputs were read and no tracked files were changed for this investigation.

With the census table focused at a 375×812 viewport, the skip link was unfocused
and had `position: fixed`, `top: -100px`, and a bounding rectangle from y=-100 to
-54.3125. It was entirely outside the viewport before and after the element
screenshot. The focused element remained `#recorded-census-means`. Ordinary
viewport screenshots show no floating skip link. The desktop viewport behaved
the same way.

The section was 1633.03125 CSS pixels tall, and its viewport top was -410.484375.
The 339×1634 element screenshot includes the off-viewport fixed link at about
section-relative y=310: `-100 - (-410.484375) = 310.484375`. The capture therefore
paints content outside the ordinary viewport; its appearance does not establish
that the link was visible or focused in the running interface.

A separate, constructed HTML page reproduced the same effect with no application
code or data: the unfocused fixed link remained at viewport y=-100, the section
began at y=-410, and the tall element capture painted the link at y=310. A
transient `display: none` control removed it from that synthetic capture. The
initial Playwright screenshot-only `visibility: hidden` style control on the
application produced an identical tall image; that ineffective control is
preserved and is not used as evidence of removal.

The accessibility behavior also passed with real keyboard input. On a fresh
mobile page, the first Tab focused the skip link and revealed it at y=16.
Enter moved focus to `#main`; the skip link returned above the viewport. No
JavaScript errors or external requests occurred, and every isolated preview file
retained its original byte hash.

Use ordinary viewport captures when assessing visibility and keyboard focus.
Keep a tall section capture as an overview, labeled as such. This review covers
the inspected Chromium version and viewports; it is not a cross-browser audit.

The source-bound browser states and screenshot hashes are in
`browser-receipt.json`; the independent synthetic control is in
`minimal-receipt.json`. Investigation scripts remain in the ignored review
workspace and are deliberately excluded from the public evidence copy set.
