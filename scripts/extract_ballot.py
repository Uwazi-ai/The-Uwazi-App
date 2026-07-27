#!/usr/bin/env python3
"""
extract_ballot.py — Ballot data extraction for UWAZI

Turns official sample ballots (PDF) and SOS candidate filing lists
(CSV/XLSX) into structured JSON staged for human verification.

CORE SAFETY RULE
----------------
This script NEVER writes to published tables. It writes to
ballot_contests_staging with verified_by = NULL. A human signs off
before anything reaches voters. Extraction is a model's job.
Verification is not.

Usage
-----
  # Extract one county sample ballot
  python extract_ballot.py pdf ballots/jackson_dem.pdf \
      --state MO --authority mo-jackson --party DEM \
      --source-url https://... --out staging/jackson_dem.json

  # Dual-model extraction; flags any disagreement for review
  python extract_ballot.py pdf ballots/clay_rep.pdf \
      --state MO --authority mo-clay --party REP \
      --source-url https://... --double-check

  # Bulk import a statewide SOS candidate filing list
  python extract_ballot.py csv mo_sos_filings.csv \
      --state MO --source-url https://... --out staging/mo_state.json

  # Push verified staging JSON to Supabase
  python extract_ballot.py load staging/jackson_dem.json --verified-by "Myke Shaw"

Install
-------
  pip install anthropic pdfplumber pymupdf pandas openpyxl supabase

Env
---
  ANTHROPIC_API_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_KEY   (service role — this writes reference data)
"""

import argparse
import base64
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import anthropic

FAST_MODEL = "claude-sonnet-5"
CAREFUL_MODEL = "claude-opus-5"

# ----------------------------------------------------------------------
# Extraction schema — the model must return exactly this shape
# ----------------------------------------------------------------------
SCHEMA = """
{
  "contests": [
    {
      "contest_type": "office" | "ballot_measure",
      "office_name": string | null,
      "measure_title": string | null,
      "measure_summary": string | null,
      "district_name": string | null,
      "party": string | null,
      "vote_for": integer,
      "sort_order": integer,
      "candidates": [
        {
          "name": string,
          "party": string | null,
          "is_incumbent": boolean,
          "sort_order": integer
        }
      ]
    }
  ]
}
"""

EXTRACTION_PROMPT = f"""You are extracting structured data from an official sample ballot for a
civic information app. Accuracy matters more than completeness: a wrong
candidate name or a wrong ballot order can mislead a voter.

Return ONLY a JSON object matching this schema. No preamble, no markdown
fences, no commentary:

{SCHEMA}

Rules:
1. BALLOT ORDER IS DATA. sort_order must reflect the order printed on
   the ballot, top to bottom, for both contests and candidates within a
   contest. Never alphabetize. Never reorder.
2. Transcribe names EXACTLY as printed, including middle initials,
   suffixes (Jr., III), nicknames in quotes, and hyphenation. Do not
   normalize, correct spelling, or expand abbreviations.
3. For ballot measures, put the official ballot question text verbatim
   in measure_summary. Do not paraphrase, summarize, or shorten it. If
   the text is cut off or unreadable, set measure_summary to null rather
   than guessing.
4. vote_for is how many candidates the voter may select ("Vote for One"
   = 1, "Vote for Two" = 2). Default to 1 if not stated.
5. district_name is the district or jurisdiction as printed, e.g.
   "5th Congressional District", "State Representative District 23",
   "Jackson County".
6. is_incumbent is true ONLY if the ballot explicitly marks the
   candidate as an incumbent. Do not infer it from outside knowledge.
7. If anything is illegible, ambiguous, or you are uncertain, use null.
   A null field gets caught in human review. A guess does not.
8. Do not add contests or candidates that are not on this document,
   even if you believe they should be on the ballot.
"""


# ----------------------------------------------------------------------
# PDF handling
# ----------------------------------------------------------------------
def pdf_to_blocks(path: Path, max_pages: int = 20):
    """
    Build content blocks: page images plus extracted text.

    Sample ballots are frequently multi-column with boxes and rules, and
    text extraction alone garbles the column order — which is exactly the
    thing that must not be garbled. So we send both the rendered image
    and the text layer and let the model reconcile them.
    """
    blocks = []
    try:
        import fitz  # pymupdf
    except ImportError:
        sys.exit("pip install pymupdf")

    doc = fitz.open(path)
    n = min(len(doc), max_pages)
    if len(doc) > max_pages:
        print(f"  ! {len(doc)} pages, processing first {max_pages}. "
              f"Split the PDF if contests are being dropped.", file=sys.stderr)

    for i in range(n):
        page = doc[i]
        pix = page.get_pixmap(dpi=150)
        blocks.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": base64.b64encode(pix.tobytes("png")).decode(),
            },
        })
    doc.close()

    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages[:n]):
                text_parts.append(f"--- Page {i+1} ---\n{page.extract_text() or ''}")
        blocks.append({
            "type": "text",
            "text": "Extracted text layer (may have column-order errors — "
                    "trust the images for ordering):\n\n" + "\n\n".join(text_parts),
        })
    except ImportError:
        print("  ! pdfplumber not installed, using images only", file=sys.stderr)

    return blocks


