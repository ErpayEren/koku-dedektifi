create table if not exists public.fragrance_molecule_evidence (
  id text primary key,
  fragrance_id uuid not null references public.fragrances(id) on delete cascade,
  fragrance_slug text not null,
  fragrance_name text not null,
  molecule_id uuid not null references public.molecules(id) on delete cascade,
  molecule_slug text not null,
  evidence_level text not null,
  evidence_label text not null,
  evidence_reason text not null default '',
  matched_notes text[] not null default '{}',
  note_roles text[] not null default '{}',
  is_iconic boolean not null default false,
  percentage integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fragrance_id, molecule_id)
);

create index if not exists fragrance_molecule_evidence_fragrance_idx
  on public.fragrance_molecule_evidence (fragrance_id);

create index if not exists fragrance_molecule_evidence_molecule_idx
  on public.fragrance_molecule_evidence (molecule_id);

create index if not exists fragrance_molecule_evidence_level_idx
  on public.fragrance_molecule_evidence (evidence_level);
