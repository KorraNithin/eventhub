import { useParams } from "react-router-dom";

export default function EventDetail() {
  const { id } = useParams();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Event Detail</h1>
      <p>Details for event <code>{id}</code> will appear here.</p>
    </main>
  );
}
