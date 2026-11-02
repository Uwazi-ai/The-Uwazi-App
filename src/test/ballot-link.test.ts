import { describe, it, expect } from "vitest";
import { pickBallotLink, pickPhone, BALLOT_LINK_LABEL } from "@/lib/ballotLink";

describe("ballot link label", () => {
  it("Google ballotInfoUrl is a sample ballot", () => {
    expect(pickBallotLink("https://g.example/ballot", { check_url: "https://c" }).kind).toBe("sample_ballot");
  });
  it("state sample_ballot_url is a sample ballot", () => {
    expect(pickBallotLink(null, { sample_ballot_url: "https://s", check_url: "https://c" })).toEqual({ url: "https://s", kind: "sample_ballot" });
  });
  it("check_url fallback is a voter lookup", () => {
    const r = pickBallotLink(null, { check_url: "https://c", website_url: "https://w" });
    expect(r).toEqual({ url: "https://c", kind: "voter_lookup" });
    expect(BALLOT_LINK_LABEL[r.kind!]).toBe("Open your state's official voter lookup");
  });
  it("website_url fallback is a voter lookup", () => {
    expect(pickBallotLink(null, { website_url: "https://w" }).kind).toBe("voter_lookup");
  });
});

describe("phone rule", () => {
  it("hides an unchecked state phone", () => {
    expect(pickPhone(null, { phone: "555-0100", phone_verified: false })).toBeNull();
  });
  it("shows a checked state phone", () => {
    expect(pickPhone(null, { phone: "555-0100", phone_verified: true })).toBe("555-0100");
  });
  it("Google local office phone always shows", () => {
    expect(pickPhone("555-0199", { phone: "555-0100", phone_verified: false })).toBe("555-0199");
  });
});
