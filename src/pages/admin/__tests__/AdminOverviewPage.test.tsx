import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const refetch = vi.fn().mockResolvedValue({});
vi.mock("@/hooks/useAdminData", () => ({
  useAdminStats: () => ({ isSuccess: true, dataUpdatedAt: 1000, refetch }),
  useSignupChart: () => ({ isSuccess: true, dataUpdatedAt: 2000, refetch }),
}));
vi.mock("@/components/admin/OverviewAnalytics", () => ({ OverviewAnalytics: () => <section aria-label="Overview analytics">Analytics summary</section> }));
vi.mock("@/components/admin/OverviewPeople", () => ({
  OverviewRecentSignups: () => <p>Signups panel</p>, OverviewTopScores: () => <p>Scores panel</p>, OverviewZipBreakdown: () => <p>ZIP panel</p>,
}));
vi.mock("@/components/admin/JourneyResearchPanels", () => ({ JourneyResearchPanels: () => <p>Journey panel</p> }));
vi.mock("@/components/admin/ResearchSurveysPanel", () => ({ ResearchSurveysPanel: () => <p>Surveys panel</p> }));
vi.mock("@/components/admin/PersonaCopyAdmin", () => ({ PersonaCopyAdmin: ({ onDirtyChange }: { onDirtyChange: (v: boolean) => void }) => <input aria-label="Draft" onChange={() => onDirtyChange(true)} /> }));
vi.mock("@/components/admin/CompassFactsAdmin", () => ({ CompassFactsAdmin: () => <p>Facts panel</p> }));
vi.mock("@/components/admin/PlatformHealthCard", () => ({ PlatformHealthCard: () => <p>Health panel</p> }));
vi.mock("@/components/admin/UnverifiedActionsPanel", () => ({ UnverifiedActionsPanel: () => <p>Actions panel</p> }));

import AdminOverviewPage, { resolveOverviewSelection } from "../AdminOverviewPage";

function Location() { const location = useLocation(); return <output data-testid="url">{location.search}</output>; }
function setup(url = "/app/admin") {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[url]}><AdminOverviewPage /><Location /></MemoryRouter></QueryClientProvider>);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); refetch.mockClear(); });

describe("Admin overview", () => {
  it("defaults invalid URL selections to a valid tool", () => {
    expect(resolveOverviewSelection(new URLSearchParams("tab=unknown&tool=anything"))).toEqual({ tab: "people", tool: "signups" });
    expect(resolveOverviewSelection(new URLSearchParams("tab=content&tool=scores"))).toEqual({ tab: "content", tool: "personas" });
  });
  it("puts analytics before tools and mounts only the default panel", () => {
    setup();
    expect(screen.getByRole("region", { name: "Overview analytics" }).compareDocumentPosition(screen.getByRole("region", { name: "Admin tools" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Signups panel")).toBeInTheDocument();
    expect(screen.queryByText("Journey panel")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("overview-tool")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open full analytics" })).toHaveAttribute("href", "/app/admin/analytics");
  });
  it("opens deep-linked tools and updates the URL when another tool is selected", async () => {
    setup("/app/admin?tab=platform&tool=actions");
    expect(screen.getByText("Actions panel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Platform health" }));
    await waitFor(() => expect(screen.getByText("Health panel")).toBeInTheDocument());
    expect(screen.getByTestId("url")).toHaveTextContent("tab=platform&tool=health");
    expect(screen.queryByText("Actions panel")).not.toBeInTheDocument();
  });
  it("retains dirty drafts when leaving is declined and switches when accepted", async () => {
    setup("/app/admin?tab=content&tool=personas");
    fireEvent.change(screen.getByRole("textbox", { name: "Draft" }), { target: { value: "Unsaved" } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Compass facts" }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(screen.getByRole("textbox", { name: "Draft" })).toHaveValue("Unsaved");
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Compass facts" }));
    await waitFor(() => expect(screen.getByText("Facts panel")).toBeInTheDocument());
  });
  it("refreshes analytics instead of advancing a timer", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/Analytics updated/)).toHaveTextContent(new Date(1000).toLocaleTimeString());
  });
});