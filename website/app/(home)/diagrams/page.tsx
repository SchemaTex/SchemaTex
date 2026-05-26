import { redirect } from 'next/navigation';

// The diagram-type catalog was merged into the gallery as its "By diagram type"
// view. Keep this route as a permanent redirect so existing links resolve.
export default function DiagramsPage() {
  redirect('/gallery?view=type');
}
