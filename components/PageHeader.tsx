export function PageHeader({
  title,
  description,
  actions,
  label
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="page-header">
      <div>
        {label ? <p className="section-label">{label}</p> : null}
        <h1 className={label ? "mt-2" : undefined}>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}
