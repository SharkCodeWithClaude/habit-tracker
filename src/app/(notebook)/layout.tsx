import { NotebookShell } from "../components/NotebookShell";
import "../notebook.css";

export default function NotebookLayout({ children }: { children: React.ReactNode }) {
  return <NotebookShell>{children}</NotebookShell>;
}
