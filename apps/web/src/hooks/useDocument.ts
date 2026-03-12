import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  GetDocumentResponse,
  SaveDocumentResponse,
  SaveDocumentRequest,
  ListDocumentsResponse,
} from "@starter/shared";

const API_BASE = "http://localhost:3001";

interface FetchDocumentResponse extends GetDocumentResponse {
  seq: number;
}

async function fetchDocument(id: string): Promise<FetchDocumentResponse> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`);
  if (!res.ok) throw new Error("Failed to fetch document");
  return res.json();
}

async function saveDocument(
  id: string,
  body: SaveDocumentRequest
): Promise<SaveDocumentResponse> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(errorBody?.error || `${res.status}: Failed to save document`);
  }
  return res.json();
}

async function fetchDocumentList(): Promise<ListDocumentsResponse> {
  const res = await fetch(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error("Failed to fetch document list");
  return res.json();
}

export function useDocument(documentId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => fetchDocument(documentId!),
    enabled: !!documentId,
  });

  const mutation = useMutation({
    mutationFn: (body: SaveDocumentRequest) => saveDocument(documentId!, body),
    onSuccess: (data) => {
      queryClient.setQueryData(["document", documentId], data);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  return {
    document: query.data?.document ?? null,
    rawResponse: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    save: mutation.mutate,
    saveAsync: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}

export function useDocumentList() {
  const query = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocumentList,
  });

  return {
    documents: query.data?.documents ?? [],
    isLoading: query.isLoading,
  };
}
