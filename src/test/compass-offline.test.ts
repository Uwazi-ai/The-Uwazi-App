import { describe, expect, it } from "vitest";
import { offlineCatalog, offlineEvent, offlinePersonaLabels } from "@/lib/compassOffline";
import { refuseKioskWorker } from "@/lib/kioskWorkerPolicy";

describe("Compass offline boundaries", () => {
  it("ends the expo at its approved Chicago expiry", () => {
    expect(offlineEvent("expo-oct-19", Date.parse("2026-10-20T04:58:59Z"))?.slug).toBe("expo-oct-19");
    expect(offlineEvent("expo-oct-19", Date.parse("2026-10-20T04:59:00Z"))).toBeNull();
    expect(offlineEvent("unknown", Date.parse("2026-10-19T13:00:00Z"))).toBeNull();
  });
  it("keeps balanced results as steward at the existing 0.05 threshold", () => {
    expect(offlinePersonaLabels({ "public-safety": 0.8, "education-youth": 0.75 })).toEqual({ persona: "steward", streak: null, primary: "Balanced across issues" });
    expect(offlinePersonaLabels({ "public-safety": 0.8, "education-youth": 0.749 }).persona).toBe("guardian");
  });
  it("uses existing lead mappings without changing scoring", () => {
    expect(offlinePersonaLabels({ "education-youth": 1, "public-safety": 0.7 })).toEqual({ persona: "mentor", streak: "guardian", primary: "Schools and safety" });
    expect(offlinePersonaLabels({ "public-safety": 0.5, "education-youth": 0.3 }).primary).toBe("Sees many sides");
    expect(offlineCatalog.questions).toHaveLength(16);
    expect(offlineCatalog.personas).toHaveLength(9);
  });
  it("refuses development, embedded previews and kill-switch registrations", () => {
    for (const host of ["id-preview--test.lovable.app", "preview--test.lovable.app", "lovableproject.com", "x.lovableproject-dev.com", "beta.lovable.dev"]) expect(refuseKioskWorker(true, host, false, "")).toBe(true);
    expect(refuseKioskWorker(false, "localhost", false, "")).toBe(true);
    expect(refuseKioskWorker(true, "uwaziapp.uwazi.ai", true, "")).toBe(true);
    expect(refuseKioskWorker(true, "uwaziapp.uwazi.ai", false, "?sw=off")).toBe(true);
    expect(refuseKioskWorker(true, "uwaziapp.uwazi.ai", false, "")).toBe(false);
  });
});