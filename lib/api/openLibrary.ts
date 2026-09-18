import type { NormalizedMedia } from './types';

const OL_BASE = 'https://openlibrary.org';
const COVERS_BASE = 'https://covers.openlibrary.org/b';

interface OpenLibraryDoc {
  key: string; // ex: "/works/OL45804W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  number_of_pages_median?: number;
}

/** Pesquisa livros no Open Library (sem necessidade de API key) */
export async function searchOpenLibrary(query: string): Promise<NormalizedMedia[]> {
  if (!query.trim()) return [];

  const res = await fetch(
    `${OL_BASE}/search.json?q=${encodeURIComponent(query)}&limit=15&fields=key,title,author_name,first_publish_year,cover_i,subject,number_of_pages_median`
  );
  if (!res.ok) throw new Error(`Open Library error: ${res.status}`);
  const data = await res.json();

  const docs: OpenLibraryDoc[] = data.docs ?? [];
  return docs.map(normalizeOpenLibraryItem);
}

function normalizeOpenLibraryItem(doc: OpenLibraryDoc): NormalizedMedia {
  return {
    externalId: doc.key.replace('/works/', ''),
    source: 'openlibrary',
    category: 'book',
    title: doc.title,
    synopsis: doc.author_name?.length ? `por ${doc.author_name.join(', ')}` : undefined,
    coverUrl: doc.cover_i ? `${COVERS_BASE}/id/${doc.cover_i}-M.jpg` : undefined,
    releaseYear: doc.first_publish_year,
    genres: doc.subject?.slice(0, 5) ?? [],
    totalPages: doc.number_of_pages_median,
    extra: { authors: doc.author_name ?? [] },
  };
}
