"use client";

import { useMemo, useState } from "react";

type MarkerType =
  | "commit"
  | "win"
  | "pm2"
  | "deploy"
  | "note"
  | "failure"
  | "infra"
  | "screenshot";

interface TimelineMarker {
  id: string;
  time: number;
  type: MarkerType;
  title: string;
  detail: string;
  meta: string;
}

interface TemporalCard {
  id: string;
  title: string;
  deck: string;
  span: [number, number];
  status: string;
  summary: string;
  markers: TimelineMarker[];
}

interface TemporalDeck {
  id: string;
  title: string;
  arc: string;
  markers: TimelineMarker[];
  cards: TemporalCard[];
}

const markerLabels: Record<MarkerType, string> = {
  commit: "Commit",
  win: "Win",
  pm2: "PM2",
  deploy: "Deploy",
  note: "Note",
  failure: "Lesson",
  infra: "Infra",
  screenshot: "Shot",
};

const decks: TemporalDeck[] = [
  {
    id: "ccc",
    title: "CCC Evolution",
    arc: "Command center becomes a temporal operating system.",
    markers: [
      {
        id: "ccc-start",
        time: 8,
        type: "note",
        title: "Continuity map starts",
        detail: "CCC begins as a command layer for operational memory.",
        meta: "foundation",
      },
      {
        id: "ccc-temporal",
        time: 76,
        type: "win",
        title: "Nested temporal cards discovered",
        detail: "Cards, decks, projects, and workspace timelines become the core product.",
        meta: "product identity",
      },
    ],
    cards: [
      {
        id: "ccc-shell",
        title: "Command Surface",
        deck: "CCC Evolution",
        span: [4, 84],
        status: "Live",
        summary: "Facility UI, project state, and continuity signals converge.",
        markers: [
          {
            id: "facility-v1",
            time: 14,
            type: "screenshot",
            title: "Facility view",
            detail: "First visual command center proves project state can be spatial.",
            meta: "screenshot",
          },
          {
            id: "agent-added",
            time: 42,
            type: "commit",
            title: "Agent layer added",
            detail: "Operators become visible actors inside the system.",
            meta: "8 files",
          },
          {
            id: "temporal-core",
            time: 76,
            type: "win",
            title: "Temporal core",
            detail: "The system shifts from dashboard to replayable builder history.",
            meta: "major win",
          },
        ],
      },
      {
        id: "archivist",
        title: "Archivist Loop",
        deck: "CCC Evolution",
        span: [18, 92],
        status: "Watching",
        summary: "Snapshots turn raw workspace changes into recoverable operational memory.",
        markers: [
          {
            id: "snapshots",
            time: 22,
            type: "infra",
            title: "Snapshots wired",
            detail: "Local changes can be captured as continuity entries.",
            meta: "substrate",
          },
          {
            id: "failed-build",
            time: 55,
            type: "failure",
            title: "Build drift found",
            detail: "A mismatch in runtime state reveals why replay needs environment markers.",
            meta: "lesson",
          },
          {
            id: "watcher",
            time: 88,
            type: "pm2",
            title: "Watcher process",
            detail: "Background continuity collection becomes part of the timeline.",
            meta: "online",
          },
        ],
      },
    ],
  },
  {
    id: "dealbot",
    title: "DealBot Monetization",
    arc: "From useful scraper to resale intelligence workflow.",
    markers: [
      {
        id: "db-first",
        time: 20,
        type: "deploy",
        title: "First deploy",
        detail: "DealBot becomes reachable outside the local machine.",
        meta: "ship",
      },
      {
        id: "db-money",
        time: 62,
        type: "win",
        title: "Monetization attempt",
        detail: "Pipeline shifts toward resale decisions and saved deal flow.",
        meta: "$ path",
      },
    ],
    cards: [
      {
        id: "deal-feed",
        title: "Deal Feed",
        deck: "DealBot Monetization",
        span: [12, 76],
        status: "Iterating",
        summary: "Feeds, scoring, and comps become a faster deal triage loop.",
        markers: [
          {
            id: "reddit-feed",
            time: 24,
            type: "commit",
            title: "Reddit feed",
            detail: "Deals start arriving from live community sources.",
            meta: "adapter",
          },
          {
            id: "ebay-comps",
            time: 48,
            type: "infra",
            title: "eBay comps",
            detail: "Comparable sold prices become part of the operator view.",
            meta: "API",
          },
          {
            id: "mobile-redesign",
            time: 69,
            type: "screenshot",
            title: "Mobile swipe redesign",
            detail: "The product turns into a fast phone-first decision surface.",
            meta: "mobile",
          },
        ],
      },
      {
        id: "prod-runtime",
        title: "Runtime Reliability",
        deck: "DealBot Monetization",
        span: [30, 96],
        status: "Guarded",
        summary: "PM2, HTTPS, tunnels, and persistence harden the product loop.",
        markers: [
          {
            id: "pm2-added",
            time: 38,
            type: "pm2",
            title: "PM2 added",
            detail: "Process survival becomes visible operational state.",
            meta: "online",
          },
          {
            id: "tunnel-prod",
            time: 58,
            type: "deploy",
            title: "Production tunnel",
            detail: "External access and local persistence meet in one runtime story.",
            meta: "cloudflared",
          },
          {
            id: "reset",
            time: 82,
            type: "failure",
            title: "Project reset",
            detail: "Recovery steps become a timeline event instead of lost context.",
            meta: "recover",
          },
        ],
      },
    ],
  },
  {
    id: "growth",
    title: "Becoming an Engineer",
    arc: "Failures, tooling, and wins accumulate into identity.",
    markers: [
      {
        id: "start-builder",
        time: 5,
        type: "note",
        title: "Builder log begins",
        detail: "A personal operating record starts forming across projects.",
        meta: "identity",
      },
      {
        id: "major-win",
        time: 91,
        type: "win",
        title: "System thinking lands",
        detail: "The user can watch skill, taste, and operational judgment compound.",
        meta: "arc",
      },
    ],
    cards: [
      {
        id: "ai-systems",
        title: "AI Systems Research",
        deck: "Becoming an Engineer",
        span: [10, 93],
        status: "Compounding",
        summary: "Local agents, context, and tooling become a personal engineering stack.",
        markers: [
          {
            id: "openai-work",
            time: 28,
            type: "note",
            title: "Prompt architecture",
            detail: "Work shifts from one-off prompting to reusable systems.",
            meta: "research",
          },
          {
            id: "agent-added-growth",
            time: 52,
            type: "commit",
            title: "Agent workflow added",
            detail: "Coding assistance becomes part of the daily production loop.",
            meta: "agent",
          },
          {
            id: "lesson",
            time: 73,
            type: "failure",
            title: "Context loss lesson",
            detail: "The need for durable continuity becomes emotionally obvious.",
            meta: "lesson",
          },
        ],
      },
      {
        id: "liahona",
        title: "Liahona Direction",
        deck: "Becoming an Engineer",
        span: [34, 98],
        status: "Guiding",
        summary: "Interpretive routing becomes a compass for values and execution.",
        markers: [
          {
            id: "canon",
            time: 44,
            type: "note",
            title: "Canonical sources",
            detail: "Grounding rules turn guidance into a bounded system.",
            meta: "canon",
          },
          {
            id: "routing",
            time: 66,
            type: "infra",
            title: "Interpretive routing",
            detail: "The system learns which layer should answer a given moment.",
            meta: "routing",
          },
          {
            id: "direction-win",
            time: 90,
            type: "win",
            title: "Direction clarity",
            detail: "The product stack starts showing where to go next.",
            meta: "signal",
          },
        ],
      },
    ],
  },
];