def call_model(client, model, blocks):
    blocks = blocks + [{"type": "text", "text": EXTRACTION_PROMPT}]
    resp = client.messages.create(
        model=model,
        max_tokens=8000,
        messages=[{"role": "user", "content": blocks}],
    )
    raw = "".join(b.text for b in resp.content if b.type == "text").strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        sys.exit(f"Model returned invalid JSON: {e}\n\n{raw[:800]}")


def diff_extractions(a: dict, b: dict) -> list[str]:
    """Compare two independent extractions. Any disagreement is a review flag."""
    issues = []
    ca, cb = a.get("contests", []), b.get("contests", [])
    if len(ca) != len(cb):
        issues.append(f"CONTEST COUNT: model A found {len(ca)}, model B found {len(cb)}")
    for i, (x, y) in enumerate(zip(ca, cb)):
        label = x.get("office_name") or x.get("measure_title") or f"contest {i}"
        if (x.get("office_name") or "") != (y.get("office_name") or ""):
            issues.append(f"[{label}] office name differs: "
                          f"{x.get('office_name')!r} vs {y.get('office_name')!r}")
        na = [c["name"] for c in x.get("candidates", [])]
        nb = [c["name"] for c in y.get("candidates", [])]
        if na != nb:
            issues.append(f"[{label}] candidate list or ORDER differs:\n"
                          f"    A: {na}\n    B: {nb}")
    return issues


