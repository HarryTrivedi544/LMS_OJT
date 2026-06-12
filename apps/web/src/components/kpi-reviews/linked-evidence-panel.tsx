import type { EvidenceLinkRef, LinkedEvidence } from "@lms/api-contracts";

type LinkedEvidencePanelProps = {
  linkedEvidence: LinkedEvidence;
  title?: string;
};

const sections: Array<{
  key: keyof LinkedEvidence;
  label: string;
}> = [
  { key: "dailyLogs", label: "Daily logs" },
  { key: "timesheets", label: "Timesheets" },
  { key: "taskBriefs", label: "Task briefs" },
  { key: "files", label: "Files" },
  { key: "calls", label: "Calls" },
  { key: "kpiReviews", label: "Monthly KPI reviews" },
  { key: "quarterlySummaries", label: "Quarterly summaries" },
];

const formatEntityType = (entityType: EvidenceLinkRef["entityType"]) =>
  entityType.replaceAll("_", " ");

const EvidenceList = ({ items, emptyLabel }: { items: EvidenceLinkRef[]; emptyLabel: string }) => {
  if (items.length === 0) {
    return <p className="row-meta">{emptyLabel}</p>;
  }

  return (
    <ul className="kpi-tag-list">
      {items.map((item) => (
        <li key={`${item.entityType}-${item.entityId}`}>
          <strong>{item.label}</strong>
          {item.status ? ` (${item.status.replaceAll("_", " ")})` : ""}
          {item.summary ? ` — ${item.summary}` : ""}
          {item.occurredAt ? (
            <span className="row-meta"> · {item.occurredAt.slice(0, 10)}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

export function LinkedEvidencePanel({
  linkedEvidence,
  title = "Linked supporting evidence",
}: LinkedEvidencePanelProps) {
  const totalCount = sections.reduce(
    (count, section) => count + linkedEvidence[section.key].length,
    0,
  );

  if (totalCount === 0) {
    return (
      <div className="kpi-summary-grid compact">
        <div>
          <p className="row-title small">{title}</p>
          <p className="row-meta">No linked system evidence found for this period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-form">
      <p className="row-title small">{title}</p>
      <p className="row-meta">
        Auto-linked from system records ({totalCount} item{totalCount === 1 ? "" : "s"}).
      </p>
      <div className="kpi-summary-grid compact">
        {sections.map((section) =>
          linkedEvidence[section.key].length > 0 ? (
            <div key={section.key}>
              <p className="row-title small">{section.label}</p>
              <EvidenceList
                emptyLabel={`No ${formatEntityType(section.key as EvidenceLinkRef["entityType"])} linked.`}
                items={linkedEvidence[section.key]}
              />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