const allCards = decks.flatMap((deck) => deck.cards);
const allMarkers = decks.flatMap((deck) => [
  ...deck.markers,
  ...deck.cards.flatMap((card) => card.markers),
]);

function findMarkerContext(markerId: string) {
  for (const deck of decks) {
    if (deck.markers.some((marker) => marker.id === markerId)) {
      return { scope: "Deck arc", owner: deck.title };
    }

    const card = deck.cards.find((item) =>
      item.markers.some((marker) => marker.id === markerId),
    );
    if (card) {
      return { scope: "Temporal card", owner: card.title };
    }
  }

  return { scope: "Workspace", owner: "Global history" };
}

function getActiveMarker(markers: TimelineMarker[], time: number) {
  return markers
    .filter((marker) => marker.time <= time)
    .sort((a, b) => b.time - a.time)[0];
}

function progressWithinSpan(time: number, [start, end]: [number, number]) {
  if (time <= start) return 0;
  if (time >= end) return 100;
  return ((time - start) / (end - start)) * 100;
}

function formatTime(time: number) {
  return `T+${String(time).padStart(2, "0")}`;
}

export function TemporalCardsMock() {
  const [globalTime, setGlobalTime] = useState(76);
  const [selectedMarkerId, setSelectedMarkerId] = useState("temporal-core");

  const selectedMarker = useMemo(
    () =>
      allMarkers.find((marker) => marker.id === selectedMarkerId) ??
      getActiveMarker(allMarkers, globalTime) ??
      allMarkers[0],
    [globalTime, selectedMarkerId],
  );
  const selectedContext = findMarkerContext(selectedMarker.id);

  const activeCards = allCards.filter(
    (card) => globalTime >= card.span[0] && globalTime <= card.span[1],
  ).length;

  return (
    <main className="temporal-shell">
      <section className="temporal-hero" aria-labelledby="temporal-title">
        <div>
          <p className="temporal-kicker">ThinkCore / CCC</p>
          <h1 id="temporal-title">Temporal operating system for builders</h1>
          <p className="temporal-subtitle">
            Scrub the workspace timeline. Cards, decks, commits, runtime state,
            notes, failures, screenshots, and wins move with time.
          </p>
        </div>
        <div className="temporal-now" aria-live="polite">
          <span>Workspace now / {formatTime(globalTime)}</span>
          <strong>{selectedMarker.title}</strong>
          <small>{selectedContext.owner}</small>
        </div>
      </section>

      <section className="global-timeline" aria-label="Global timeline">
        <div className="timeline-header">
          <div>
            <span className="timeline-label">Global workspace timeline</span>
            <strong>Scrub history like a build replay</strong>
          </div>
          <div className="timeline-stats">
            <span>{formatTime(globalTime)}</span>
            <b>{activeCards} active cards</b>
          </div>
        </div>
        <div className="timeline-track-wrap">
          <div className="timeline-track">
            <div
              className="timeline-track__fill"
              style={{ width: `${globalTime}%` }}
              aria-hidden
            />
            <div
              className="timeline-track__now"
              style={{ left: `${globalTime}%` }}
              aria-hidden
            >
              <span>Now</span>
            </div>
            {allMarkers.map((marker) => (
              <button
                className="timeline-dot"
                data-type={marker.type}
                data-active={marker.time <= globalTime}
                key={marker.id}
                style={{ left: `${marker.time}%` }}
                type="button"
                title={marker.title}
                onClick={() => {
                  setGlobalTime(marker.time);
                  setSelectedMarkerId(marker.id);
                }}
              >
                <span>{markerLabels[marker.type]}</span>
              </button>
            ))}
          </div>
          <input
            aria-label="Scrub global workspace time"
            className="timeline-range"
            max="100"
            min="0"
            type="range"
            value={globalTime}
            onChange={(event) => setGlobalTime(Number(event.target.value))}
          />
        </div>
      </section>

      <section className="temporal-layout">
        <div className="deck-stack" aria-label="Temporal decks">
          {decks.map((deck) => {
            const deckMarker = getActiveMarker(deck.markers, globalTime);
            return (
              <article className="deck-card" key={deck.id}>
                <div className="deck-card__header">
                  <div>
                    <span>Deck</span>
                    <h2>{deck.title}</h2>
                  </div>
                  <span>{deck.cards.length} cards</span>
                </div>
                <p>{deck.arc}</p>
                {deckMarker ? (
                  <button
                    className="deck-snapshot"
                    type="button"
                    onClick={() => setSelectedMarkerId(deckMarker.id)}
                  >
                    <span>{markerLabels[deckMarker.type]}</span>
                    <strong>{deckMarker.title}</strong>
                  </button>
                ) : (
                  <div className="deck-snapshot deck-snapshot--empty">
                    Waiting for first deck marker
                  </div>
                )}

                <div className="card-grid">
                  {deck.cards.map((card) => {
                    const activeMarker = getActiveMarker(card.markers, globalTime);
                    const inSpan =
                      globalTime >= card.span[0] && globalTime <= card.span[1];
                    return (
                      <article
                        className="temporal-card"
                        data-live={inSpan}
                        key={card.id}
                      >
                        <div className="temporal-card__top">
                          <div>
                            <span>{card.deck}</span>
                            <h3>{card.title}</h3>
                          </div>
                          <b>{inSpan ? card.status : "Dormant"}</b>
                        </div>
                        <p>{card.summary}</p>
                        <div className="mini-timeline__label">
                          <span>Card timeline</span>
                          <b>
                            {formatTime(card.span[0])} - {formatTime(card.span[1])}
                          </b>
                        </div>
                        <div className="mini-timeline" aria-label={`${card.title} timeline`}>
                          <div
                            className="mini-timeline__fill"
                            style={{
                              width: `${progressWithinSpan(globalTime, card.span)}%`,
                            }}
                          />
                          {card.markers.map((marker) => (
                            <button
                              className="mini-marker"
                              data-type={marker.type}
                              data-active={marker.time <= globalTime}
                              key={marker.id}
                              style={{ left: `${marker.time}%` }}
                              type="button"
                              title={marker.title}
                              aria-label={`${markerLabels[marker.type]}: ${marker.title}`}
                              onClick={() => {
                                setGlobalTime(marker.time);
                                setSelectedMarkerId(marker.id);
                              }}
                            />
                          ))}
                        </div>
                        <div className="card-state">
                          {activeMarker ? (
                            <>
                              <span>{markerLabels[activeMarker.type]}</span>
                              <strong>{activeMarker.title}</strong>
                            </>
                          ) : (
                            <>
                              <span>State</span>
                              <strong>Not started yet</strong>
                            </>
                          )}
                        </div>
                        <div className="marker-strip" aria-label={`${card.title} markers`}>
                          {card.markers.map((marker) => (
                            <button
                              data-active={marker.time <= globalTime}
                              data-type={marker.type}
                              key={marker.id}
                              type="button"
                              onClick={() => {
                                setGlobalTime(marker.time);
                                setSelectedMarkerId(marker.id);
                              }}
                            >
                              {markerLabels[marker.type]}
                            </button>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="snapshot-panel" aria-label="Selected snapshot">
          <div className="snapshot-panel__header">
            <span>Selected operational snapshot</span>
            <strong>{selectedContext.scope}</strong>
          </div>
          <div className="snapshot-screen">
            <div className="snapshot-screen__bar">
              <span />
              <span />
              <span />
            </div>
            <div className="snapshot-screen__body">
              <span>{markerLabels[selectedMarker.type]}</span>
              <strong>{selectedMarker.title}</strong>
              <p>{selectedContext.owner} / {selectedMarker.meta}</p>
            </div>
          </div>
          <div className="snapshot-detail">
            <span>{formatTime(selectedMarker.time)}</span>
            <h2>{selectedMarker.title}</h2>
            <p>{selectedMarker.detail}</p>
          </div>
          <div className="snapshot-meta">
            <div>
              <span>Source</span>
              <strong>{selectedContext.owner}</strong>
            </div>
            <div>
              <span>Marker</span>
              <strong>{markerLabels[selectedMarker.type]}</strong>
            </div>
          </div>
          <div className="snapshot-feed-title">
            <span>Recent replay feed</span>
            <b>{formatTime(globalTime)}</b>
          </div>
          <div className="snapshot-feed">
            {allMarkers
              .filter((marker) => marker.time <= globalTime)
              .sort((a, b) => b.time - a.time)
              .slice(0, 6)
              .map((marker) => (
                <button
                  data-selected={marker.id === selectedMarker.id}
                  key={marker.id}
                  type="button"
                  onClick={() => setSelectedMarkerId(marker.id)}
                >
                  <span>{formatTime(marker.time)}</span>
                  <strong>{marker.title}</strong>
                  <em>{markerLabels[marker.type]}</em>
                </button>
              ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
