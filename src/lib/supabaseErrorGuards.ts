interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

const RELATION_MISSING_CODE = "PGRST205";

export const isMissingRelationError = (error: PostgrestErrorLike | null | undefined, relation: string) => {
  if (!error) return false;

  if (error.code === RELATION_MISSING_CODE) {
    return true;
  }

  const combined = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return combined.includes(relation.toLowerCase());
};
