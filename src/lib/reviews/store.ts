interface ApprovalRecord {
  value: boolean;
  updatedAt: string;
  source: "initial" | "manager";
}

declare global {
  var __flex_reviews_store: ApprovalsStore | undefined;
}

export class ApprovalsStore {
  #approvals = new Map<string, ApprovalRecord>();

  getApproval(id: string) {
    const record = this.#approvals.get(id);
    return record ? record.value : null;
  }

  ensureInitialValue(id: string, fallback: boolean | null) {
    if (this.#approvals.has(id)) return;
    if (fallback == null) return;
    this.#approvals.set(id, {
      value: fallback,
      updatedAt: new Date().toISOString(),
      source: "initial",
    });
  }

  setApproval(id: string, value: boolean) {
    this.#approvals.set(id, {
      value,
      updatedAt: new Date().toISOString(),
      source: "manager",
    });
  }

  snapshot() {
    return Array.from(this.#approvals.entries()).map(([id, record]) => ({
      id,
      ...record,
    }));
  }
}

export const approvalsStore: ApprovalsStore =
  globalThis.__flex_reviews_store ?? new ApprovalsStore();

if (!globalThis.__flex_reviews_store) {
  globalThis.__flex_reviews_store = approvalsStore;
}
