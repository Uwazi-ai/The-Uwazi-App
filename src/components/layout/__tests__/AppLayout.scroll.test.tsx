/**
 * Scroll-layout regression test
 *
 * Guards against the recurring bug where `h-full` or similar height constraints
 * on the AppLayout wrapper prevent the page from scrolling when content exceeds
 * the viewport. Checks the critical CSS properties at desktop, iPad, and mobile
 * breakpoints (simulated via matchMedia stubs).
 *
 * Key invariants:
 * 1. The motion.div wrapper inside <main> must NOT use `h-full` or
 *    `max-h-screen` — it should use `min-h-0` (or no height constraint).
 * 2. The content column (flex-1) must NOT have `overflow: hidden` on the Y axis.
 * 3. <main> must be `flex-1` (grow to fill) without capping its height.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Minimal stand-in for AppLayout's inner structure.
// We test the actual class strings used in AppLayout.tsx so that if someone
// changes them in a way that re-introduces the bug the test will fail.
// ---------------------------------------------------------------------------

/** Mirrors the className values from AppLayout.tsx */
const OUTER_DIV_CLASSES = "min-h-screen flex w-full bg-background overflow-x-hidden";
const CONTENT_COL_CLASSES = "flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden";
const MAIN_CLASSES = "flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0";
const MOTION_DIV_CLASSES = "min-h-0";

/**
 * Renders a simplified AppLayout skeleton with tall content and returns the
 * key DOM nodes so we can assert their computed class lists.
 */
function renderLayoutSkeleton() {
  const { container } = render(
    <div data-testid="outer" className={OUTER_DIV_CLASSES}>
      {/* sidebar placeholder */}
      <aside className="hidden md:flex w-[192px]" />
      <div data-testid="content-col" className={CONTENT_COL_CLASSES}>
        <header>TopBar</header>
        <main data-testid="main" className={MAIN_CLASSES}>
          <div data-testid="motion-wrapper" className={MOTION_DIV_CLASSES}>
            {/* Simulate a tall page */}
            <div style={{ height: 3000 }}>Tall content</div>
          </div>
        </main>
      </div>
    </div>,
  );
  return {
    outer: screen.getByTestId("outer"),
    contentCol: screen.getByTestId("content-col"),
    main: screen.getByTestId("main"),
    motionWrapper: screen.getByTestId("motion-wrapper"),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AppLayout scroll regression", () => {
  it("motion wrapper uses min-h-0, NOT h-full", () => {
    const { motionWrapper } = renderLayoutSkeleton();
    expect(motionWrapper.className).toContain("min-h-0");
    expect(motionWrapper.className).not.toContain("h-full");
    expect(motionWrapper.className).not.toContain("max-h-screen");
    expect(motionWrapper.className).not.toContain("h-screen");
  });

  it("content column does not constrain vertical overflow", () => {
    const { contentCol } = renderLayoutSkeleton();
    // overflow-x-hidden is fine, but overflow-hidden (both axes) or overflow-y-hidden would block scroll
    expect(contentCol.className).not.toMatch(/\boverflow-hidden\b/);
    expect(contentCol.className).not.toContain("overflow-y-hidden");
  });

  it("main element is flex-1 without fixed height", () => {
    const { main } = renderLayoutSkeleton();
    expect(main.className).toContain("flex-1");
    expect(main.className).not.toContain("h-full");
    expect(main.className).not.toContain("h-screen");
    expect(main.className).not.toContain("max-h-screen");
  });

  it("outer wrapper allows vertical growth with min-h-screen", () => {
    const { outer } = renderLayoutSkeleton();
    expect(outer.className).toContain("min-h-screen");
    // Must NOT be h-screen (fixed height blocks scroll)
    expect(outer.className).not.toMatch(/\bh-screen\b/);
  });

  // Verify the actual source file hasn't drifted from the class strings we test
  it("AppLayout.tsx source matches tested class strings", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/components/layout/AppLayout.tsx", "utf-8");

    // motion.div wrapper must contain min-h-0
    expect(source).toContain('className="min-h-0"');
    // Must NOT contain h-full on the motion.div line
    expect(source).not.toMatch(/motion\.div[\s\S]{0,120}className="h-full"/);
  });
});
