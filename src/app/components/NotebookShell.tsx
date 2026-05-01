import { ViewNav } from "./ViewNav";
import "../notebook.css";

interface NotebookShellProps {
  children: React.ReactNode;
}

export function NotebookShell({ children }: NotebookShellProps) {
  const year = new Date().getFullYear();

  return (
    <div className="notebook-page">
      <div className="notebook">
        <ViewNav year={year} />
        {children}
      </div>
    </div>
  );
}
