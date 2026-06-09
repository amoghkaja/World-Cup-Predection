import { Icon } from "./Icon";

export function StatusPill({
  status,
  predicted,
}: {
  status: "open" | "live" | "done" | "locked";
  predicted?: boolean;
}) {
  if (status === "live")
    return (
      <span className="pill pill-live">
        <span className="dot-live" />
        LIVE
      </span>
    );
  if (status === "done")
    return (
      <span className="pill pill-done">
        <Icon name="check" size={12} sw={3} />
        Final
      </span>
    );
  if (status === "open")
    return predicted ? (
      <span className="pill pill-done">
        <Icon name="check" size={12} sw={3} />
        Predicted
      </span>
    ) : (
      <span className="pill pill-open">
        <Icon name="unlock" size={12} sw={2.4} />
        Open
      </span>
    );
  return (
    <span className="pill pill-locked">
      <Icon name="lock" size={12} sw={2.4} />
      Locked
    </span>
  );
}