# ----------------------------------------------------------------------
# Commands
# ----------------------------------------------------------------------
def cmd_pdf(args):
    client = anthropic.Anthropic()
    path = Path(args.pdf)
    if not path.exists():
        sys.exit(f"No such file: {path}")

    print(f"Reading {path.name} ...")
    blocks = pdf_to_blocks(path)

    print(f"Extracting with {FAST_MODEL} ...")
    result = call_model(client, FAST_MODEL, blocks)

    flags = []
    if args.double_check:
        print(f"Cross-checking with {CAREFUL_MODEL} ...")
        second = call_model(client, CAREFUL_MODEL, blocks)
        flags = diff_extractions(result, second)
        if flags:
            print(f"\n  ⚠ {len(flags)} disagreement(s) — review these first:")
            for f in flags:
                print(f"    - {f}")
        else:
            print("  ✓ Both models agree")

    # Null fields are review targets, not errors
    for c in result.get("contests", []):
        if c.get("contest_type") == "ballot_measure" and not c.get("measure_summary"):
            flags.append(f"[{c.get('measure_title')}] measure_summary is null "
                         f"— transcribe from source by hand")
        for cand in c.get("candidates", []):
            if not cand.get("name"):
                flags.append(f"[{c.get('office_name')}] candidate with empty name")

    staged = {
        "meta": {
            "state": args.state,
            "authority_key": args.authority,
            "party": args.party,
            "election_date": args.election_date,
            "source_url": args.source_url,
            "source_file": path.name,
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "extraction_models": [FAST_MODEL] + ([CAREFUL_MODEL] if args.double_check else []),
            "review_flags": flags,
            "verified_by": None,
            "verified_at": None,
        },
        **result,
    }

    out = Path(args.out or f"staging/{args.authority}_{(args.party or 'all').lower()}.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(staged, indent=2))

    n_contests = len(result.get("contests", []))
    n_cands = sum(len(c.get("candidates", [])) for c in result.get("contests", []))
    print(f"\n→ {out}")
    print(f"  {n_contests} contests, {n_cands} candidates, {len(flags)} flag(s)")
    print(f"\nNEXT: open the source PDF beside {out.name} and verify every "
          f"name and every ordering. Then:\n"
          f"  python extract_ballot.py load {out} --verified-by \"Your Name\"")


def cmd_csv(args):
    """
    Bulk import a state SOS candidate filing list.

    This is the high-leverage path: one file covers every federal, state,
    and legislative contest statewide. Column names vary by state and
    year, so we let the model map them rather than hardcoding.
    """
    import pandas as pd

    path = Path(args.csv)
    df = pd.read_excel(path) if path.suffix in (".xlsx", ".xls") else pd.read_csv(path)
    print(f"Loaded {len(df)} rows, columns: {list(df.columns)}")

    client = anthropic.Anthropic()
    sample = df.head(30).to_csv(index=False)
    resp = client.messages.create(
        model=CAREFUL_MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content":
            f"Map these candidate-filing CSV columns to our schema. Return ONLY JSON:\n"
            f'{{"office": "<col>", "candidate_name": "<col>", "party": "<col>", '
            f'"district": "<col or null>", "filing_order": "<col or null>", '
            f'"incumbent": "<col or null>"}}\n\n'
            f"Use null for anything with no clear match. Sample rows:\n\n{sample}"
        }],
    )
    raw = "".join(b.text for b in resp.content if b.type == "text").strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    mapping = json.loads(raw)
    print(f"Column mapping: {mapping}")
    if input("Accept this mapping? [y/N] ").strip().lower() != "y":
        sys.exit("Aborted. Edit the CSV headers and rerun.")

    contests = {}
    for _, row in df.iterrows():
        office = str(row[mapping["office"]]).strip()
        district = (str(row[mapping["district"]]).strip()
                    if mapping.get("district") else None)
        party = (str(row[mapping["party"]]).strip()
                 if mapping.get("party") else None)
        key = (office, district, party)
        if key not in contests:
            contests[key] = {
                "contest_type": "office",
                "office_name": office,
                "measure_title": None,
                "measure_summary": None,
                "district_name": district,
                "party": party,
                "vote_for": 1,
                "sort_order": len(contests),
                "candidates": [],
            }
        c = contests[key]
        c["candidates"].append({
            "name": str(row[mapping["candidate_name"]]).strip(),
            "party": party,
            "is_incumbent": (bool(row[mapping["incumbent"]])
                             if mapping.get("incumbent") else False),
            "sort_order": len(c["candidates"]),
        })

    staged = {
        "meta": {
            "state": args.state,
            "authority_key": None,
            "party": None,
            "election_date": args.election_date,
            "source_url": args.source_url,
            "source_file": path.name,
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "extraction_models": [CAREFUL_MODEL],
            "review_flags": [
                "SOS filing lists are alphabetical, NOT ballot order. "
                "sort_order here is filing order and must be corrected against "
                "a county sample ballot before display."
            ],
            "verified_by": None,
            "verified_at": None,
        },
        "contests": list(contests.values()),
    }

    out = Path(args.out or f"staging/{args.state.lower()}_statewide.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(staged, indent=2))
    print(f"\n→ {out}")
    print(f"  {len(contests)} contests, {len(df)} candidates")


def cmd_load(args):
    from supabase import create_client

    path = Path(args.file)
    data = json.loads(path.read_text())
    meta = data["meta"]

    if meta.get("review_flags"):
        print(f"⚠ {len(meta['review_flags'])} unresolved flag(s):")
        for f in meta["review_flags"]:
            print(f"   - {f}")
        if input("Load anyway? [y/N] ").strip().lower() != "y":
            sys.exit("Aborted.")

    print(f"\nYou are attesting that you compared this against:\n  "
          f"{meta['source_url']}\nand that every candidate name and "
          f"ballot ordering is correct.\n")
    if input(f'Type "verified" to continue: ').strip().lower() != "verified":
        sys.exit("Aborted.")

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

    election = sb.table("elections").select("id").eq(
        "election_date", meta["election_date"]).eq("state", meta["state"]).single().execute()
    election_id = election.data["id"]

    loaded = 0
    for c in data["contests"]:
        res = sb.table("ballot_contests").insert({
            "election_id": election_id,
            "state": meta["state"],
            "party": c.get("party") or meta.get("party"),
            "contest_type": c["contest_type"],
            "office_name": c.get("office_name"),
            "measure_title": c.get("measure_title"),
            "measure_summary": c.get("measure_summary"),
            "source_name": f"{meta['state']} official sample ballot",
            "source_url": meta["source_url"],
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "sort_order": c["sort_order"],
        }).execute()
        contest_id = res.data[0]["id"]

        if c.get("candidates"):
            sb.table("ballot_candidates").insert([{
                "contest_id": contest_id,
                "name": cand["name"],
                "party": cand.get("party"),
                "is_incumbent": cand.get("is_incumbent", False),
                "source_url": meta["source_url"],
                "sort_order": cand["sort_order"],
            } for cand in c["candidates"]]).execute()

        loaded += 1

    meta["verified_by"] = args.verified_by
    meta["verified_at"] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(data, indent=2))
    print(f"✓ Loaded {loaded} contests, verified by {args.verified_by}")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    pp = sub.add_parser("pdf", help="Extract from a sample ballot PDF")
    pp.add_argument("pdf")
    pp.add_argument("--state", required=True, choices=["MO", "KS"])
    pp.add_argument("--authority", required=True)
    pp.add_argument("--party")
    pp.add_argument("--source-url", required=True)
    pp.add_argument("--election-date", default="2026-08-04")
    pp.add_argument("--out")
    pp.add_argument("--double-check", action="store_true",
                    help="Run two models and flag disagreements")
    pp.set_defaults(func=cmd_pdf)

    cp = sub.add_parser("csv", help="Bulk import an SOS candidate filing list")
    cp.add_argument("csv")
    cp.add_argument("--state", required=True, choices=["MO", "KS"])
    cp.add_argument("--source-url", required=True)
    cp.add_argument("--election-date", default="2026-08-04")
    cp.add_argument("--out")
    cp.set_defaults(func=cmd_csv)

    lp = sub.add_parser("load", help="Load verified staging JSON to Supabase")
    lp.add_argument("file")
    lp.add_argument("--verified-by", required=True)
    lp.set_defaults(func=cmd_load)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
