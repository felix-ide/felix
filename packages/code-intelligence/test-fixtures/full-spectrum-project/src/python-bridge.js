export async function fetchFocusMetadata(nodeId) {
  const response = await fetch(`/api/graph/${nodeId}`);
  if (!response.ok) {
    throw new Error(`Failed to load metadata for ${nodeId}`);
  }
  return response.json();
}
