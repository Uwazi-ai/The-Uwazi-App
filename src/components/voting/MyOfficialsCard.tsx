import { Link } from "react-router-dom";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyOffices, useMyDistricts, ADD_ADDRESS_LINE } from "@/hooks/useMyOffices";
import CityComingNotice from "./CityComingNotice";

/** The offices that match where this person lives. Shown on the Voting Hub. */
export default function MyOfficialsCard() {
  const { data: offices = [], isLoading } = useMyOffices();
  const { data: districts } = useMyDistricts();
  if (isLoading) return null;

  const askLink = `/app/ask?q=${encodeURIComponent("Who represents me right now?")}`;

  return (
    <section>
      <h2 className="font-heading text-xl md:text-2xl text-foreground mb-3">Your officials</h2>
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: "var(--card-bg, rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <CityComingNotice showAsk={false} />
        {!offices.length ? (
          <p className="text-sm text-muted-foreground">We do not have your local offices yet. Ask UWAZI and we will help you find them.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {offices.map((o) => (
              <li key={o.id} className="py-2 text-sm">
                <div className="font-medium text-foreground">{o.office_title}</div>
                <div className="text-muted-foreground">{o.current_holder ?? "No one listed"}{o.term_end ? `. Term ends ${o.term_end}` : ""}</div>
                {o.source_url && (
                  <a href={o.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                    Official page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        {districts?.precision === "zip" && (
          <p className="text-sm text-muted-foreground">{ADD_ADDRESS_LINE}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {districts?.precision === "zip" && (
            <Button asChild size="sm"><Link to="/app/settings">Add your address</Link></Button>
          )}
          <Button asChild size="sm" variant="secondary">
            <Link to={askLink}><MessageCircle className="h-4 w-4 mr-1" />Ask UWAZI</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
