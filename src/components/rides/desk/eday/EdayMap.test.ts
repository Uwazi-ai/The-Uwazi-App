import { describe, expect, it } from "vitest";
import { dayMapPins } from "./EdayMap";

describe("Election Day map pins", () => {
  it("label pickups with ride code and time only, and places with ride counts", () => {
    const pins = dayMapPins({
      pickups: [{ code: "UZ-1203", time: "14:00", status: "booked", lat: 39.1, lng: -94.5 }],
      places: [{ id: "s1", name: "Central Library", lat: 39.2, lng: -94.6, rides: 2 }],
    });
    expect(pins.find((p) => p.kind === "pickup")?.label).toBe("Pickup UZ-1203, 2 PM");
    expect(pins.find((p) => p.kind === "place")?.label).toBe("Central Library. 2 rides heading here");
  });
});
